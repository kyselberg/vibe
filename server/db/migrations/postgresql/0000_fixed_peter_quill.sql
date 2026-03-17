CREATE TABLE "background_scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"config_json" text NOT NULL,
	"preview_key" text,
	"video_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"track_ids" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"track_ids" text DEFAULT '[]' NOT NULL,
	"current_track_id" text,
	"current_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"album" text,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"genre" text,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"cover_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"object_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata_json" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"active_scene_id" text,
	"volume" double precision DEFAULT 0.85 NOT NULL,
	"repeat_mode" text DEFAULT 'off' NOT NULL,
	"shuffle" boolean DEFAULT false NOT NULL,
	"last_queue" text DEFAULT '[]' NOT NULL,
	"last_track_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_object_key_idx" ON "tracks" USING btree ("object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "upload_jobs_object_key_idx" ON "upload_jobs" USING btree ("object_key");