CREATE TABLE "live_sync_state" (
	"id" integer PRIMARY KEY NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_date" text,
	"last_summary" text
);
