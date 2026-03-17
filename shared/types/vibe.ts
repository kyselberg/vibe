export type RepeatMode = 'off' | 'one' | 'all'
export type BackgroundKind = 'shader' | 'video'

export interface Track {
  id: string
  title: string
  artist: string
  album?: string | null
  durationMs: number
  genre?: string | null
  objectKey: string
  mimeType: string
  coverKey?: string | null
  createdAt: string
}

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: string
  updatedAt: string
}

export interface BackgroundSceneConfig {
  shader?: string
  palette?: string[]
  intensity?: number
  grain?: number
  glow?: number
  localUrl?: string
  overlay?: string
}

export interface BackgroundScene {
  id: string
  kind: BackgroundKind
  name: string
  config: BackgroundSceneConfig
  previewKey?: string | null
  videoKey?: string | null
  playbackUrl?: string | null
}

export interface UserSettings {
  activeSceneId: string | null
  volume: number
  repeatMode: RepeatMode
  shuffle: boolean
  lastQueue: string[]
  lastTrackId?: string | null
}

export interface QueueSnapshot {
  trackIds: string[]
  currentIndex: number
  currentTrackId: string | null
}

export interface UploadTicket {
  uploadId: string
  objectKey: string
  uploadUrl: string
  method: 'PUT'
  headers: Record<string, string>
  strategy: 'presigned' | 'proxy'
}

export interface PlaybackUrl {
  url: string
  expiresAt: string | null
}

export interface LibraryBootstrap {
  tracks: Track[]
  playlists: Playlist[]
  backgrounds: BackgroundScene[]
  settings: UserSettings
  queue: QueueSnapshot
}
