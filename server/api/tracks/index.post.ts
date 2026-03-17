import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@nuxthub/db'
import { tracks, uploadJobs } from '~~/server/db/schema'
import { requireAppSession } from '~~/server/utils/auth'
import { ensureSeedData, findUploadJob, mapTrack } from '~~/server/utils/library'
import { readValidatedJsonBody } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)
  await ensureSeedData()

  const payload = await readValidatedJsonBody(event, z.object({
    uploadId: z.string().min(1),
    title: z.string().min(1),
    artist: z.string().min(1),
    album: z.string().optional().nullable(),
    durationMs: z.number().int().nonnegative().default(0),
    genre: z.string().optional().nullable(),
    coverKey: z.string().optional().nullable()
  }))

  const job = await findUploadJob(payload.uploadId)
  if (!job || job.status !== 'uploaded') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Upload is not ready to become a track'
    })
  }

  const id = crypto.randomUUID()
  await db.insert(tracks).values({
    id,
    title: payload.title,
    artist: payload.artist,
    album: payload.album ?? null,
    durationMs: payload.durationMs,
    genre: payload.genre ?? null,
    objectKey: job.objectKey,
    mimeType: job.mimeType,
    coverKey: payload.coverKey ?? null,
    createdAt: new Date().toISOString()
  })

  await db.update(uploadJobs)
    .set({
      status: 'registered',
      updatedAt: new Date().toISOString()
    })
    .where(eq(uploadJobs.id, job.id))

  const [createdTrack] = await db.select().from(tracks).where(eq(tracks.id, id)).limit(1)
  if (!createdTrack) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create track'
    })
  }

  return mapTrack(createdTrack)
})
