CREATE TABLE IF NOT EXISTS "ward_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ward_id" uuid NOT NULL,
	"area_name" text NOT NULL,
	CONSTRAINT "ward_aliases_area_name_unique" UNIQUE("area_name")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ward_aliases" ADD CONSTRAINT "ward_aliases_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
