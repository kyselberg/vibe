import { eq } from 'drizzle-orm'
import { createError } from 'h3'
import { db } from '@nuxthub/db'
import { requireAppSession } from '~~/server/utils/auth'
import { tracks } from '~~/server/db/schema'
import { deleteObject, hasR2SigningConfig } from '~~/server/utils/r2'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)
  
  const trackId = getRouterParam(event, 'id')
  if (!trackId) {
    throw createError({ statusCode: 400, statusMessage: 'Track ID is required' })
  }

  const [track] = await db.select().from(tracks).where(eq(tracks.id, trackId)).limit(1)
  if (!track) {
    throw createError({ statusCode: 404, statusMessage: 'Track not found' })
  }

  const config = useRuntimeConfig()
  
  if (hasR2SigningConfig(config)) {
    try {
      await deleteObject(config, track.objectKey)
    } catch (error) {
      console.error(`Failed to delete track file from R2: ${track.objectKey}`, error)
    }

    if (track.coverKey) {
      try {
        await deleteObject(config, track.coverKey)
      } catch (error) {
        console.error(`Failed to delete cover file from R2: ${track.coverKey}`, error)
      }
    }
  }

  await db.delete(tracks).where(eq(tracks.id, trackId))

  return null
})
