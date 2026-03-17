CREATE TABLE IF NOT EXISTS "tracks" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "artist" text NOT NULL,
  "album" text,
  "duration_ms" integer DEFAULT 0 NOT NULL,
  "genre" text,
  "object_key" text NOT NULL,
  "mime_type" text NOT NULL,
  "cover_key" text,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tracks_object_key_idx" ON "tracks" ("object_key");

CREATE TABLE IF NOT EXISTS "playlists" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "track_ids" text DEFAULT '[]' NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "queue_snapshots" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "track_ids" text DEFAULT '[]' NOT NULL,
  "current_track_id" text,
  "current_index" integer DEFAULT 0 NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "background_scenes" (
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "name" text NOT NULL,
  "config_json" text NOT NULL,
  "preview_key" text,
  "video_key" text,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "active_scene_id" text,
  "volume" real DEFAULT 0.85 NOT NULL,
  "repeat_mode" text DEFAULT 'off' NOT NULL,
  "shuffle" integer DEFAULT 0 NOT NULL,
  "last_queue" text DEFAULT '[]' NOT NULL,
  "last_track_id" text,
  "updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "upload_jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "object_key" text NOT NULL,
  "filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "size" integer NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "metadata_json" text DEFAULT '{}' NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "upload_jobs_object_key_idx" ON "upload_jobs" ("object_key");
