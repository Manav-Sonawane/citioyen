import { db } from "./db.js";
import { users } from "./schema/index.js";
import { hashPassword } from "../lib/index.js";

async function main() {
  console.log("Seeding database...");
  const hashedPassword = await hashPassword("admin123");
  
  // Basic insertion of a mock admin user
  await db.insert(users).values({
    email: "admin@example.com",
    passwordHash: hashedPassword,
    name: "Admin User",
  }).onConflictDoNothing();
  
  console.log("Seeding completed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
