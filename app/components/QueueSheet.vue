<script setup lang="ts">
import type { Track } from '~~/shared/types/vibe'

const vibe = useVibeStore()
const ui = useWorkspaceUI()

const queueTracks = computed<Track[]>(() => vibe.queueSnapshot.trackIds
  .map((trackId: string) => vibe.tracks.find((track: Track) => track.id === trackId) || null)
  .filter((track): track is Track => Boolean(track)))

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
</script>

<template>
  <div class="sheet queue-sheet">
    <div class="sheet-header">
      <h2 class="sheet-title">Queue</h2>
      <span class="sheet-count">{{ queueTracks.length }} tracks</span>
      <button class="sheet-close" type="button" @click="ui.closeSheet()">Close</button>
    </div>

    <div class="sheet-body">
      <ul class="sheet-list">
        <li
          v-for="(track, index) in queueTracks"
          :key="`${track.id}-${index}`"
          class="sheet-queue-item"
          :class="{ 'is-current': vibe.currentTrackId === track.id }"
        >
          <button class="sheet-queue-body" type="button" @click="vibe.playTrack(track.id, index, true)">
            <span class="sheet-queue-title">{{ track.title }}</span>
            <span class="sheet-queue-artist">{{ track.artist }}</span>
          </button>
          <span class="sheet-queue-duration">{{ formatDuration(track.durationMs) }}</span>
          <button class="sheet-action" type="button" @click="vibe.removeFromQueue(track.id)">
            Remove
          </button>
        </li>
      </ul>

      <p v-if="!queueTracks.length" class="sheet-empty">
        Queue is empty. Add tracks from the library to start playing.
      </p>
    </div>
  </div>
</template>
