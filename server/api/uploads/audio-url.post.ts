import { z } from 'zod'
import { db } from '@nuxthub/db'
import { uploadJobs } from '~~/server/db/schema'
import type { UploadTicket } from '~~/shared/types/vibe'
import { requireAppSession } from '~~/server/utils/auth'
import { ensureSeedData } from '~~/server/utils/library'
import { inferAudioMimeType, isSupportedAudioType, makeObjectKey } from '~~/server/utils/media'
import { createPresignedUploadUrl, hasR2SigningConfig } from '~~/server/utils/r2'
import { readValidatedJsonBody } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)
  await ensureSeedData()

  const payload = await readValidatedJsonBody(event, z.object({
    filename: z.string().min(1),
    mimeType: z.string().optional().default(''),
    size: z.number().int().positive()
  }))

  const config = useRuntimeConfig(event)
  const maxUploadBytes = (config.public.mediaMaxUploadMb || 250) * 1024 * 1024
  const mimeType = inferAudioMimeType(payload.filename, payload.mimeType)

  if (!isSupportedAudioType(payload.filename, mimeType)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported audio type'
    })
  }

  if (payload.size > maxUploadBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: 'File exceeds the upload limit'
    })
  }

  const uploadId = crypto.randomUUID()
  const objectKey = makeObjectKey(payload.filename)
  const updatedAt = new Date().toISOString()

  await db.insert(uploadJobs).values({
    id: uploadId,
    objectKey,
    filename: payload.filename,
    mimeType,
    size: payload.size,
    status: 'pending',
    metadataJson: '{}',
    createdAt: updatedAt,
    updatedAt
  })

  if (hasR2SigningConfig(config)) {
    const signed = await createPresignedUploadUrl(config, objectKey, mimeType)
    const ticket: UploadTicket = {
      uploadId,
      objectKey,
      uploadUrl: signed.url,
      method: 'PUT',
      headers: signed.headers,
      strategy: 'presigned'
    }

    return ticket
  }

  const ticket: UploadTicket = {
    uploadId,
    objectKey,
    uploadUrl: `/api/uploads/direct/${uploadId}`,
    method: 'PUT',
    headers: {
      'content-type': mimeType
    },
    strategy: 'proxy'
  }

  return ticket
})
