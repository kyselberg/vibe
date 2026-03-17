import { requireAppSession } from '~~/server/utils/auth'
import { resolveBackgroundPlayback } from '~~/server/utils/library'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)
  return resolveBackgroundPlayback(getRouterParam(event, 'id') || '')
})
