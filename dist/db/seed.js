import { db } from "./db.js";
import { users, categories, wards } from "./schema/index.js";
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
    // Seed categories
    await db.insert(categories).values([
        { name: "pothole", defaultSlaHours: 168, department: "Roads & Infrastructure" },
        { name: "streetlight", defaultSlaHours: 72, department: "Electrical" },
        { name: "water_leak", defaultSlaHours: 48, department: "Water Supply" },
        { name: "garbage", defaultSlaHours: 24, department: "Sanitation" },
        { name: "drainage", defaultSlaHours: 72, department: "Sanitation" },
        { name: "illegal_construction", defaultSlaHours: 336, department: "Urban Planning" },
        { name: "stray_animal", defaultSlaHours: 48, department: "Animal Welfare" },
        { name: "tree_fall", defaultSlaHours: 24, department: "Parks & Environment" },
        { name: "other", defaultSlaHours: 120, department: "General Administration" },
    ]).onConflictDoNothing();
    // Seed wards
    await db.insert(wards).values([
        { name: "Andheri West", city: "Mumbai" },
        { name: "Bandra East", city: "Mumbai" },
        { name: "Powai", city: "Mumbai" },
    ]).onConflictDoNothing();
    console.log("Seeding completed!");
    process.exit(0);
}
main().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
