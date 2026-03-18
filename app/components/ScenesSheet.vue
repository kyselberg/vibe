<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { BackgroundScene } from '~~/shared/types/vibe'
import { getBackgroundCategoryMeta, groupBackgroundScenes } from '~~/shared/backgrounds/registry'
import {X} from "lucide-vue-next"

const vibe = useVibeStore()
const ui = useWorkspaceUI()
const groupedScenes = computed(() => groupBackgroundScenes(vibe.backgrounds))
const sceneCardElements = new Map<string, HTMLElement>()

const activeSceneMeta = computed(() => {
  if (!vibe.activeScene) return null
  return getBackgroundCategoryMeta(vibe.activeScene.config.category, vibe.activeScene.kind)
})

function sceneStyle(scene: BackgroundScene) {
  if (scene.kind === 'video') {
    return {
      background: `linear-gradient(135deg, ${scene.config.overlay || 'rgba(7, 17, 33, 0.75)'}, rgba(255, 255, 255, 0.03))`
    }
  }

  const palette = scene.config.palette || ['#48f3d1', '#ff9250', '#0f1e36']
  return {
    background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]}, ${palette[2]})`
  }
}

async function activateScene(scene: BackgroundScene) {
  await vibe.setActiveScene(scene.id)
}

function registerSceneCard(sceneId: string) {
  return (value: Element | ComponentPublicInstance | null) => {
    if (value instanceof HTMLElement) {
      sceneCardElements.set(sceneId, value)
      return
    }

    sceneCardElements.delete(sceneId)
  }
}

function scrollActiveSceneIntoView(behavior: ScrollBehavior = 'smooth') {
  const sceneId = vibe.activeScene?.id
  if (!sceneId) return

  nextTick(() => {
    sceneCardElements.get(sceneId)?.scrollIntoView({
      behavior,
      block: 'nearest',
      inline: 'center'
    })
  })
}

watch(() => vibe.activeScene?.id, (_, previousSceneId) => {
  scrollActiveSceneIntoView(previousSceneId ? 'smooth' : 'auto')
}, {
  immediate: true,
  flush: 'post'
})
</script>

<template>
  <div class="sheet scenes-sheet">
    <div class="sheet-header">
      <h2 class="sheet-title">Scenes</h2>
      <span class="sheet-count">{{ vibe.backgrounds.length }} scenes</span>
      <button class="sheet-close" type="button" @click="ui.closeSheet()"><X /></button>
    </div>

    <div class="sheet-body scenes-sheet__body">
      <div v-if="vibe.activeScene" class="scenes-sheet__current">
        <span class="scenes-sheet__current-preview" :style="sceneStyle(vibe.activeScene)" />

        <span class="scenes-sheet__current-meta">
          <span class="sheet-scene-chip-row scenes-sheet__current-chip-row">
            <small class="sheet-scene-chip">Now live</small>
            <small>{{ activeSceneMeta?.label }}</small>
            <small>{{ vibe.activeScene.kind === 'video' ? 'Video loop' : 'Live shader' }}</small>
          </span>
          <strong>{{ vibe.activeScene.name }}</strong>
          <small>
            Browse sideways through each lane. The active scene stays highlighted and jumps into view.
          </small>
        </span>

        <button
          v-if="vibe.activeScene.kind === 'video'"
          class="sheet-action"
          type="button"
          @click="vibe.refreshBackgroundPlayback(vibe.activeScene.id)"
        >
          Refresh video source
        </button>
      </div>

      <div
        v-for="group in groupedScenes"
        :key="group.category"
        class="sheet-scene-group"
      >
        <div class="sheet-scene-group__head">
          <h3 class="sheet-scene-group__title">
            {{ group.label }}
          </h3>
          <span class="sheet-count">{{ group.scenes.length }} scenes</span>
        </div>

        <div class="sheet-scene-strip">
          <button
            v-for="scene in group.scenes"
            :key="scene.id"
            class="sheet-scene-card"
            :class="{ 'is-active': vibe.activeScene?.id === scene.id }"
            :ref="registerSceneCard(scene.id)"
            type="button"
            @click="activateScene(scene)"
          >
            <span class="sheet-scene-preview" :style="sceneStyle(scene)" />
            <span class="sheet-scene-meta">
              <span class="sheet-scene-chip-row">
                <small class="sheet-scene-chip">
                  {{ getBackgroundCategoryMeta(scene.config.category, scene.kind).label }}
                </small>
                <small>{{ scene.kind === 'video' ? 'Video loop' : 'Live shader' }}</small>
              </span>
              <strong>{{ scene.name }}</strong>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
