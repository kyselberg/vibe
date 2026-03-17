import { asc, desc, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { db } from '@nuxthub/db'
import type { BackgroundScene, LibraryBootstrap, PlaybackUrl, Playlist, QueueSnapshot, Track, UserSettings } from '~~/shared/types/vibe'
import { defaultBackgroundScenes } from '~~/shared/backgrounds/catalog'
import { getMissingBackgroundScenes, normalizeBackgroundScene, sortBackgroundScenes } from '~~/shared/backgrounds/registry'
import { backgroundScenes, playlists, queueSnapshots, tracks, uploadJobs, userSettings } from '~~/server/db/schema'
import { createPresignedDownloadUrl, hasR2SigningConfig } from './r2'

const SETTINGS_ID = 'primary'
const LAST_QUEUE_ID = 'last-session'

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function now() {
  return new Date()
}

function toISOString(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString()
  if (date instanceof Date) return date.toISOString()
  return date
}

export function mapTrack(row: typeof tracks.$inferSelect): Track {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    durationMs: row.durationMs,
    genre: row.genre,
    objectKey: row.objectKey,
    mimeType: row.mimeType,
    coverKey: row.coverKey,
    createdAt: toISOString(row.createdAt)
  }
}

export function mapPlaylist(row: typeof playlists.$inferSelect): Playlist {
  return {
    id: row.id,
    name: row.name,
    trackIds: parseJson<string[]>(row.trackIds, []),
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt)
  }
}

export function mapSettings(row: typeof userSettings.$inferSelect | undefined): UserSettings {
  return {
    activeSceneId: row?.activeSceneId || defaultBackgroundScenes[0]?.id || null,
    volume: row?.volume ?? 0.85,
    repeatMode: (row?.repeatMode as UserSettings['repeatMode']) || 'off',
    shuffle: Boolean(row?.shuffle),
    lastQueue: parseJson<string[]>(row?.lastQueue, []),
    lastTrackId: row?.lastTrackId || null
  }
}

export function mapQueue(row: typeof queueSnapshots.$inferSelect | undefined): QueueSnapshot {
  return {
    trackIds: parseJson<string[]>(row?.trackIds, []),
    currentIndex: row?.currentIndex ?? 0,
    currentTrackId: row?.currentTrackId || null
  }
}

async function resolveScenePlayback(
  scene: typeof backgroundScenes.$inferSelect
): Promise<PlaybackUrl> {
  const config = useRuntimeConfig()
  const parsedConfig = parseJson<BackgroundScene['config']>(scene.configJson, {})

  if (parsedConfig.localUrl) {
    return {
      url: parsedConfig.localUrl,
      expiresAt: null
    }
  }

  if (scene.videoKey && hasR2SigningConfig(config)) {
    return createPresignedDownloadUrl(config, scene.videoKey)
  }

  return {
    url: '',
    expiresAt: null
  }
}

export async function mapBackgroundScene(row: typeof backgroundScenes.$inferSelect): Promise<BackgroundScene> {
  const playback = row.kind === 'video' ? await resolveScenePlayback(row) : null
  return normalizeBackgroundScene({
    id: row.id,
    kind: row.kind as BackgroundScene['kind'],
    name: row.name,
    config: parseJson<BackgroundScene['config']>(row.configJson, {}),
    previewKey: row.previewKey,
    videoKey: row.videoKey,
    playbackUrl: playback?.url || null
  })
}

export async function ensureSeedData() {
  const existingScenes = await db.select({
    id: backgroundScenes.id
  }).from(backgroundScenes)

  if (existingScenes.length === 0) {
    await db.insert(backgroundScenes).values(defaultBackgroundScenes.map((scene: BackgroundScene) => ({
      id: scene.id,
      kind: scene.kind,
      name: scene.name,
      configJson: JSON.stringify(scene.config),
      previewKey: scene.previewKey ?? null,
      videoKey: scene.videoKey ?? null,
      createdAt: now()
    })))
  } else {
    const missingScenes = getMissingBackgroundScenes(existingScenes.map(scene => scene.id))
    if (missingScenes.length) {
      await db.insert(backgroundScenes).values(missingScenes.map((scene: BackgroundScene) => ({
        id: scene.id,
        kind: scene.kind,
        name: scene.name,
        configJson: JSON.stringify(scene.config),
        previewKey: scene.previewKey ?? null,
        videoKey: scene.videoKey ?? null,
        createdAt: now()
      })))
    }
  }

  const settingsRow = await db.select().from(userSettings).where(eq(userSettings.id, SETTINGS_ID)).limit(1)
  if (settingsRow.length === 0) {
    await db.insert(userSettings).values({
      id: SETTINGS_ID,
      activeSceneId: defaultBackgroundScenes[0]?.id ?? null,
      volume: 0.85,
      repeatMode: 'off',
      shuffle: false,
      lastQueue: '[]',
      lastTrackId: null,
      updatedAt: now()
    })
  }

  const queueRow = await db.select().from(queueSnapshots).where(eq(queueSnapshots.id, LAST_QUEUE_ID)).limit(1)
  if (queueRow.length === 0) {
    await db.insert(queueSnapshots).values({
      id: LAST_QUEUE_ID,
      name: 'Last Session',
      trackIds: '[]',
      currentTrackId: null,
      currentIndex: 0,
      createdAt: now(),
      updatedAt: now()
    })
  }
}

export async function getTracks() {
  const rows = await db.select().from(tracks).orderBy(desc(tracks.createdAt))
  return rows.map(mapTrack)
}

export async function getPlaylists() {
  const rows = await db.select().from(playlists).orderBy(asc(playlists.name))
  return rows.map(mapPlaylist)
}

export async function getBackgrounds() {
  const rows = await db.select().from(backgroundScenes)
  const scenes = await Promise.all(rows.map(mapBackgroundScene))
  return sortBackgroundScenes(scenes)
}

export async function getSettingsBundle() {
  const [settingsRow] = await db.select().from(userSettings).where(eq(userSettings.id, SETTINGS_ID)).limit(1)
  const [queueRow] = await db.select().from(queueSnapshots).where(eq(queueSnapshots.id, LAST_QUEUE_ID)).limit(1)

  return {
    settings: mapSettings(settingsRow),
    queue: mapQueue(queueRow)
  }
}

export async function getBootstrap(): Promise<LibraryBootstrap> {
  await ensureSeedData()

  const [allTracks, allPlaylists, allBackgrounds, settingsBundle] = await Promise.all([
    getTracks(),
    getPlaylists(),
    getBackgrounds(),
    getSettingsBundle()
  ])

  return {
    tracks: allTracks,
    playlists: allPlaylists,
    backgrounds: allBackgrounds,
    settings: settingsBundle.settings,
    queue: settingsBundle.queue
  }
}

export async function findTrackById(id: string) {
  const [track] = await db.select().from(tracks).where(eq(tracks.id, id)).limit(1)
  return track
}

export async function findUploadJob(id: string) {
  const [job] = await db.select().from(uploadJobs).where(eq(uploadJobs.id, id)).limit(1)
  return job
}

export async function resolveTrackPlayback(trackId: string): Promise<PlaybackUrl> {
  const track = await findTrackById(trackId)
  if (!track) {
    throw createError({ statusCode: 404, statusMessage: 'Track not found' })
  }

  const config = useRuntimeConfig()
  if (!hasR2SigningConfig(config)) {
    throw createError({ statusCode: 503, statusMessage: 'R2 storage is not configured' })
  }

  return createPresignedDownloadUrl(config, track.objectKey)
}

export async function resolveBackgroundPlayback(sceneId: string): Promise<PlaybackUrl> {
  const [scene] = await db.select().from(backgroundScenes).where(eq(backgroundScenes.id, sceneId)).limit(1)
  if (!scene || scene.kind !== 'video') {
    throw createError({ statusCode: 404, statusMessage: 'Video scene not found' })
  }

  return resolveScenePlayback(scene)
}
