import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { issues } from "./issues.js";
import { users } from "./users.js";
import { validationVoteTypeEnum } from "./enums.js";

export const issueValidations = pgTable(
  "issue_validations",
  {
    issueId: uuid("issue_id")
      .references(() => issues.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    voteType: validationVoteTypeEnum("vote_type").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.issueId, table.userId] }),
  })
);
