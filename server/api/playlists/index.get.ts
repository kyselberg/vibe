import { requireAppSession } from '~~/server/utils/auth'
import { ensureSeedData, getPlaylists } from '~~/server/utils/library'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)
  await ensureSeedData()
  return getPlaylists()
})
