import { pgTable, uuid, text, integer, timestamp, doublePrecision, real } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { wards } from "./wards.js";
import { categories } from "./categories.js";
import { issueStatusEnum } from "./enums.js";
export const issues = pgTable("issues", {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").references(() => users.id).notNull(),
    wardId: uuid("ward_id").references(() => wards.id), // Nullable — derived later via reverse-geocoding
    categoryId: uuid("category_id").references(() => categories.id), // Nullable
    title: text("title"), // Nullable — populated later by AI categorization
    description: text("description").notNull(),
    severity: integer("severity"), // Nullable (1-5) — populated later by AI categorization
    aiConfidence: real("ai_confidence"), // Nullable, filled by AI
    status: issueStatusEnum("status").notNull().default("reported"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    addressText: text("address_text"),
    slaDeadline: timestamp("sla_deadline"),
    assignedTo: uuid("assigned_to").references(() => users.id), // Nullable (assigned worker)
    duplicateOf: uuid("duplicate_of"), // Plain UUID column as requested
    upvoteCount: integer("upvote_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
