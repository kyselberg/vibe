import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  album: text('album'),
  durationMs: integer('duration_ms').notNull().default(0),
  genre: text('genre'),
  objectKey: text('object_key').notNull(),
  mimeType: text('mime_type').notNull(),
  coverKey: text('cover_key'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  objectKeyIdx: uniqueIndex('tracks_object_key_idx').on(table.objectKey)
}))

export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  trackIds: text('track_ids').notNull().default('[]'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const queueSnapshots = sqliteTable('queue_snapshots', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  trackIds: text('track_ids').notNull().default('[]'),
  currentTrackId: text('current_track_id'),
  currentIndex: integer('current_index').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const backgroundScenes = sqliteTable('background_scenes', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  name: text('name').notNull(),
  configJson: text('config_json').notNull(),
  previewKey: text('preview_key'),
  videoKey: text('video_key'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const userSettings = sqliteTable('user_settings', {
  id: text('id').primaryKey(),
  activeSceneId: text('active_scene_id'),
  volume: real('volume').notNull().default(0.85),
  repeatMode: text('repeat_mode').notNull().default('off'),
  shuffle: integer('shuffle', { mode: 'boolean' }).notNull().default(false),
  lastQueue: text('last_queue').notNull().default('[]'),
  lastTrackId: text('last_track_id'),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const uploadJobs = sqliteTable('upload_jobs', {
  id: text('id').primaryKey(),
  objectKey: text('object_key').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  status: text('status').notNull().default('pending'),
  metadataJson: text('metadata_json').notNull().default('{}'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  objectKeyIdx: uniqueIndex('upload_jobs_object_key_idx').on(table.objectKey)
}))
