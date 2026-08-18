CREATE TABLE "nugs_containers" (
	"container_id" integer PRIMARY KEY NOT NULL,
	"performance_date" date NOT NULL,
	"venue_name" text,
	"venue_city" text,
	"venue_state" text,
	"has_video" boolean DEFAULT false NOT NULL,
	"fetched_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "nugs_container_id" integer;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "nugs_has_video" boolean;--> statement-breakpoint
CREATE INDEX "nugs_containers_date_idx" ON "nugs_containers" USING btree ("performance_date");