import { parseBlob } from 'music-metadata-browser'
import type { BackgroundScene, LibraryBootstrap, PlaybackUrl, Playlist, QueueSnapshot, RepeatMode, Track, UploadTicket, UserSettings } from '~~/shared/types/vibe'

interface UploadStatus {
  filename: string
  status: 'queued' | 'uploading' | 'finishing' | 'done' | 'error'
  message?: string
}

function defaultSettings(): UserSettings {
  return {
    activeSceneId: null,
    volume: 0.85,
    repeatMode: 'off',
    shuffle: false,
    lastQueue: [],
    lastTrackId: null
  }
}

function defaultQueue(): QueueSnapshot {
  return {
    trackIds: [],
    currentIndex: 0,
    currentTrackId: null
  }
}

function normalizeIndex(index: number, length: number) {
  if (!length) {
    return 0
  }

  return Math.min(Math.max(index, 0), length - 1)
}

export const useVibeStore = defineStore('vibe', () => {
  const tracks = ref<Track[]>([])
  const playlists = ref<Playlist[]>([])
  const backgrounds = ref<BackgroundScene[]>([])
  const settings = ref<UserSettings>(defaultSettings())
  const queueSnapshot = ref<QueueSnapshot>(defaultQueue())
  const currentTrackUrl = ref('')
  const currentTrackUrlExpiresAt = ref<string | null>(null)
  const audioElement = shallowRef<HTMLAudioElement | null>(null)
  const isPlaying = ref(false)
  const bootstrapping = ref(false)
  const libraryLoaded = ref(false)
  const searchQuery = ref('')
  const audioLevel = ref(0)
  const uploadStatuses = ref<UploadStatus[]>([])
  const lastError = ref('')

  const trackMap = computed<Map<string, Track>>(() => new Map(tracks.value.map((track: Track) => [track.id, track])))
  const currentTrackId = computed<string | null>({
    get: () => queueSnapshot.value.currentTrackId,
    set: (value: string | null) => {
      queueSnapshot.value.currentTrackId = value
    }
  })
  const queue = computed<string[]>({
    get: () => queueSnapshot.value.trackIds,
    set: (value: string[]) => {
      queueSnapshot.value.trackIds = value
    }
  })
  const currentIndex = computed<number>({
    get: () => queueSnapshot.value.currentIndex,
    set: (value: number) => {
      queueSnapshot.value.currentIndex = value
    }
  })

  const currentTrack = computed<Track | null>(() => {
    if (!currentTrackId.value) {
      return null
    }

    return trackMap.value.get(currentTrackId.value) ?? null
  })

  const activeScene = computed<BackgroundScene | null>(() => {
    if (settings.value.activeSceneId) {
      const current = backgrounds.value.find((scene: BackgroundScene) => scene.id === settings.value.activeSceneId)
      if (current) {
        return current
      }
    }

    return backgrounds.value[0] ?? null
  })

  const filteredTracks = computed<Track[]>(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) {
      return tracks.value
    }

    return tracks.value.filter((track: Track) => {
      const haystack = [track.title, track.artist, track.album, track.genre].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  })

  const persistPlayerState = useDebounceFn(async () => {
    if (!libraryLoaded.value) {
      return
    }

    try {
      await $fetch('/api/settings/player', {
        method: 'PATCH',
        body: {
          volume: settings.value.volume,
          repeatMode: settings.value.repeatMode,
          shuffle: settings.value.shuffle,
          lastQueue: queue.value,
          lastTrackId: currentTrackId.value,
          currentIndex: currentIndex.value
        }
      })
    } catch {
      // Keep UX optimistic and retry on the next interaction.
    }
  }, 250)

  function reset() {
    tracks.value = []
    playlists.value = []
    backgrounds.value = []
    settings.value = defaultSettings()
    queueSnapshot.value = defaultQueue()
    currentTrackUrl.value = ''
    currentTrackUrlExpiresAt.value = null
    isPlaying.value = false
    libraryLoaded.value = false
    searchQuery.value = ''
    audioLevel.value = 0
    uploadStatuses.value = []
    lastError.value = ''

    if (audioElement.value) {
      audioElement.value.pause()
      audioElement.value.removeAttribute('src')
      audioElement.value.load()
    }
  }

  function applyBootstrap(data: LibraryBootstrap) {
    tracks.value = data.tracks
    playlists.value = data.playlists
    backgrounds.value = data.backgrounds
    settings.value = {
      ...defaultSettings(),
      ...data.settings
    }

    const initialQueue = data.queue.trackIds.length ? data.queue.trackIds : data.settings.lastQueue
    queue.value = initialQueue
    currentIndex.value = normalizeIndex(data.queue.currentIndex, initialQueue.length)
    currentTrackId.value = data.queue.currentTrackId || data.settings.lastTrackId || initialQueue[currentIndex.value] || null

    if (currentTrackId.value && !initialQueue.includes(currentTrackId.value)) {
      queue.value = [currentTrackId.value, ...initialQueue]
      currentIndex.value = 0
    }

    currentTrackUrl.value = ''
    currentTrackUrlExpiresAt.value = null
    lastError.value = ''
  }

  async function bootstrap(force = false) {
    if (bootstrapping.value || (libraryLoaded.value && !force)) {
      return
    }

    bootstrapping.value = true
    try {
      const data = await $fetch<LibraryBootstrap>('/api/bootstrap')
      applyBootstrap(data)
      libraryLoaded.value = true
    } finally {
      bootstrapping.value = false
    }
  }

  function bindAudio(element: HTMLAudioElement | null) {
    audioElement.value = element

    if (!element) {
      return
    }

    element.crossOrigin = 'anonymous'
    element.volume = settings.value.volume

    if (currentTrackUrl.value && element.src !== currentTrackUrl.value) {
      element.src = currentTrackUrl.value
    }
  }

  function setAudioLevel(level: number) {
    audioLevel.value = level
  }

  async function swapAudioSource(url: string, options: { autoplay?: boolean, preserveTime?: number } = {}) {
    const audio = audioElement.value
    if (!audio) {
      currentTrackUrl.value = url
      return
    }

    currentTrackUrl.value = url
    const preserveTime = options.preserveTime ?? 0

    if (audio.src !== url) {
      await new Promise<void>((resolve) => {
        const finalize = () => {
          if (preserveTime > 0) {
            audio.currentTime = Math.max(0, preserveTime)
          }

          resolve()
        }

        audio.addEventListener('loadedmetadata', finalize, { once: true })
        audio.crossOrigin = 'anonymous'
        audio.src = url
        audio.load()
      })
    }

    if (options.autoplay !== false) {
      await audio.play().catch(() => undefined)
      isPlaying.value = !audio.paused
    }
  }

  async function ensureTrackUrl(trackId: string, force = false) {
    const expiresSoon = currentTrackUrlExpiresAt.value
      ? new Date(currentTrackUrlExpiresAt.value).getTime() - Date.now() < 60_000
      : true

    if (!force && currentTrackId.value === trackId && currentTrackUrl.value && !expiresSoon) {
      return currentTrackUrl.value
    }

    const playback = await $fetch<PlaybackUrl>(`/api/tracks/${trackId}/play-url`)
    currentTrackUrlExpiresAt.value = playback.expiresAt
    currentTrackUrl.value = playback.url
    return playback.url
  }

  function syncCurrentTrackWithQueue() {
    if (!queue.value.length) {
      currentTrackId.value = null
      currentIndex.value = 0
      return
    }

    if (currentTrackId.value && queue.value.includes(currentTrackId.value)) {
      currentIndex.value = queue.value.indexOf(currentTrackId.value)
      return
    }

    currentIndex.value = normalizeIndex(currentIndex.value, queue.value.length)
    currentTrackId.value = queue.value[currentIndex.value] || null
  }

  async function playTrack(trackId: string, index = queue.value.indexOf(trackId), autoplay = true) {
    if (!trackMap.value.has(trackId)) {
      return
    }

    if (!queue.value.includes(trackId)) {
      queue.value = [trackId, ...queue.value]
      index = 0
    }

    currentTrackId.value = trackId
    currentIndex.value = normalizeIndex(index, queue.value.length)
    const url = await ensureTrackUrl(trackId, true)
    await swapAudioSource(url, { autoplay })
    persistPlayerState()
  }

  async function togglePlayback() {
    const audio = audioElement.value
    if (!audio) {
      if (queue.value[0]) {
        await playTrack(queue.value[0], 0, true)
      }
      return
    }

    if (audio.paused) {
      if (!currentTrackId.value && queue.value[0]) {
        await playTrack(queue.value[0], 0, true)
        return
      }

      if (currentTrackId.value && !currentTrackUrl.value) {
        const url = await ensureTrackUrl(currentTrackId.value, true)
        await swapAudioSource(url, { autoplay: true })
        return
      }

      await audio.play().catch(() => undefined)
      isPlaying.value = !audio.paused
      return
    }

    audio.pause()
    isPlaying.value = false
  }

  function pause() {
    audioElement.value?.pause()
    isPlaying.value = false
  }

  async function next(manual = false) {
    if (!queue.value.length) {
      return
    }

    if (!manual && settings.value.repeatMode === 'one' && currentTrackId.value) {
      const url = await ensureTrackUrl(currentTrackId.value, true)
      await swapAudioSource(url, { autoplay: true })
      return
    }

    let targetIndex = currentIndex.value + 1

    if (settings.value.shuffle && queue.value.length > 1) {
      const candidateIndexes = queue.value
        .map((_: string, index: number) => index)
        .filter((index: number) => index !== currentIndex.value)

      targetIndex = candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)] ?? targetIndex
    }

    if (targetIndex >= queue.value.length) {
      if (settings.value.repeatMode === 'all') {
        targetIndex = 0
      } else {
        pause()
        return
      }
    }

    const targetTrackId = queue.value[targetIndex]
    if (targetTrackId) {
      await playTrack(targetTrackId, targetIndex, true)
    }
  }

  async function previous() {
    const audio = audioElement.value
    if (audio && audio.currentTime > 5) {
      audio.currentTime = 0
      return
    }

    if (!queue.value.length) {
      return
    }

    let targetIndex = currentIndex.value - 1
    if (targetIndex < 0) {
      targetIndex = settings.value.repeatMode === 'all' ? queue.value.length - 1 : 0
    }

    const targetTrackId = queue.value[targetIndex]
    if (targetTrackId) {
      await playTrack(targetTrackId, targetIndex, true)
    }
  }

  async function handleTrackEnded() {
    await next(false)
  }

  async function handleAudioError() {
    if (!currentTrackId.value) {
      return
    }

    const audio = audioElement.value
    const preserveTime = audio?.currentTime ?? 0
    const url = await ensureTrackUrl(currentTrackId.value, true)
    await swapAudioSource(url, { autoplay: true, preserveTime })
  }

  function setQueue(trackIds: string[], startIndex = 0, autoplay = false) {
    queue.value = trackIds.filter(trackId => trackMap.value.has(trackId))
    currentIndex.value = normalizeIndex(startIndex, queue.value.length)
    currentTrackId.value = queue.value[currentIndex.value] || null
    persistPlayerState()

    if (autoplay && currentTrackId.value) {
      return playTrack(currentTrackId.value, currentIndex.value, true)
    }

    return Promise.resolve()
  }

  function enqueue(trackId: string) {
    if (!trackMap.value.has(trackId)) {
      return
    }

    queue.value = [...queue.value, trackId]
    syncCurrentTrackWithQueue()
    persistPlayerState()
  }

  function removeFromQueue(trackId: string) {
    queue.value = queue.value.filter((id: string) => id !== trackId)
    syncCurrentTrackWithQueue()
    persistPlayerState()
  }

  function setSearchQuery(value: string) {
    searchQuery.value = value
  }

  function setVolume(value: number) {
    settings.value.volume = value
    if (audioElement.value) {
      audioElement.value.volume = value
    }

    persistPlayerState()
  }

  function cycleRepeatMode() {
    const order: RepeatMode[] = ['off', 'all', 'one']
    const nextMode = order[(order.indexOf(settings.value.repeatMode) + 1) % order.length] || 'off'
    settings.value.repeatMode = nextMode
    persistPlayerState()
  }

  function toggleShuffle() {
    settings.value.shuffle = !settings.value.shuffle
    persistPlayerState()
  }

  async function setActiveScene(sceneId: string) {
    const target = backgrounds.value.find((scene: BackgroundScene) => scene.id === sceneId)
    if (!target) {
      return
    }

    settings.value.activeSceneId = sceneId
    await $fetch('/api/settings/background', {
      method: 'PATCH',
      body: {
        activeSceneId: sceneId
      }
    })

    if (target.kind === 'video' && !target.playbackUrl) {
      await refreshBackgroundPlayback(sceneId)
    }
  }

  async function refreshBackgroundPlayback(sceneId: string) {
    const target = backgrounds.value.find((scene: BackgroundScene) => scene.id === sceneId)
    if (!target) {
      return null
    }

    const playback = await $fetch<PlaybackUrl>(`/api/backgrounds/${sceneId}/video-url`)
    target.playbackUrl = playback.url
    return playback.url
  }

  async function parseTrackMetadata(file: File) {
    const metadata = await parseBlob(file).catch(() => null)
    const title = metadata?.common.title || file.name.replace(/\.[^.]+$/, '')
    const artist = metadata?.common.artist || 'Unknown Artist'
    const album = metadata?.common.album || null
    const genre = metadata?.common.genre?.[0] || null
    const durationMs = Math.round((metadata?.format.duration || 0) * 1000)

    return {
      title,
      artist,
      album,
      genre,
      durationMs
    }
  }

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList)
    if (!files.length) {
      return
    }

    for (const file of files) {
      const status: UploadStatus = {
        filename: file.name,
        status: 'queued'
      }

      uploadStatuses.value = [status, ...uploadStatuses.value].slice(0, 6)

      try {
        const metadata = await parseTrackMetadata(file)
        status.status = 'uploading'

        const ticket = await $fetch<UploadTicket>('/api/uploads/audio-url', {
          method: 'POST',
          body: {
            filename: file.name,
            mimeType: file.type,
            size: file.size
          }
        })

        const uploadResponse = await fetch(ticket.uploadUrl, {
          method: ticket.method,
          headers: ticket.headers,
          body: file
        })

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed for ${file.name}`)
        }

        status.status = 'finishing'
        await $fetch('/api/uploads/complete', {
          method: 'POST',
          body: {
            uploadId: ticket.uploadId,
            metadata
          }
        })

        const track = await $fetch<Track>('/api/tracks', {
          method: 'POST',
          body: {
            uploadId: ticket.uploadId,
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            durationMs: metadata.durationMs,
            genre: metadata.genre
          }
        })

        tracks.value = [track, ...tracks.value]
        status.status = 'done'
        status.message = 'Imported'

        if (!queue.value.length) {
          await setQueue([track.id], 0, false)
        }
      } catch (caught) {
        status.status = 'error'
        status.message = caught instanceof Error ? caught.message : 'Upload failed'
        lastError.value = status.message
      }
    }
  }

  async function createPlaylist(name: string) {
    const trimmedName = name.trim()
    if (!trimmedName || !queue.value.length) {
      return null
    }

    const playlist = await $fetch<Playlist>('/api/playlists', {
      method: 'POST',
      body: {
        name: trimmedName,
        trackIds: queue.value
      }
    })

    playlists.value = [...playlists.value, playlist].sort((left, right) => left.name.localeCompare(right.name))
    return playlist
  }

  async function loadPlaylist(playlistId: string) {
    const playlist = playlists.value.find((item: Playlist) => item.id === playlistId)
    if (!playlist) {
      return
    }

    await setQueue(playlist.trackIds, 0, true)
  }

  async function deleteTrack(trackId: string) {
    if (!trackMap.value.has(trackId)) {
      return
    }

    try {
      await $fetch(`/api/tracks/${trackId}`, {
        method: 'DELETE'
      })

      tracks.value = tracks.value.filter((track: Track) => track.id !== trackId)

      if (queue.value.includes(trackId)) {
        const wasCurrentTrack = currentTrackId.value === trackId
        queue.value = queue.value.filter((id: string) => id !== trackId)
        
        if (wasCurrentTrack) {
          const audio = audioElement.value
          if (audio) {
            audio.pause()
            audio.removeAttribute('src')
            audio.load()
          }
          currentTrackUrl.value = ''
          currentTrackUrlExpiresAt.value = null
          isPlaying.value = false
          
          syncCurrentTrackWithQueue()
          
          if (currentTrackId.value && queue.value.length > 0) {
            await playTrack(currentTrackId.value, currentIndex.value, true)
          }
        } else {
          syncCurrentTrackWithQueue()
        }
        
        persistPlayerState()
      }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Failed to delete track'
      throw error
    }
  }

  return {
    tracks,
    playlists,
    backgrounds,
    settings,
    queueSnapshot,
    currentTrack,
    currentTrackId,
    currentIndex,
    currentTrackUrl,
    isPlaying,
    activeScene,
    filteredTracks,
    searchQuery,
    audioLevel,
    uploadStatuses,
    lastError,
    bootstrapping,
    libraryLoaded,
    bootstrap,
    reset,
    bindAudio,
    setAudioLevel,
    togglePlayback,
    pause,
    playTrack,
    next,
    previous,
    handleTrackEnded,
    handleAudioError,
    setQueue,
    enqueue,
    removeFromQueue,
    setSearchQuery,
    setVolume,
    cycleRepeatMode,
    toggleShuffle,
    setActiveScene,
    refreshBackgroundPlayback,
    uploadFiles,
    createPlaylist,
    loadPlaylist,
    deleteTrack
  }
})
