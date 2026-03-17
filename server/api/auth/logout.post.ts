import { clearAppSession } from '~~/server/utils/auth'

export default defineEventHandler((event) => {
  clearAppSession(event)
  return {
    authenticated: false
  }
})
