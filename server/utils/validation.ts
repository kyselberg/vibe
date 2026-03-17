import { createError, type H3Event } from 'h3'
import { ZodError, type ZodType } from 'zod'

export async function readValidatedJsonBody<T>(event: H3Event, schema: ZodType<T>) {
  try {
    return schema.parse(await readBody(event))
  } catch (error) {
    if (error instanceof ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.issues.map(issue => issue.message).join(', ')
      })
    }

    throw error
  }
}
