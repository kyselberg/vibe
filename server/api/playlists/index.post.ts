import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@nuxthub/db'
import { playlists } from '~~/server/db/schema'
import { requireAppSession } from '~~/server/utils/auth'
import { ensureSeedData, mapPlaylist } from '~~/server/utils/library'
import { readValidatedJsonBody } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)
  await ensureSeedData()

  const payload = await readValidatedJsonBody(event, z.object({
    name: z.string().min(1).max(80),
    trackIds: z.array(z.string()).default([])
  }))

  const id = crypto.randomUUID()
  await db.insert(playlists).values({
    id,
    name: payload.name.trim(),
    trackIds: JSON.stringify(payload.trackIds),
    createdAt: new Date(),
    updatedAt: new Date()
  })

  const [playlist] = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1)
  if (!playlist) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create playlist'
    })
  }

  return mapPlaylist(playlist)
})
