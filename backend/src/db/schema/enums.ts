import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["citizen", "worker", "admin"]);

export const issueStatusEnum = pgEnum("issue_status", [
  "reported",
  "verified",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
  "rejected",
]);

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

export const mediaStageEnum = pgEnum("media_stage", ["report", "resolution"]);

export const validationVoteTypeEnum = pgEnum("validation_vote_type", ["confirm", "dispute"]);
