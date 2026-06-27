import { db } from "./db.js";
import { users, categories, wards, ward_aliases } from "./schema/index.js";
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
    { name: "pothole",               defaultSlaHours: 168, department: "Roads & Infrastructure" },
    { name: "streetlight",           defaultSlaHours: 72,  department: "Electrical" },
    { name: "water_leak",            defaultSlaHours: 48,  department: "Water Supply" },
    { name: "garbage",               defaultSlaHours: 24,  department: "Sanitation" },
    { name: "drainage",              defaultSlaHours: 72,  department: "Sanitation" },
    { name: "illegal_construction",  defaultSlaHours: 336, department: "Urban Planning" },
    { name: "stray_animal",          defaultSlaHours: 48,  department: "Animal Welfare" },
    { name: "tree_fall",             defaultSlaHours: 24,  department: "Parks & Environment" },
    { name: "other",                 defaultSlaHours: 120, department: "General Administration" },
  ]).onConflictDoNothing();

  // Seed wards
  await db.insert(wards).values([
    { name: "Colaba", city: "Mumbai" },
    { name: "Masjid Bunder", city: "Mumbai" },
    { name: "Bhuleshwar", city: "Mumbai" },
    { name: "Grant Road", city: "Mumbai" },
    { name: "Byculla", city: "Mumbai" },
    { name: "Matunga", city: "Mumbai" },
    { name: "Parel", city: "Mumbai" },
    { name: "Dadar", city: "Mumbai" },
    { name: "Worli", city: "Mumbai" },
    { name: "Bandra East", city: "Mumbai" },
    { name: "Bandra West", city: "Mumbai" },
    { name: "Andheri East", city: "Mumbai" },
    { name: "Andheri West", city: "Mumbai" },
    { name: "Kurla", city: "Mumbai" },
    { name: "Mankhurd", city: "Mumbai" },
    { name: "Chembur", city: "Mumbai" },
    { name: "Ghatkopar", city: "Mumbai" },
    { name: "Malad", city: "Mumbai" },
    { name: "Goregaon", city: "Mumbai" },
    { name: "Dahisar", city: "Mumbai" },
    { name: "Borivali", city: "Mumbai" },
    { name: "Kandivali", city: "Mumbai" },
    { name: "Bhandup", city: "Mumbai" },
    { name: "Mulund", city: "Mumbai" },
  ]).onConflictDoNothing();

  console.log("Seeding ward aliases...");
  const allWards = await db.select().from(wards);
  const wardMap: Record<string, string> = {};
  for (const w of allWards) {
    wardMap[w.name] = w.id;
  }

  const aliasData = [
    { name: "Colaba", aliases: ["Colaba", "Churchgate", "Fort", "Navy Nagar", "Marine Drive"] },
    { name: "Masjid Bunder", aliases: ["Masjid Bunder", "Dongri", "Umerkhadi", "Mandvi"] },
    { name: "Bhuleshwar", aliases: ["Bhuleshwar", "Marine Lines", "Kalbadevi", "Chira Bazaar"] },
    { name: "Grant Road", aliases: ["Grant Road", "Malabar Hill", "Breach Candy", "Tardeo", "Girgaon"] },
    { name: "Byculla", aliases: ["Byculla", "Agripada", "Mazgaon", "Mumbai Central"] },
    { name: "Matunga", aliases: ["Matunga", "Sion", "Wadala"] },
    { name: "Parel", aliases: ["Parel", "Sewri", "Lalbaug", "Naigaon"] },
    { name: "Dadar", aliases: ["Dadar", "Mahim", "Dharavi", "Shivaji Park"] },
    { name: "Worli", aliases: ["Worli", "Prabhadevi", "Lower Parel", "Mahalaxmi"] },
    { name: "Bandra East", aliases: ["Bandra East", "Khar East", "Santacruz East"] },
    { name: "Bandra West", aliases: ["Bandra West", "Khar West", "Santacruz West"] },
    { name: "Andheri East", aliases: ["Andheri East", "Jogeshwari East", "Vile Parle East"] },
    { name: "Andheri West", aliases: ["Andheri West", "Jogeshwari West", "Vile Parle West"] },
    { name: "Kurla", aliases: ["Kurla", "Chandivali", "Sakinaka"] },
    { name: "Mankhurd", aliases: ["Mankhurd", "Anushakti Nagar", "Deonar", "Cheetah Camp", "Shivaji Nagar"] },
    { name: "Chembur", aliases: ["Chembur", "Tilak Nagar"] },
    { name: "Ghatkopar", aliases: ["Ghatkopar", "Vidyavihar"] },
    { name: "Malad", aliases: ["Malad", "Marve", "Malwani"] },
    { name: "Goregaon", aliases: ["Goregaon", "Aarey Colony"] },
    { name: "Dahisar", aliases: ["Dahisar"] },
    { name: "Borivali", aliases: ["Borivali", "Gorai"] },
    { name: "Kandivali", aliases: ["Kandivali", "Charkop"] },
    { name: "Bhandup", aliases: ["Bhandup", "Powai", "Vikhroli", "Kanjurmarg"] },
    { name: "Mulund", aliases: ["Mulund"] },
  ];

  const aliasesToInsert = [];
  for (const group of aliasData) {
    const wId = wardMap[group.name];
    if (wId) {
      for (const area of group.aliases) {
        aliasesToInsert.push({ wardId: wId, areaName: area });
      }
    }
  }

  if (aliasesToInsert.length > 0) {
    await db.insert(ward_aliases).values(aliasesToInsert).onConflictDoNothing();
  }

  console.log("Seeding completed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
