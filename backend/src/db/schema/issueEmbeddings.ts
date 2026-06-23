import { pgTable, uuid, vector } from "drizzle-orm/pg-core";
import { issues } from "./issues.js";

export const issueEmbeddings = pgTable("issue_embeddings", {
  issueId: uuid("issue_id")
    .primaryKey()
    .references(() => issues.id),
  embedding: vector("embedding", { dimensions: 768 }).notNull(),
});
