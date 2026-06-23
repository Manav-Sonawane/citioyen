import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { issues } from "./issues.js";
import { users } from "./users.js";
import { issueStatusEnum } from "./enums.js";

export const issueStatusHistory = pgTable("issue_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id").references(() => issues.id).notNull(),
  fromStatus: issueStatusEnum("from_status"), // Nullable (e.g. initial status has no 'from')
  toStatus: issueStatusEnum("to_status").notNull(),
  changedBy: uuid("changed_by").references(() => users.id), // Nullable (could be system/AI)
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type IssueStatusHistory = typeof issueStatusHistory.$inferSelect;
export type NewIssueStatusHistory = typeof issueStatusHistory.$inferInsert;
