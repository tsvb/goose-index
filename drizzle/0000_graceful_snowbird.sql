CREATE TABLE "artists" (
	"artist_id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performances" (
	"unique_id" text PRIMARY KEY NOT NULL,
	"show_id" integer NOT NULL,
	"song_id" integer NOT NULL,
	"set_type" text,
	"set_number" text,
	"position" integer,
	"track_time" text,
	"transition" text,
	"transition_id" integer,
	"is_jamchart" boolean DEFAULT false NOT NULL,
	"jamchart_notes" text,
	"is_reprise" boolean DEFAULT false NOT NULL,
	"is_jam" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"footnote" text
);
--> statement-breakpoint
CREATE TABLE "shows" (
	"show_id" integer PRIMARY KEY NOT NULL,
	"show_date" date NOT NULL,
	"artist_id" integer NOT NULL,
	"venue_id" integer,
	"tour_id" integer,
	"title" text,
	"permalink" text,
	"show_order" integer,
	"notes" text,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"song_id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"is_original" boolean DEFAULT false NOT NULL,
	"original_artist" text
);
--> statement-breakpoint
CREATE TABLE "tours" (
	"tour_id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"year" integer
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"venue_id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"city" text,
	"state" text,
	"country" text,
	"zip" text,
	"capacity" integer
);
--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_show_id_shows_show_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("show_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_song_id_songs_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("song_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_artist_id_artists_artist_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("artist_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_venue_id_venues_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("venue_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_tour_id_tours_tour_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("tour_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "perf_show_idx" ON "performances" USING btree ("show_id");--> statement-breakpoint
CREATE INDEX "perf_song_idx" ON "performances" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX "shows_date_idx" ON "shows" USING btree ("show_date");--> statement-breakpoint
CREATE INDEX "shows_venue_idx" ON "shows" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "shows_tour_idx" ON "shows" USING btree ("tour_id");