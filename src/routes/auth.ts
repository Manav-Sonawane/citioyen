import { Router } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/db.js";
import { users } from "../db/schema/index.js";
import { hashPassword, comparePassword, jwtSign } from "../lib/index.js";
import { requireAuth } from "../middleware/index.js";
import type { AuthenticatedRequest } from "../types/index.js";

export const authRouter = Router();

// --- Zod schemas ---

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

// --- Cookie helper ---

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 24 * 60 * 60 * 1000, // 1 day
  path: "/",
};

// --- POST /signup ---

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { name, email, password } = parsed.data;

  // Case-insensitive duplicate check
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);

  const [newUser] = await db
    .insert(users)
    .values({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "citizen", // Always hardcoded — never read from request body
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    });

  const token = jwtSign({ userId: newUser.id, role: newUser.role });
  res.cookie("token", token, COOKIE_OPTIONS);

  res.status(201).json({ user: newUser, token });
});

// --- POST /login ---

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwtSign({ userId: user.id, role: user.role });
  res.cookie("token", token, COOKIE_OPTIONS);

  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

// --- POST /logout ---

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ message: "Logged out" });
});

// --- GET /me ---

authRouter.get("/me", requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      wardId: users.wardId,
      reputationScore: users.reputationScore,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, authReq.userId!))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user });
});
