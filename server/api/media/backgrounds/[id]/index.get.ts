import { eq } from 'drizzle-orm'
import { db } from '@nuxthub/db'
import { backgroundScenes } from '~~/server/db/schema'
import { requireAppSession } from '~~/server/utils/auth'
import { streamBlobByKey } from '~~/server/utils/library'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)

  const [scene] = await db.select().from(backgroundScenes).where(eq(backgroundScenes.id, getRouterParam(event, 'id') || '')).limit(1)
  if (!scene?.videoKey) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Background video not found'
    })
  }

  return streamBlobByKey(scene.videoKey, 'video/mp4')
})
