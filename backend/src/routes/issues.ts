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
  categories,
  issueEmbeddings,
} from "../db/schema/index.js";
import { requireAuth } from "../middleware/index.js";
import { uploadBuffer } from "../services/storage.js";
import { categorizeIssue, embedText, verifyResolution } from "../services/gemini.js";
import { reverseGeocodeAndMatchWard } from "../services/geocoding.js";
import { checkAndEscalateSlaBreaches } from "../services/escalation.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { jwtVerify } from "../lib/index.js";

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
  wardId: z.string().uuid().optional(),
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

    const { description, title, lat, lng, addressText, wardId } = parsed.data;

    let finalWardId = wardId || null;
    if (!finalWardId) {
      finalWardId = await reverseGeocodeAndMatchWard(lat, lng);
    }

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
        wardId: finalWardId,
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

    // Increment reporter's reputation by 10
    await db.update(users)
      .set({ reputationScore: sql`${users.reputationScore} + 10` })
      .where(eq(users.id, authReq.userId!));

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

    // Categorize Issue using AI
    try {
      const firstImage = files.find((f) => f.mimetype.startsWith("image/"));
      const aiResult = await categorizeIssue(
        description,
        firstImage?.buffer,
        firstImage?.mimetype
      );

      const [categoryRecord] = await db
        .select()
        .from(categories)
        .where(eq(categories.name, aiResult.category))
        .limit(1);

      const updateData: any = {
        severity: aiResult.severity,
        aiConfidence: aiResult.confidence,
      };

      if (categoryRecord) {
        updateData.categoryId = categoryRecord.id;
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + categoryRecord.defaultSlaHours);
        updateData.slaDeadline = deadline;
      }

      const [updatedIssue] = await db
        .update(issues)
        .set(updateData)
        .where(eq(issues.id, issue.id))
        .returning();

      Object.assign(issue, updatedIssue);
    } catch (error) {
      console.error("AI Categorization failed, continuing...", error);
    }

    // Embed Description for Duplicate Detection
    let possibleDuplicates: any[] = [];
    try {
      const vector = await embedText(description);
      if (vector) {
        await db.insert(issueEmbeddings).values({
          issueId: issue.id,
          embedding: vector,
        });

        const vectorStr = JSON.stringify(vector);
        const distanceSq = sql<number>`${issueEmbeddings.embedding} <-> ${vectorStr}`;
        
        possibleDuplicates = await db
          .select({
            id: issues.id,
            description: issues.description,
            distance: distanceSq,
          })
          .from(issueEmbeddings)
          .innerJoin(issues, eq(issueEmbeddings.issueId, issues.id))
          .where(sql`${distanceSq} < 0.3 AND ${issues.id} != ${issue.id}`)
          .orderBy(distanceSq)
          .limit(3);
      }
    } catch (error) {
      console.error("Embedding generation/similarity search failed:", error);
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
      possibleDuplicates,
    });
  }
);

// --- GET / — List issues (newest first, optional ?status= filter) ---

issuesRouter.get("/", async (req, res) => {
  // Hackathon-scale inline check for SLA breaches
  checkAndEscalateSlaBreaches().catch(console.error);

  const statusFilter = req.query.status as string | undefined;
  const assignedToFilter = req.query.assignedTo as string | undefined;

  let assignedToWhere: any = undefined;
  if (assignedToFilter === "me") {
    const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ error: "Authentication required for ?assignedTo=me" });
      return;
    }
    try {
      const payload = jwtVerify(token);
      assignedToWhere = eq(issues.assignedTo, payload.userId);
    } catch {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
  } else if (assignedToFilter) {
    assignedToWhere = eq(issues.assignedTo, assignedToFilter);
  }

  const filters = [];
  if (statusFilter) filters.push(eq(issues.status, statusFilter as any));
  if (assignedToWhere) filters.push(assignedToWhere);

  const result = await db.query.issues.findMany({
    orderBy: [desc(issues.createdAt)],
    limit: 200,
    ...(filters.length > 0 ? { where: and(...filters) } : {}),
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
      statusHistory: true,
    },
  });

  const enhancedIssues = await Promise.all(
    result.map(async (issue) => {
      let possibleDuplicates: any[] = [];
      try {
        const [embeddingRow] = await db
          .select({ embedding: issueEmbeddings.embedding })
          .from(issueEmbeddings)
          .where(eq(issueEmbeddings.issueId, issue.id));

        if (embeddingRow?.embedding) {
          const vectorStr = JSON.stringify(embeddingRow.embedding);
          const distanceSq = sql<number>`${issueEmbeddings.embedding} <-> ${vectorStr}`;

          possibleDuplicates = await db
            .select({
              id: issues.id,
              description: issues.description,
              distance: distanceSq,
            })
            .from(issueEmbeddings)
            .innerJoin(issues, eq(issueEmbeddings.issueId, issues.id))
            .where(sql`${distanceSq} < 0.3 AND ${issues.id} != ${issue.id}`)
            .orderBy(distanceSq)
            .limit(3);
        }
      } catch (err) {
        console.error("Failed to compute duplicates for issue:", issue.id, err);
      }

      return {
        ...issue,
        possibleDuplicates,
        possibleDuplicateCount: possibleDuplicates.length,
      };
    })
  );

  res.json({ issues: enhancedIssues });
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
      let firstVote = false;
      if (!existing) {
        if (voteType === "confirm") delta = 1;
        firstVote = true;
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

      if (firstVote) {
        await tx.update(users)
          .set({ reputationScore: sql`${users.reputationScore} + 2` })
          .where(eq(users.id, userId));
      }

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

// --- POST /:id/resolve — AI-verified resolution ---

issuesRouter.post("/:id/resolve", requireAuth, upload.single("afterPhoto"), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const issueId = req.params.id as string;
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: "Missing 'afterPhoto' file" });
    return;
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, authReq.userId!),
      columns: { role: true },
    });

    if (!user || !["admin", "super_admin", "field_agent"].includes(user.role)) {
      res.status(403).json({ error: "Insufficient permissions to resolve issue" });
      return;
    }

    const currentIssue = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
      columns: { status: true },
    });

    if (!currentIssue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }

    const beforeMedia = await db.query.issueMedia.findFirst({
      where: and(eq(issueMedia.issueId, issueId), eq(issueMedia.stage, "report")),
    });

    let verificationResult = { looksResolved: false, confidence: 0, reasoning: "No before photo found to compare against" };

    if (beforeMedia && beforeMedia.url) {
      const beforeRes = await fetch(beforeMedia.url);
      if (beforeRes.ok) {
        const beforeBuffer = Buffer.from(await beforeRes.arrayBuffer());
        const beforeMime = beforeRes.headers.get("content-type") || "image/jpeg";
        verificationResult = await verifyResolution(beforeBuffer, beforeMime, file.buffer, file.mimetype);
      }
    }

    const afterUrl = await uploadBuffer(file.buffer, file.originalname, file.mimetype, "resolutions");
    
    await db.insert(issueMedia).values({
      issueId,
      url: afterUrl,
      mediaType: mediaTypeFromMime(file.mimetype),
      stage: "resolution"
    });

    const isVerified = verificationResult.looksResolved && verificationResult.confidence >= 0.6;

    if (isVerified) {
      const [updatedIssue] = await db.update(issues)
        .set({ status: "resolved", updatedAt: new Date() })
        .where(eq(issues.id, issueId))
        .returning();

      await db.insert(issueStatusHistory).values({
        issueId,
        fromStatus: currentIssue.status as any,
        toStatus: "resolved",
        changedBy: authReq.userId!,
        note: `Resolution verified by AI: ${verificationResult.reasoning}`
      });

      res.json({ success: true, issue: updatedIssue, verification: verificationResult });
    } else {
      await db.insert(issueStatusHistory).values({
        issueId,
        fromStatus: currentIssue.status as any,
        toStatus: currentIssue.status as any,
        changedBy: authReq.userId!,
        note: `AI could not confirm resolution (Confidence: ${Math.round(verificationResult.confidence * 100)}%): ${verificationResult.reasoning}`
      });

      const [updatedIssue] = await db.select().from(issues).where(eq(issues.id, issueId));
      res.json({ success: false, issue: updatedIssue, verification: verificationResult });
    }
  } catch (err: any) {
    console.error("Resolve error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- POST /:id/override — Admin manual override to resolved ---

issuesRouter.post("/:id/override", requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const issueId = req.params.id as string;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, authReq.userId!),
      columns: { role: true, name: true },
    });

    if (!user || !["admin", "super_admin"].includes(user.role)) {
      res.status(403).json({ error: "Only admins can override issue resolution" });
      return;
    }

    const currentIssue = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
      columns: { status: true },
    });

    if (!currentIssue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }

    const [updatedIssue] = await db.update(issues)
      .set({ status: "resolved", updatedAt: new Date() })
      .where(eq(issues.id, issueId))
      .returning();

    const recentHistory = await db.query.issueStatusHistory.findFirst({
      where: eq(issueStatusHistory.issueId, issueId),
      orderBy: [desc(issueStatusHistory.createdAt)],
    });

    let overrideNote = `ADMIN_OVERRIDE: Admin ${user.name} manually confirmed resolution.`;
    if (recentHistory?.note?.startsWith("AI could not confirm resolution")) {
      const match = recentHistory.note.match(/AI could not confirm resolution \(Confidence: (.*?)\): (.*)/);
      if (match) {
        overrideNote = `ADMIN_OVERRIDE: AI flagged as not resolved (confidence: ${match[1]}, reasoning: '${match[2]}'). Admin ${user.name} manually confirmed resolution.`;
      }
    }

    await db.insert(issueStatusHistory).values({
      issueId,
      fromStatus: currentIssue.status as any,
      toStatus: "resolved",
      changedBy: authReq.userId!,
      note: overrideNote
    });

    res.json({ success: true, issue: updatedIssue });
  } catch (err: any) {
    console.error("Override error:", err);
    res.status(500).json({ error: err.message });
  }
});
