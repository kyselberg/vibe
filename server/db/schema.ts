import { sql } from 'drizzle-orm'
import { boolean, doublePrecision, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const tracks = pgTable('tracks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  album: text('album'),
  durationMs: integer('duration_ms').notNull().default(0),
  genre: text('genre'),
  objectKey: text('object_key').notNull(),
  mimeType: text('mime_type').notNull(),
  coverKey: text('cover_key'),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  objectKeyIdx: uniqueIndex('tracks_object_key_idx').on(table.objectKey)
}))

export const playlists = pgTable('playlists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  trackIds: text('track_ids').notNull().default('[]'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const queueSnapshots = pgTable('queue_snapshots', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  trackIds: text('track_ids').notNull().default('[]'),
  currentTrackId: text('current_track_id'),
  currentIndex: integer('current_index').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const backgroundScenes = pgTable('background_scenes', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  name: text('name').notNull(),
  configJson: text('config_json').notNull(),
  previewKey: text('preview_key'),
  videoKey: text('video_key'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const userSettings = pgTable('user_settings', {
  id: text('id').primaryKey(),
  activeSceneId: text('active_scene_id'),
  volume: doublePrecision('volume').notNull().default(0.85),
  repeatMode: text('repeat_mode').notNull().default('off'),
  shuffle: boolean('shuffle').notNull().default(false),
  lastQueue: text('last_queue').notNull().default('[]'),
  lastTrackId: text('last_track_id'),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const uploadJobs = pgTable('upload_jobs', {
  id: text('id').primaryKey(),
  objectKey: text('object_key').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  status: text('status').notNull().default('pending'),
  metadataJson: text('metadata_json').notNull().default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  objectKeyIdx: uniqueIndex('upload_jobs_object_key_idx').on(table.objectKey)
}))
