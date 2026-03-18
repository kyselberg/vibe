<script setup lang="ts">
import { ListPlus, Trash2, Music, X } from 'lucide-vue-next'
import type { Track } from '~~/shared/types/vibe'

const vibe = useVibeStore()
const ui = useWorkspaceUI()
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
  if (!input.files?.length) return
  await vibe.uploadFiles(input.files)
  input.value = ''
}

async function savePlaylist() {
  if (!playlistName.value.trim()) return
  const created = await vibe.createPlaylist(playlistName.value)
  if (created) playlistName.value = ''
}

async function playTrack(track: Track) {
  const existingIndex = vibe.queueSnapshot.trackIds.indexOf(track.id)
  if (existingIndex >= 0) {
    await vibe.playTrack(track.id, existingIndex, true)
    return
  }
  await vibe.setQueue([track.id, ...vibe.queueSnapshot.trackIds], 0, true)
}

async function confirmDeleteTrack(track: Track) {
  if (window.confirm(`Delete "${track.title}" by ${track.artist}? This cannot be undone.`)) {
    await vibe.deleteTrack(track.id)
  }
}
</script>

<template>
  <div class="sheet library-sheet">
    <div class="sheet-header">
      <h2 class="sheet-title">Library</h2>
      <button class="sheet-close" type="button" @click="ui.closeSheet()"><X /></button>
    </div>

    <div class="sheet-tabs">
      <button
        class="sheet-tab"
        type="button"
        :class="{ 'is-active': ui.libraryTab.value === 'tracks' }"
        @click="ui.setLibraryTab('tracks')"
      >
        Tracks
      </button>
      <button
        class="sheet-tab"
        type="button"
        :class="{ 'is-active': ui.libraryTab.value === 'playlists' }"
        @click="ui.setLibraryTab('playlists')"
      >
        Playlists
      </button>
      <button
        class="sheet-tab"
        type="button"
        :class="{ 'is-active': ui.libraryTab.value === 'import' }"
        @click="ui.setLibraryTab('import')"
      >
        Import
      </button>
    </div>

    <div class="sheet-body">
      <template v-if="ui.libraryTab.value === 'tracks'">
        <div class="sheet-search-pin">
          <input
            :value="vibe.searchQuery"
            class="sheet-search"
            type="search"
            placeholder="Search tracks..."
            @input="vibe.setSearchQuery(($event.target as HTMLInputElement).value)"
          >
          <span class="sheet-count">{{ vibe.filteredTracks.length }} tracks</span>
        </div>

        <ul class="sheet-list">
          <li
            v-for="track in vibe.filteredTracks"
            :key="track.id"
            class="sheet-track"
            :class="{ 'is-active': vibe.currentTrackId === track.id }"
          >
            <span class="sheet-track-cover">
              <Music :size="16" />
            </span>
            <button class="sheet-track-body" type="button" @click="playTrack(track)">
              <span class="sheet-track-title">{{ track.title }}</span>
              <span class="sheet-track-meta">{{ track.artist }}</span>
            </button>
            <span class="sheet-track-duration">{{ formatDuration(track.durationMs) }}</span>
            <span class="sheet-track-actions">
              <button
                class="sheet-track-action"
                type="button"
                :title="queueTrackIds.has(track.id) ? 'In queue' : 'Add to queue'"
                @click="vibe.enqueue(track.id)"
              >
                <ListPlus :size="14" />
              </button>
              <button
                class="sheet-track-action sheet-track-action--danger"
                type="button"
                title="Delete track"
                @click="confirmDeleteTrack(track)"
              >
                <Trash2 :size="14" />
              </button>
            </span>
          </li>
        </ul>

        <p v-if="!vibe.filteredTracks.length" class="sheet-empty">
          No tracks found. Import some audio files to get started.
        </p>
      </template>

      <template v-else-if="ui.libraryTab.value === 'playlists'">
        <div class="sheet-section">
          <p class="sheet-section-title">Create playlist from queue</p>
          <div class="sheet-inline-form">
            <input
              v-model="playlistName"
              class="sheet-input"
              type="text"
              maxlength="80"
              placeholder="Playlist name"
            >
            <button class="sheet-action" type="button" @click="savePlaylist">Save</button>
          </div>
        </div>

        <div class="sheet-section">
          <p class="sheet-section-title">Saved playlists</p>
          <ul class="sheet-list">
            <li v-for="playlist in vibe.playlists" :key="playlist.id" class="sheet-playlist">
              <button class="sheet-playlist-body" type="button" @click="vibe.loadPlaylist(playlist.id)">
                <span>{{ playlist.name }}</span>
                <span class="sheet-playlist-count">{{ playlist.trackIds.length }} tracks</span>
              </button>
            </li>
          </ul>
          <p v-if="!vibe.playlists.length" class="sheet-empty">
            No playlists yet. Queue some tracks and save them as a playlist.
          </p>
        </div>
      </template>

      <template v-else-if="ui.libraryTab.value === 'import'">
        <div class="sheet-section">
          <p class="sheet-section-title">Import audio files</p>
          <p class="sheet-hint">MP3, M4A/AAC, OGG. Files upload directly to storage.</p>
          <button class="sheet-action sheet-action--wide" type="button" @click="pickFiles">
            Choose files
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

        <ul v-if="vibe.uploadStatuses.length" class="sheet-upload-list">
          <li v-for="item in vibe.uploadStatuses" :key="`${item.filename}-${item.status}`" class="sheet-upload-item">
            <span>{{ item.filename }}</span>
            <span :data-status="item.status">{{ item.message || item.status }}</span>
          </li>
        </ul>

        <div class="sheet-section">
          <p class="sheet-hint">Content policy: upload only files you own or are licensed to use.</p>
        </div>
      </template>
    </div>
  </div>
</template>
