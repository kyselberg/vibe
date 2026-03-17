import { requireAppSession } from '~~/server/utils/auth'
import { getBootstrap } from '~~/server/utils/library'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)
  return getBootstrap()
})
