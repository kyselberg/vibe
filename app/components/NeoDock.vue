<script setup lang="ts">
import {
  LibraryBig,
  ListMusic,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  Wallpaper
} from 'lucide-vue-next'
import type { BackgroundScene } from '~~/shared/types/vibe'

const vibe = useVibeStore()
const ui = useWorkspaceUI()
const audioRefA = ref<HTMLAudioElement | null>(null)
const audioRefB = ref<HTMLAudioElement | null>(null)
const currentTime = ref(0)
const duration = ref(0)

const crossfade = useCrossfade()
useAudioVisualiser(crossfade.activeAudio, vibe.setAudioLevel, crossfade)

const scenePills = computed<{ prev: BackgroundScene | null; current: BackgroundScene | null; next: BackgroundScene | null }>(() => {
  const scenes = vibe.backgrounds
  const activeId = vibe.activeScene?.id
  const currentIdx = scenes.findIndex((s: BackgroundScene) => s.id === activeId)

  return {
    prev: currentIdx > 0 ? scenes[currentIdx - 1] ?? null : null,
    current: vibe.activeScene,
    next: currentIdx >= 0 && currentIdx < scenes.length - 1 ? scenes[currentIdx + 1] ?? null : null
  }
})

const repeatControl = computed(() => {
  if (vibe.settings.repeatMode === 'one') {
    return {
      icon: Repeat1,
      isActive: true,
      label: 'Repeat one'
    }
  }

  if (vibe.settings.repeatMode === 'all') {
    return {
      icon: Repeat,
      isActive: true,
      label: 'Repeat all'
    }
  }

  return {
    icon: Repeat,
    isActive: false,
    label: 'Repeat off'
  }
})

const volumeControl = computed(() => {
  const volume = vibe.settings.volume

  if (volume <= 0) {
    return {
      icon: VolumeX,
      label: 'Volume muted'
    }
  }

  if (volume < 0.5) {
    return {
      icon: Volume1,
      label: `Volume ${Math.round(volume * 100)}%`
    }
  }

  return {
    icon: Volume2,
    label: `Volume ${Math.round(volume * 100)}%`
  }
})

const progressPercentage = computed(() => {
  if (!duration.value) return 0
  return Math.min(100, (currentTime.value / duration.value) * 100)
})

const playPauseIcon = computed(() => (vibe.isPlaying ? Pause : Play))
const playPauseLabel = computed(() => (vibe.isPlaying ? 'Pause playback' : 'Play playback'))
const seekStyle = computed<Record<string, string>>(() => ({
  '--seek-progress': `${progressPercentage.value}%`
}))

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function onLoadedMetadata(event: Event) {
  const audio = event.target as HTMLAudioElement
  if (audio !== crossfade.activeAudio.value) return
  duration.value = audio.duration || 0
}

function onTimeUpdate(event: Event) {
  const audio = event.target as HTMLAudioElement
  // Always check crossfade on the outgoing track's timeupdate
  if (!crossfade.isCrossfading.value) {
    vibe.checkCrossfade(audio.currentTime, audio.duration)
  }
  // Only update UI from the active deck
  if (audio !== crossfade.activeAudio.value) return
  currentTime.value = audio.currentTime
  duration.value = audio.duration || duration.value
}

function onSeek(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  const active = crossfade.activeAudio.value
  if (!active || !Number.isFinite(value)) return
  active.currentTime = value
  currentTime.value = value
}

onMounted(() => {
  if (audioRefA.value && audioRefB.value) {
    crossfade.bind(audioRefA.value, audioRefB.value)
    vibe.bindCrossfade(crossfade)
    vibe.bindAudio(audioRefA.value)
  }
  window.addEventListener('keydown', ui.handleEscape)
})

onUnmounted(() => {
  window.removeEventListener('keydown', ui.handleEscape)
  crossfade.destroy()
})
</script>

<template>
  <div class="neo-dock">
    <audio
      ref="audioRefA"
      preload="metadata"
      @play="vibe.isPlaying = true"
      @pause="vibe.isPlaying = false"
      @ended="vibe.handleTrackEnded"
      @error="vibe.handleAudioError"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
    />
    <audio
      ref="audioRefB"
      preload="metadata"
      @play="vibe.isPlaying = true"
      @pause="vibe.isPlaying = false"
      @ended="vibe.handleTrackEnded"
      @error="vibe.handleAudioError"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
    />

    <div class="dock-zone dock-zone--left">
      <button
        class="dock-now-playing"
        type="button"
        aria-label="Show current track in library"
        title="Show in library"
        @click="ui.openLibraryToTrack()"
      >
        <span class="dock-cover-art">
          <Music class="dock-cover-icon" aria-hidden="true" />
        </span>
        <span class="dock-track-info">
          <span class="dock-track-title">{{ vibe.currentTrack?.title || 'No track' }}</span>
          <span class="dock-track-artist">{{ vibe.currentTrack?.artist || 'Queue something' }}</span>
        </span>
      </button>
    </div>

    <div class="dock-zone dock-zone--center">
      <div class="dock-controls">
        <button
          class="dock-icon-button"
          type="button"
          :class="{ 'is-active': vibe.settings.shuffle }"
          aria-label="Toggle shuffle"
          title="Toggle shuffle"
          @click="vibe.toggleShuffle"
        >
          <Shuffle class="dock-icon" aria-hidden="true" />
        </button>
        <button
          class="dock-icon-button"
          type="button"
          aria-label="Previous track"
          title="Previous track"
          @click="vibe.previous"
        >
          <SkipBack class="dock-icon" aria-hidden="true" />
        </button>
        <button
          class="dock-icon-button dock-icon-button--play"
          type="button"
          :aria-label="playPauseLabel"
          :title="playPauseLabel"
          @click="vibe.togglePlayback"
        >
          <component :is="playPauseIcon" class="dock-icon dock-icon--play" aria-hidden="true" />
        </button>
        <button
          class="dock-icon-button"
          type="button"
          aria-label="Next track"
          title="Next track"
          @click="vibe.next(true)"
        >
          <SkipForward class="dock-icon" aria-hidden="true" />
        </button>
        <button
          class="dock-icon-button"
          type="button"
          :class="{ 'is-active': repeatControl.isActive }"
          :aria-label="repeatControl.label"
          :title="repeatControl.label"
          @click="vibe.cycleRepeatMode"
        >
          <component :is="repeatControl.icon" class="dock-icon" aria-hidden="true" />
        </button>
      </div>

      <div class="dock-progress">
        <span class="dock-time">{{ formatTime(currentTime) }}</span>
        <input
          class="dock-seek"
          type="range"
          min="0"
          :max="duration || 0"
          :value="currentTime"
          :style="seekStyle"
          step="0.25"
          aria-label="Seek track position"
          :disabled="!duration"
          @input="onSeek"
        >
        <span class="dock-time">{{ formatTime(duration) }}</span>
      </div>
    </div>

    <div class="dock-zone dock-zone--right">
      <div class="dock-right-controls">
        <label class="dock-volume" :title="volumeControl.label">
          <component :is="volumeControl.icon" class="dock-icon dock-icon--volume" aria-hidden="true" />
          <span class="visually-hidden">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="vibe.settings.volume"
            aria-label="Volume"
            @input="vibe.setVolume(Number(($event.target as HTMLInputElement).value))"
          >
        </label>
        <button
          class="dock-icon-button"
          type="button"
          :class="{ 'is-active': ui.openSurface.value === 'queue' }"
          aria-label="Open queue"
          title="Open queue"
          @click="ui.toggleSheet('queue')"
        >
          <ListMusic class="dock-icon" aria-hidden="true" />
        </button>
        <button
          v-if="scenePills.current"
          class="dock-scene-chip"
          type="button"
          aria-label="Open scenes"
          :title="scenePills.current.name"
          @click="ui.toggleSheet('scenes')"
        >
          <span class="dock-scene-chip-name">{{ scenePills.current.name }}</span>
        </button>
        <button
          class="dock-icon-button"
          type="button"
          :class="{ 'is-active': ui.openSurface.value === 'scenes' }"
          aria-label="Open scenes"
          title="Open scenes"
          @click="ui.toggleSheet('scenes')"
        >
          <Wallpaper class="dock-icon" aria-hidden="true" />
        </button>
        <button
          class="dock-icon-button"
          type="button"
          :class="{ 'is-active': ui.openSurface.value === 'library' }"
          aria-label="Open library"
          title="Open library"
          @click="ui.toggleSheet('library')"
        >
          <LibraryBig class="dock-icon" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
