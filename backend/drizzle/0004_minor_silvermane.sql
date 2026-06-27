ALTER TABLE "issue_media" DROP CONSTRAINT "issue_media_issue_id_issues_id_fk";
--> statement-breakpoint
ALTER TABLE "issue_embeddings" DROP CONSTRAINT "issue_embeddings_issue_id_issues_id_fk";
--> statement-breakpoint
ALTER TABLE "issue_status_history" DROP CONSTRAINT "issue_status_history_issue_id_issues_id_fk";
--> statement-breakpoint
ALTER TABLE "issue_validations" DROP CONSTRAINT "issue_validations_issue_id_issues_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "issue_media" ADD CONSTRAINT "issue_media_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "issue_embeddings" ADD CONSTRAINT "issue_embeddings_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "issue_status_history" ADD CONSTRAINT "issue_status_history_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "issue_validations" ADD CONSTRAINT "issue_validations_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
