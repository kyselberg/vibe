<script setup lang="ts">
const auth = useAuthStore()
const vibe = useVibeStore()
const passcode = ref('')
const submitting = ref(false)

async function submit() {
  if (!passcode.value.trim() || submitting.value) {
    return
  }

  submitting.value = true
  const unlocked = await auth.unlock(passcode.value.trim())
  if (unlocked) {
    await vibe.bootstrap(true)
    passcode.value = ''
  }
  submitting.value = false
}
</script>

<template>
  <section class="hero-card">
    <div class="hero-copy">
      <p class="eyebrow">Private streaming lounge</p>
      <h1>Switch moods without switching tabs.</h1>
      <p class="support-copy">
        Stream your own music, keep the queue alive for hours, and flip between neon shader scenes or muted loop videos while you work.
      </p>
    </div>

    <form class="passcode-form" @submit.prevent="submit">
      <label class="field-label" for="passcode">Passcode</label>
      <input
        id="passcode"
        v-model="passcode"
        class="text-field"
        type="password"
        placeholder="Enter your private key"
        autocomplete="current-password"
      >

      <button class="primary-button" type="submit" :disabled="submitting">
        {{ submitting ? 'Unlocking...' : 'Enter lounge' }}
      </button>

      <p v-if="auth.error" class="inline-error">
        {{ auth.error }}
      </p>
    </form>

    <div class="hero-footnotes">
      <div>
        <span class="hero-pill">Own files only</span>
        <p>No Spotify or YouTube playback connectors.</p>
      </div>
      <div>
        <span class="hero-pill">Cloudflare ready</span>
        <p>R2 for media, D1 for metadata, local proxy fallback in dev.</p>
      </div>
    </div>
  </section>
</template>
