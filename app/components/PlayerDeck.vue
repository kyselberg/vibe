<script setup lang="ts">
import type { Track } from '~~/shared/types/vibe'

const vibe = useVibeStore()
const audioRef = ref<HTMLAudioElement | null>(null)
const currentTime = ref(0)
const duration = ref(0)

useAudioVisualiser(audioRef, vibe.setAudioLevel)

const queueTracks = computed<Track[]>(() => vibe.queueSnapshot.trackIds
  .map((trackId: string) => vibe.tracks.find((track: Track) => track.id === trackId) || null)
  .filter((track): track is Track => Boolean(track)))

const repeatLabel = computed(() => {
  const map = {
    off: 'Repeat off',
    all: 'Repeat all',
    one: 'Repeat one'
  } as const

  return map[vibe.settings.repeatMode as keyof typeof map]
})

const progressPercentage = computed(() => {
  if (!duration.value) {
    return 0
  }

  return Math.min(100, (currentTime.value / duration.value) * 100)
})

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function syncAudioElement(audio: HTMLAudioElement | null) {
  vibe.bindAudio(audio)
}

function onLoadedMetadata(event: Event) {
  const audio = event.target as HTMLAudioElement
  duration.value = audio.duration || 0
}

function onTimeUpdate(event: Event) {
  const audio = event.target as HTMLAudioElement
  currentTime.value = audio.currentTime
  duration.value = audio.duration || duration.value
}

function onSeek(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (!audioRef.value || !Number.isFinite(value)) {
    return
  }

  audioRef.value.currentTime = value
  currentTime.value = value
}

onMounted(() => {
  syncAudioElement(audioRef.value)
})

watch(audioRef, syncAudioElement)
</script>

<template>
  <section class="panel player-panel">
    <audio
      ref="audioRef"
      crossorigin="anonymous"
      preload="metadata"
      @play="vibe.isPlaying = true"
      @pause="vibe.isPlaying = false"
      @ended="vibe.handleTrackEnded"
      @error="vibe.handleAudioError"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
    />

    <div class="panel-head panel-head--dense">
      <div>
        <p class="eyebrow">Now playing</p>
        <h2>{{ vibe.currentTrack?.title || 'Queue a track' }}</h2>
      </div>
      <span class="stat-chip">
        {{ vibe.activeScene?.name || 'No scene' }}
      </span>
    </div>

    <div class="player-hero">
      <div class="record-plate">
        <div class="record-plate__core" :class="{ 'is-spinning': vibe.isPlaying }" />
      </div>

      <div class="player-copy">
        <p class="player-artist">
          {{ vibe.currentTrack?.artist || 'Your private library' }}
        </p>
        <p class="player-album">
          {{ vibe.currentTrack?.album || 'Build the mood by stacking tracks and scenes.' }}
        </p>

        <div class="progress-row">
          <span>{{ formatTime(currentTime) }}</span>
          <div class="progress-bar">
            <span class="progress-bar__fill" :style="{ width: `${progressPercentage}%` }" />
          </div>
          <span>{{ formatTime(duration) }}</span>
        </div>

        <input
          class="range-field"
          type="range"
          min="0"
          :max="duration || 0"
          :value="currentTime"
          step="0.25"
          @input="onSeek"
        >

        <div class="controls-row">
          <button class="secondary-button" type="button" @click="vibe.previous">
            Prev
          </button>
          <button class="primary-button primary-button--wide" type="button" @click="vibe.togglePlayback">
            {{ vibe.isPlaying ? 'Pause' : 'Play' }}
          </button>
          <button class="secondary-button" type="button" @click="vibe.next(true)">
            Next
          </button>
        </div>
      </div>
    </div>

    <div class="player-toolbar">
      <button
        class="tiny-button"
        type="button"
        :class="{ 'is-active': vibe.settings.shuffle }"
        @click="vibe.toggleShuffle"
      >
        Shuffle
      </button>

      <button class="tiny-button" type="button" @click="vibe.cycleRepeatMode">
        {{ repeatLabel }}
      </button>

      <label class="volume-inline">
        <span>Volume</span>
        <input
          class="range-field range-field--compact"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="vibe.settings.volume"
          @input="vibe.setVolume(Number(($event.target as HTMLInputElement).value))"
        >
      </label>
    </div>

    <div class="queue-panel">
      <div class="section-title-row">
        <p class="section-title">Queue</p>
        <span class="section-meta">{{ queueTracks.length }}</span>
      </div>

      <ul class="queue-list">
        <li
          v-for="(track, index) in queueTracks"
          :key="`${track.id}-${index}`"
          class="queue-list__item"
          :class="{ 'is-current': vibe.currentTrackId === track.id }"
        >
          <button type="button" class="queue-list__body" @click="vibe.playTrack(track.id, index, true)">
            <span>{{ track.title }}</span>
            <small>{{ track.artist }}</small>
          </button>
          <button class="tiny-button" type="button" @click="vibe.removeFromQueue(track.id)">
            Drop
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>
