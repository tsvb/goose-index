CREATE TABLE "album_tracks" (
	"album_id" text NOT NULL,
	"track_num" integer NOT NULL,
	"title" text NOT NULL,
	"song_id" integer,
	"duration_sec" integer,
	CONSTRAINT "album_tracks_album_id_track_num_pk" PRIMARY KEY("album_id","track_num")
);
--> statement-breakpoint
CREATE TABLE "albums" (
	"album_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text,
	"release_date" date,
	"num_tracks" integer DEFAULT 0 NOT NULL,
	"url" text,
	"kind" text DEFAULT 'studio' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "album_tracks" ADD CONSTRAINT "album_tracks_album_id_albums_album_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("album_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_tracks" ADD CONSTRAINT "album_tracks_song_id_songs_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("song_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "album_tracks_song_idx" ON "album_tracks" USING btree ("song_id");