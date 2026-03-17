export default defineNuxtPlugin(() => {
  const vibe = useVibeStore()

  if (!('mediaSession' in navigator)) {
    return
  }

  const setMetadata = () => {
    const track = vibe.currentTrack

    if (!track) {
      navigator.mediaSession.metadata = null
      return
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || 'Vibe Player'
    })
  }

  const disposeTrack = watch(() => vibe.currentTrack, setMetadata, { immediate: true })
  const disposePlaybackState = watch(() => vibe.isPlaying, (isPlaying) => {
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, { immediate: true })

  navigator.mediaSession.setActionHandler('play', () => vibe.togglePlayback())
  navigator.mediaSession.setActionHandler('pause', () => vibe.pause())
  navigator.mediaSession.setActionHandler('previoustrack', () => vibe.previous())
  navigator.mediaSession.setActionHandler('nexttrack', () => vibe.next(true))

  return {
    provide: {
      disposeMediaSessionWatchers: () => {
        disposeTrack()
        disposePlaybackState()
      }
    }
  }
})
