import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { blob } from '@nuxthub/blob'
import { db } from '@nuxthub/db'
import { uploadJobs } from '~~/server/db/schema'
import { requireAppSession } from '~~/server/utils/auth'
import { findUploadJob } from '~~/server/utils/library'
import { readValidatedJsonBody } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)

  const payload = await readValidatedJsonBody(event, z.object({
    uploadId: z.string().min(1),
    metadata: z.record(z.string(), z.any()).default({})
  }))

  const job = await findUploadJob(payload.uploadId)
  if (!job) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Upload job not found'
    })
  }

  if (job.status === 'pending') {
    const object = await blob.head(job.objectKey)
    if (!object) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Upload is not visible in storage yet'
      })
    }
  }

  await db.update(uploadJobs)
    .set({
      status: 'uploaded',
      metadataJson: JSON.stringify(payload.metadata),
      updatedAt: new Date().toISOString()
    })
    .where(eq(uploadJobs.id, job.id))

  return {
    uploaded: true,
    objectKey: job.objectKey,
    uploadId: job.id
  }
})
