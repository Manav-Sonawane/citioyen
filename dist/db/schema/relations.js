import { relations } from "drizzle-orm";
import { wards } from "./wards.js";
import { users } from "./users.js";
import { categories } from "./categories.js";
import { issues } from "./issues.js";
import { issueMedia } from "./issueMedia.js";
import { issueEmbeddings } from "./issueEmbeddings.js";
import { issueStatusHistory } from "./issueStatusHistory.js";
import { issueValidations } from "./issueValidations.js";
export const wardsRelations = relations(wards, ({ many }) => ({
    users: many(users),
    issues: many(issues),
}));
export const usersRelations = relations(users, ({ one, many }) => ({
    ward: one(wards, {
        fields: [users.wardId],
        references: [wards.id],
    }),
    reportedIssues: many(issues, { relationName: "reporter" }),
    assignedIssues: many(issues, { relationName: "assignee" }),
    validations: many(issueValidations),
    statusHistory: many(issueStatusHistory),
}));
export const categoriesRelations = relations(categories, ({ many }) => ({
    issues: many(issues),
}));
export const issuesRelations = relations(issues, ({ one, many }) => ({
    reporter: one(users, {
        fields: [issues.reporterId],
        references: [users.id],
        relationName: "reporter",
    }),
    ward: one(wards, {
        fields: [issues.wardId],
        references: [wards.id],
    }),
    category: one(categories, {
        fields: [issues.categoryId],
        references: [categories.id],
    }),
    assignee: one(users, {
        fields: [issues.assignedTo],
        references: [users.id],
        relationName: "assignee",
    }),
    media: many(issueMedia),
    embedding: one(issueEmbeddings, {
        fields: [issues.id],
        references: [issueEmbeddings.issueId],
    }),
    statusHistory: many(issueStatusHistory),
    validations: many(issueValidations),
}));
export const issueMediaRelations = relations(issueMedia, ({ one }) => ({
    issue: one(issues, {
        fields: [issueMedia.issueId],
        references: [issues.id],
    }),
}));
export const issueEmbeddingsRelations = relations(issueEmbeddings, ({ one }) => ({
    issue: one(issues, {
        fields: [issueEmbeddings.issueId],
        references: [issues.id],
    }),
}));
export const issueStatusHistoryRelations = relations(issueStatusHistory, ({ one }) => ({
    issue: one(issues, {
        fields: [issueStatusHistory.issueId],
        references: [issues.id],
    }),
    changer: one(users, {
        fields: [issueStatusHistory.changedBy],
        references: [users.id],
    }),
}));
export const issueValidationsRelations = relations(issueValidations, ({ one }) => ({
    issue: one(issues, {
        fields: [issueValidations.issueId],
        references: [issues.id],
    }),
    user: one(users, {
        fields: [issueValidations.userId],
        references: [users.id],
    }),
}));
