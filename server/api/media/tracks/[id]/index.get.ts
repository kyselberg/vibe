import { requireAppSession } from '~~/server/utils/auth'
import { findTrackById, streamBlobByKey } from '~~/server/utils/library'

export default defineEventHandler(async (event) => {
  await requireAppSession(event)

  const track = await findTrackById(getRouterParam(event, 'id') || '')
  if (!track) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Track not found'
    })
  }

  return streamBlobByKey(track.objectKey, track.mimeType)
})
