<script setup lang="ts">
import type { BackgroundScene } from '~~/shared/types/vibe'

const vibe = useVibeStore()

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
</script>

<template>
  <aside class="panel studio-panel">
    <div class="panel-head">
      <div>
        <p class="eyebrow">Background studio</p>
        <h2>Scene stack</h2>
      </div>
      <span class="stat-chip">
        {{ vibe.activeScene?.kind || 'shader' }}
      </span>
    </div>

    <div class="studio-feature">
      <p class="section-title">Active scene</p>
      <h3>{{ vibe.activeScene?.name || 'None selected' }}</h3>
      <p class="micro-copy">
        Shader scenes react to the live analyser level. Video scenes use muted loops and can refresh their signed source when needed.
      </p>

      <button
        v-if="vibe.activeScene?.kind === 'video'"
        class="secondary-button"
        type="button"
        @click="vibe.refreshBackgroundPlayback(vibe.activeScene.id)"
      >
        Refresh video source
      </button>
    </div>

    <div class="scene-grid">
      <button
        v-for="scene in vibe.backgrounds"
        :key="scene.id"
        class="scene-card"
        :class="{ 'is-active': vibe.activeScene?.id === scene.id }"
        type="button"
        @click="activateScene(scene)"
      >
        <span class="scene-card__preview" :style="sceneStyle(scene)" />
        <span class="scene-card__meta">
          <strong>{{ scene.name }}</strong>
          <small>{{ scene.kind === 'video' ? 'Loop video' : 'Shader preset' }}</small>
        </span>
      </button>
    </div>

    <div class="scene-notes">
      <p class="section-title">Visual behaviour</p>
      <ul class="plain-list">
        <li>Neo gradients and aurora presets pulse from the live analyser node.</li>
        <li>Video loops fade in over the shader wall, so playback never hard-cuts to black.</li>
        <li>All scene changes keep the music uninterrupted.</li>
      </ul>
    </div>
  </aside>
</template>
