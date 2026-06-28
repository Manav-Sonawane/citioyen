import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/db.js";
import { users, issues, issueValidations } from "../db/schema/index.js";
import { authRouter } from "./auth.js";
import { issuesRouter } from "./issues.js";
import { statsRouter } from "./stats.js";
import { chatRouter } from "./chat.js";
import { requireAuth } from "../middleware/index.js";
import type { AuthenticatedRequest } from "../types/index.js";

export const router = Router();

// Mount auth routes
router.use("/auth", authRouter);

// Mount issues routes
router.use("/issues", issuesRouter);

// Mount stats routes
router.use("/stats", statsRouter);

// Mount chat routes
router.use("/chat", chatRouter);

router.get("/health", (req, res) => {
  res.json({ status: "OK", expressVersion: 5 });
});

router.get("/users/leaderboard", async (req, res) => {
  const topUsers = await db
    .select({
      id: users.id,
      name: users.name,
      reputationScore: users.reputationScore,
    })
    .from(users)
    .orderBy(desc(users.reputationScore))
    .limit(20);
  res.json({ leaderboard: topUsers });
});

// --- GET /users/me/issues — Profile data: reported, assigned, validated issues ---

router.get("/users/me/issues", requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;

  // Fetch user profile
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      reputationScore: users.reputationScore,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Run all three queries in parallel
  const [reported, assigned, validatedRows] = await Promise.all([
    // 1. Issues reported by this user
    db
      .select({
        id: issues.id,
        title: issues.title,
        status: issues.status,
        createdAt: issues.createdAt,
      })
      .from(issues)
      .where(eq(issues.reporterId, userId))
      .orderBy(desc(issues.createdAt)),

    // 2. Issues assigned to this user (only meaningful for field agents)
    user.role === "field_agent"
      ? db
          .select({
            id: issues.id,
            title: issues.title,
            status: issues.status,
            createdAt: issues.createdAt,
          })
          .from(issues)
          .where(eq(issues.assignedTo, userId))
          .orderBy(desc(issues.createdAt))
      : Promise.resolve([]),

    // 3. Issues this user has validated, with their vote type
    db
      .select({
        id: issues.id,
        title: issues.title,
        status: issues.status,
        createdAt: issues.createdAt,
        voteType: issueValidations.voteType,
      })
      .from(issueValidations)
      .innerJoin(issues, eq(issueValidations.issueId, issues.id))
      .where(eq(issueValidations.userId, userId))
      .orderBy(desc(issues.createdAt)),
  ]);

  res.json({ user, reported, assigned, validated: validatedRows });
});

router.get("/users", requireAuth, async (req, res) => {
  const role = req.query.role as string | undefined;
  const allUsers = await db.select().from(users).where(role ? eq(users.role, role as any) : undefined);
  res.json({ users: allUsers });
});

router.get("/error-test", async (req, res) => {
  throw new Error("This is a test async error that Express 5 catches automatically!");
});
