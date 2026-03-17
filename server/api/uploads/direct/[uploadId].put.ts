import { readRawBody } from 'h3'
import { eq } from 'drizzle-orm'
import { blob } from '@nuxthub/blob'
import { db } from '@nuxthub/db'
import { uploadJobs } from '~~/server/db/schema'
import { requireAppSession } from '~~/server/utils/auth'
import { findUploadJob } from '~~/server/utils/library'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)

  const uploadId = getRouterParam(event, 'uploadId') || ''
  const job = await findUploadJob(uploadId)
  if (!job) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Upload job not found'
    })
  }

  const body = await readRawBody(event, false)
  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing upload body'
    })
  }

  await blob.put(job.objectKey, body, {
    contentType: job.mimeType
  })

  await db.update(uploadJobs)
    .set({
      status: 'uploaded',
      updatedAt: new Date().toISOString()
    })
    .where(eq(uploadJobs.id, job.id))

  return {
    uploaded: true
  }
})
