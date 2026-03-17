import { getAppSession } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event)
  return {
    authenticated: Boolean(session)
  }
})
