import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../db/db.js";
import {
  issues,
  issueMedia,
  issueStatusHistory,
  users,
  issueValidations,
} from "../db/schema/index.js";
import { requireAuth } from "../middleware/index.js";
import { uploadBuffer } from "../services/storage.js";
import type { AuthenticatedRequest } from "../types/index.js";

export const issuesRouter = Router();

// --- Multer config (in-memory, max 5 files, 25 MB each) ---

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

// --- Zod schemas ---

const createIssueSchema = z.object({
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be at most 2000 characters"),
  title: z.string().optional(),
  lat: z.coerce.number({ invalid_type_error: "lat must be a number" }),
  lng: z.coerce.number({ invalid_type_error: "lng must be a number" }),
  addressText: z.string().optional(),
});

// --- Helper: determine media type from MIME ---

function mediaTypeFromMime(mime: string): "image" | "video" {
  return mime.startsWith("video/") ? "video" : "image";
}

// --- POST / — Create an issue with optional media ---

issuesRouter.post(
  "/",
  requireAuth,
  upload.array("media", 5),
  async (req, res) => {
    const authReq = req as AuthenticatedRequest;

    // Validate body
    const parsed = createIssueSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    const { description, title, lat, lng, addressText } = parsed.data;

    // Create the issue
    const [issue] = await db
      .insert(issues)
      .values({
        reporterId: authReq.userId!,
        description,
        title: title ?? null,
        lat,
        lng,
        addressText: addressText ?? null,
        status: "reported",
      })
      .returning();

    // Record initial status history
    await db.insert(issueStatusHistory).values({
      issueId: issue.id,
      fromStatus: null,
      toStatus: "reported",
      changedBy: authReq.userId!,
    });

    // Upload media files and insert rows
    const files = (req.files as Express.Multer.File[]) || [];
    const mediaRows = [];

    for (const file of files) {
      const url = await uploadBuffer(
        file.buffer,
        file.originalname,
        file.mimetype,
        `issues/${issue.id}`
      );

      const [row] = await db
        .insert(issueMedia)
        .values({
          issueId: issue.id,
          url,
          mediaType: mediaTypeFromMime(file.mimetype),
          stage: "report",
        })
        .returning();

      mediaRows.push(row);
    }

    // Fetch reporter info for the response
    const [reporter] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, authReq.userId!))
      .limit(1);

    res.status(201).json({
      issue: {
        ...issue,
        media: mediaRows,
        reporter,
      },
    });
  }
);

// --- GET / — List issues (newest first, optional ?status= filter) ---

issuesRouter.get("/", async (req, res) => {
  const statusFilter = req.query.status as string | undefined;

  const result = await db.query.issues.findMany({
    orderBy: [desc(issues.createdAt)],
    limit: 200,
    ...(statusFilter ? { where: eq(issues.status, statusFilter as any) } : {}),
    with: {
      media: true,
      reporter: {
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
        },
      },
      category: true,
    },
  });

  res.json({ issues: result });
});

// --- GET /:id — Full issue detail with ordered status history ---

issuesRouter.get("/:id", async (req, res) => {
  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, req.params.id),
    with: {
      media: true,
      reporter: {
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
        },
      },
      category: true,
      statusHistory: {
        orderBy: [desc(issueStatusHistory.createdAt)],
      },
    },
  });

  if (!issue) {
    res.status(404).json({ error: "Issue not found" });
    return;
  }

  res.json({ issue });
});

// --- POST /:id/validate — Confirm or dispute an issue ---

const validateIssueSchema = z.object({
  voteType: z.enum(["confirm", "dispute"]),
});

issuesRouter.post("/:id/validate", requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const parsed = validateIssueSchema.safeParse(req.body);
  
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { voteType } = parsed.data;
  const issueId = req.params.id as string;
  const userId = authReq.userId!;

  try {
    const newUpvoteCount = await db.transaction(async (tx) => {
      // 1. Check existing vote
      const [existing] = await tx
        .select()
        .from(issueValidations)
        .where(
          and(
            eq(issueValidations.issueId, issueId),
            eq(issueValidations.userId, userId)
          )
        );

      let delta = 0;
      if (!existing) {
        if (voteType === "confirm") delta = 1;
      } else {
        if (existing.voteType === "confirm" && voteType === "dispute") delta = -1;
        else if (existing.voteType === "dispute" && voteType === "confirm") delta = 1;
      }

      // 2. Upsert vote
      await tx
        .insert(issueValidations)
        .values({ issueId, userId, voteType })
        .onConflictDoUpdate({
          target: [issueValidations.issueId, issueValidations.userId],
          set: { voteType },
        });

      // 3. Apply delta if needed
      if (delta !== 0) {
        const [updated] = await tx
          .update(issues)
          .set({ upvoteCount: sql`${issues.upvoteCount} + ${delta}` })
          .where(eq(issues.id, issueId))
          .returning({ upvoteCount: issues.upvoteCount });
        return updated.upvoteCount;
      }

      // 4. If no delta, return current count
      const [issue] = await tx
        .select({ upvoteCount: issues.upvoteCount })
        .from(issues)
        .where(eq(issues.id, issueId));
      return issue.upvoteCount;
    });

    res.json({ upvoteCount: newUpvoteCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PATCH /:id/status — Update issue status ---

const updateStatusSchema = z.object({
  newStatus: z.enum([
    "reported",
    "verified",
    "assigned",
    "in_progress",
    "resolved",
    "closed",
    "rejected",
  ]),
  note: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
});

issuesRouter.patch("/:id/status", requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const parsed = updateStatusSchema.safeParse(req.body);
  
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { newStatus, note, assignedTo } = parsed.data;
  const issueId = req.params.id as string;
  const userId = authReq.userId!;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true },
    });

    if (!user || !["admin", "super_admin", "field_agent"].includes(user.role)) {
      res.status(403).json({ error: "Insufficient permissions to change issue status" });
      return;
    }

    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
      columns: { status: true, categoryId: true },
      with: {
        category: {
          columns: { defaultSlaHours: true },
        },
      },
    });

    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }

    const oldStatus = issue.status;
    
    // Validate transition
    const validTransitions: Record<string, string[]> = {
      reported: ["verified", "rejected"],
      verified: ["assigned", "rejected"],
      assigned: ["in_progress", "rejected"],
      in_progress: ["resolved", "rejected"],
      resolved: ["closed"],
      closed: [],
      rejected: [],
    };

    if (oldStatus !== newStatus && !validTransitions[oldStatus]?.includes(newStatus)) {
      res.status(400).json({ error: `Invalid transition from ${oldStatus} to ${newStatus}` });
      return;
    }

    await db.transaction(async (tx) => {
      const updateData: any = { status: newStatus as any, updatedAt: new Date() };
      
      // Set SLA Deadline if transitioning to verified and we have a category
      if (oldStatus !== newStatus && newStatus === "verified" && issue.category) {
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + issue.category.defaultSlaHours);
        updateData.slaDeadline = deadline;
      }

      if (assignedTo !== undefined) {
        updateData.assignedTo = assignedTo;
      }
      
      await tx
        .update(issues)
        .set(updateData)
        .where(eq(issues.id, issueId));

      if (oldStatus !== newStatus || note) {
        await tx.insert(issueStatusHistory).values({
          issueId,
          fromStatus: oldStatus,
          toStatus: newStatus as any,
          changedBy: userId,
          note: note || null,
        });
      }
    });

    res.json({ success: true, newStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
