import { Router } from "express";
import { db } from "../db/db.js";
import { users } from "../db/schema/index.js";
import { authRouter } from "./auth.js";
import { issuesRouter } from "./issues.js";

export const router = Router();

// Mount auth routes
router.use("/auth", authRouter);

// Mount issues routes
router.use("/issues", issuesRouter);

router.get("/health", (req, res) => {
  res.json({ status: "OK", expressVersion: 5 });
});

// Express 5 async handler: no manual try/catch or helper wrapper needed.
// Rejections automatically propagate to next(err).
router.get("/users", async (req, res) => {
  const allUsers = await db.select().from(users);
  res.json({ users: allUsers });
});

router.get("/error-test", async (req, res) => {
  throw new Error("This is a test async error that Express 5 catches automatically!");
});
