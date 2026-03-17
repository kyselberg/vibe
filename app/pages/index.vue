<script setup lang="ts">
const auth = useAuthStore()
const vibe = useVibeStore()

onMounted(async () => {
  await auth.checkSession()
  if (auth.authenticated) {
    await vibe.bootstrap()
  }
})

watch(() => auth.authenticated, async (authenticated) => {
  if (authenticated) {
    await vibe.bootstrap(true)
  } else {
    vibe.reset()
  }
})
</script>

<template>
  <div class="vibe-app">
    <VibeBackgroundStage />

    <main class="vibe-shell">
      <section v-if="!auth.ready" class="hero-card hero-card--loading">
        <p class="eyebrow">Booting the lounge</p>
        <h1>Checking your private session.</h1>
        <p class="support-copy">
          Nuxt on the edge, Cloudflare-backed media, and a shader wall warming up in the background.
        </p>
      </section>

      <PasscodeGate v-else-if="!auth.authenticated" />

      <div v-else class="workspace-grid">
        <LibrarySidebar />
        <PlayerDeck />
        <BackgroundStudio />
      </div>
    </main>
  </div>
</template>
