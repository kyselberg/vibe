import { z } from 'zod'
import { setSession } from '~~/server/utils/auth'
import { readValidatedJsonBody } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const { passcode } = await readValidatedJsonBody(event, z.object({
    passcode: z.string().min(1)
  }))

  const config = useRuntimeConfig(event)
  if (passcode !== config.appPasscode) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid passcode'
    })
  }

  await setSession(event)

  return {
    authenticated: true
  }
})
