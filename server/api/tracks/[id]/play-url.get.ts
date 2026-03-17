import { requireAppSession } from '~~/server/utils/auth'
import { resolveTrackPlayback } from '~~/server/utils/library'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)
  return resolveTrackPlayback(getRouterParam(event, 'id') || '')
})
