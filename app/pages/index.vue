<script setup lang="ts">
const auth = useAuthStore()
const vibe = useVibeStore()
const ui = useWorkspaceUI()

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

    <main class="vibe-shell" :class="{ 'vibe-shell--workspace': auth.authenticated }">
      <section v-if="!auth.ready" class="hero-card hero-card--loading">
        <p class="eyebrow">Booting the lounge</p>
        <h1>Checking your private session.</h1>
        <p class="support-copy">
          Nuxt on the edge, Cloudflare-backed media, and a shader wall warming up in the background.
        </p>
      </section>

      <PasscodeGate v-else-if="!auth.authenticated" />

      <template v-else>
        <Transition name="sheet-fade">
          <div
            v-if="ui.openSurface.value === 'queue' || ui.openSurface.value === 'scenes'"
            class="sheet-backdrop"
            @click="ui.handleBackdropClick"
          />
        </Transition>

        <Transition name="panel-slide">
          <LibrarySheet v-if="ui.openSurface.value === 'library'" />
        </Transition>

        <Transition name="sheet-slide">
          <QueueSheet v-if="ui.openSurface.value === 'queue'" />
        </Transition>

        <Transition name="sheet-slide">
          <ScenesSheet v-if="ui.openSurface.value === 'scenes'" />
        </Transition>

        <NeoDock />
      </template>
    </main>
  </div>
</template>
