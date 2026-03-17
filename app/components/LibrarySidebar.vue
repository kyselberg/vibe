<script setup lang="ts">
import type { Track } from '~~/shared/types/vibe'

const vibe = useVibeStore()
const fileInput = ref<HTMLInputElement | null>(null)
const playlistName = ref('')

const queueTrackIds = computed(() => new Set(vibe.queueSnapshot.trackIds))

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function pickFiles() {
  fileInput.value?.click()
}

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) {
    return
  }

  await vibe.uploadFiles(input.files)
  input.value = ''
}

async function savePlaylist() {
  if (!playlistName.value.trim()) {
    return
  }

  const created = await vibe.createPlaylist(playlistName.value)
  if (created) {
    playlistName.value = ''
  }
}

async function playTrack(track: Track) {
  const existingIndex = vibe.queueSnapshot.trackIds.indexOf(track.id)
  if (existingIndex >= 0) {
    await vibe.playTrack(track.id, existingIndex, true)
    return
  }

  await vibe.setQueue([track.id, ...vibe.queueSnapshot.trackIds], 0, true)
}
</script>

<template>
  <aside class="panel sidebar-panel">
    <div class="panel-head">
      <div>
        <p class="eyebrow">Library</p>
        <h2>Your stack</h2>
      </div>
      <span class="stat-chip">
        {{ vibe.tracks.length }} tracks
      </span>
    </div>

    <label class="field-label" for="library-search">Search</label>
    <input
      id="library-search"
      :value="vibe.searchQuery"
      class="text-field"
      type="search"
      placeholder="Title, artist, album"
      @input="vibe.setSearchQuery(($event.target as HTMLInputElement).value)"
    >

    <div class="import-panel">
      <div>
        <p class="section-title">Import audio</p>
        <p class="micro-copy">
          MP3, M4A/AAC, OGG. Files upload directly to storage when R2 signing is configured.
        </p>
      </div>
      <button class="secondary-button" type="button" @click="pickFiles">
        Import files
      </button>
      <input
        ref="fileInput"
        class="visually-hidden"
        type="file"
        accept=".mp3,.m4a,.aac,.ogg,audio/mpeg,audio/mp4,audio/ogg"
        multiple
        @change="onFilesSelected"
      >
    </div>

    <ul v-if="vibe.uploadStatuses.length" class="upload-list">
      <li v-for="item in vibe.uploadStatuses" :key="`${item.filename}-${item.status}`" class="upload-list__item">
        <span>{{ item.filename }}</span>
        <strong :data-status="item.status">{{ item.message || item.status }}</strong>
      </li>
    </ul>

    <div class="playlist-builder">
      <div>
        <p class="section-title">Save current queue</p>
        <p class="micro-copy">
          Turn the current stack into a playlist snapshot.
        </p>
      </div>
      <div class="stack-inline">
        <input
          v-model="playlistName"
          class="text-field"
          type="text"
          maxlength="80"
          placeholder="Playlist name"
        >
        <button class="secondary-button" type="button" @click="savePlaylist">
          Save
        </button>
      </div>
    </div>

    <div class="library-section">
      <div class="section-title-row">
        <p class="section-title">Tracks</p>
        <span class="section-meta">{{ vibe.filteredTracks.length }}</span>
      </div>

      <ul class="track-list">
        <li
          v-for="track in vibe.filteredTracks"
          :key="track.id"
          class="track-card"
          :class="{ 'is-active': vibe.currentTrackId === track.id }"
        >
          <button class="track-card__body" type="button" @click="playTrack(track)">
            <span class="track-card__title">{{ track.title }}</span>
            <span class="track-card__meta">
              {{ track.artist }}<span v-if="track.album"> • {{ track.album }}</span>
            </span>
          </button>

          <div class="track-card__actions">
            <span class="track-card__duration">{{ formatDuration(track.durationMs) }}</span>
            <button class="tiny-button" type="button" @click="vibe.enqueue(track.id)">
              {{ queueTrackIds.has(track.id) ? 'In queue' : 'Queue' }}
            </button>
          </div>
        </li>
      </ul>
    </div>

    <div class="library-section">
      <div class="section-title-row">
        <p class="section-title">Playlists</p>
        <span class="section-meta">{{ vibe.playlists.length }}</span>
      </div>

      <ul class="playlist-list">
        <li v-for="playlist in vibe.playlists" :key="playlist.id" class="playlist-list__item">
          <button type="button" class="playlist-button" @click="vibe.loadPlaylist(playlist.id)">
            <span>{{ playlist.name }}</span>
            <small>{{ playlist.trackIds.length }} tracks</small>
          </button>
        </li>
      </ul>
    </div>

    <p class="footer-note">
      Content policy: upload only files you own or are licensed to use.
    </p>
  </aside>
</template>
