import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@nuxthub/db'
import { userSettings } from '~~/server/db/schema'
import { requireAppSession } from '~~/server/utils/auth'
import { ensureSeedData, getSettingsBundle } from '~~/server/utils/library'
import { readValidatedJsonBody } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)
  await ensureSeedData()

  const payload = await readValidatedJsonBody(event, z.object({
    activeSceneId: z.string().min(1)
  }))

  await db.update(userSettings)
    .set({
      activeSceneId: payload.activeSceneId,
      updatedAt: new Date()
    })
    .where(eq(userSettings.id, 'primary'))

  return getSettingsBundle()
})
