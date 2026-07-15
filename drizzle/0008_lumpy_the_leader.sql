CREATE TABLE "forum_read_markers" (
	"user_id" integer NOT NULL,
	"thread_id" integer NOT NULL,
	"last_read_post_id" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_read_markers_user_id_thread_id_pk" PRIMARY KEY("user_id","thread_id")
);
--> statement-breakpoint
ALTER TABLE "forum_read_markers" ADD CONSTRAINT "forum_read_markers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_read_markers" ADD CONSTRAINT "forum_read_markers_thread_id_forum_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_threads"("id") ON DELETE no action ON UPDATE no action;