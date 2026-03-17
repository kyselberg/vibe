export const useAuthStore = defineStore('auth', () => {
  const authenticated = ref(false)
  const ready = ref(false)
  const error = ref('')

  async function checkSession() {
    try {
      const response = await $fetch<{ authenticated: boolean }>('/api/auth/session')
      authenticated.value = response.authenticated
    } catch {
      authenticated.value = false
    } finally {
      ready.value = true
    }
  }

  async function unlock(passcode: string) {
    error.value = ''

    try {
      await $fetch('/api/auth/passcode', {
        method: 'POST',
        body: { passcode }
      })

      authenticated.value = true
      ready.value = true
      return true
    } catch (caught) {
      authenticated.value = false
      error.value = caught instanceof Error ? caught.message : 'Failed to unlock'
      return false
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', {
      method: 'POST'
    })

    authenticated.value = false
  }

  return {
    authenticated,
    ready,
    error,
    checkSession,
    unlock,
    logout
  }
})
