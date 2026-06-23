import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { issues } from "./issues.js";
import { mediaTypeEnum, mediaStageEnum } from "./enums.js";

export const issueMedia = pgTable("issue_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id").references(() => issues.id).notNull(),
  url: text("url").notNull(),
  mediaType: mediaTypeEnum("media_type").notNull(),
  stage: mediaStageEnum("stage").notNull(), // 'report' or 'resolution'
});
