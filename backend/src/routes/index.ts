import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { users } from "../db/schema/index.js";
import { authRouter } from "./auth.js";
import { issuesRouter } from "./issues.js";
import { requireAuth } from "../middleware/index.js";

export const router = Router();

// Mount auth routes
router.use("/auth", authRouter);

// Mount issues routes
router.use("/issues", issuesRouter);

router.get("/health", (req, res) => {
  res.json({ status: "OK", expressVersion: 5 });
});

router.get("/users", requireAuth, async (req, res) => {
  const role = req.query.role as string | undefined;
  const allUsers = await db.select().from(users).where(role ? eq(users.role, role as any) : undefined);
  res.json({ users: allUsers });
});

router.get("/error-test", async (req, res) => {
  throw new Error("This is a test async error that Express 5 catches automatically!");
});
