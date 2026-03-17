import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@nuxthub/db'
import { queueSnapshots, userSettings } from '~~/server/db/schema'
import { requireAppSession } from '~~/server/utils/auth'
import { ensureSeedData, getSettingsBundle } from '~~/server/utils/library'
import { readValidatedJsonBody } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)
  await ensureSeedData()

  const payload = await readValidatedJsonBody(event, z.object({
    volume: z.number().min(0).max(1),
    repeatMode: z.enum(['off', 'one', 'all']),
    shuffle: z.boolean(),
    lastQueue: z.array(z.string()).default([]),
    lastTrackId: z.string().nullable().optional(),
    currentIndex: z.number().int().min(0).default(0)
  }))

  const updatedAt = new Date().toISOString()
  await db.update(userSettings)
    .set({
      volume: payload.volume,
      repeatMode: payload.repeatMode,
      shuffle: payload.shuffle,
      lastQueue: JSON.stringify(payload.lastQueue),
      lastTrackId: payload.lastTrackId ?? null,
      updatedAt
    })
    .where(eq(userSettings.id, 'primary'))

  await db.update(queueSnapshots)
    .set({
      trackIds: JSON.stringify(payload.lastQueue),
      currentTrackId: payload.lastTrackId ?? null,
      currentIndex: payload.currentIndex,
      updatedAt
    })
    .where(eq(queueSnapshots.id, 'last-session'))

  return getSettingsBundle()
})
