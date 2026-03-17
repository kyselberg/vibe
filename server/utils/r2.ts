import { AwsClient } from 'aws4fetch'

export interface PresignedResult {
  url: string
  expiresAt: string | null
  headers: Record<string, string>
}

function encodeObjectKey(objectKey: string) {
  return objectKey.split('/').map(part => encodeURIComponent(part)).join('/')
}

function getEndpoint(config: ReturnType<typeof useRuntimeConfig>) {
  if (config.r2Endpoint) {
    return config.r2Endpoint.replace(/\/$/, '')
  }

  if (config.r2AccountId) {
    return `https://${config.r2AccountId}.r2.cloudflarestorage.com`
  }

  return ''
}

export function hasR2SigningConfig(config: ReturnType<typeof useRuntimeConfig>) {
  return Boolean(config.r2AccessKeyId && config.r2SecretAccessKey && config.r2Bucket && getEndpoint(config))
}

async function signR2Url(
  config: ReturnType<typeof useRuntimeConfig>,
  objectKey: string,
  method: 'GET' | 'PUT' | 'DELETE',
  expiresInSeconds: number,
  headers: Record<string, string> = {}
) {
  const endpoint = getEndpoint(config)
  const url = `${endpoint}/${config.r2Bucket}/${encodeObjectKey(objectKey)}`
  const requestUrl = new URL(url)
  requestUrl.searchParams.set('X-Amz-Expires', String(expiresInSeconds))

  const client = new AwsClient({
    accessKeyId: config.r2AccessKeyId,
    secretAccessKey: config.r2SecretAccessKey,
    region: config.r2Region || 'auto',
    service: 's3'
  })

  const signed = await client.sign(requestUrl.toString(), {
    method,
    headers,
    aws: {
      signQuery: true,
      service: 's3',
      region: config.r2Region || 'auto'
    }
  })

  return {
    url: signed.url,
    expiresAt: new Date(Date.now() + (expiresInSeconds * 1000)).toISOString(),
    headers
  }
}

export async function createPresignedUploadUrl(
  config: ReturnType<typeof useRuntimeConfig>,
  objectKey: string,
  contentType: string
): Promise<PresignedResult> {
  if (!hasR2SigningConfig(config)) {
    throw new Error('R2 signing is not configured')
  }

  return signR2Url(config, objectKey, 'PUT', 15 * 60, {
    'content-type': contentType
  })
}

export async function createPresignedDownloadUrl(
  config: ReturnType<typeof useRuntimeConfig>,
  objectKey: string
): Promise<PresignedResult> {
  if (!hasR2SigningConfig(config)) {
    throw new Error('R2 signing is not configured')
  }

  return signR2Url(config, objectKey, 'GET', 24 * 60 * 60)
}

export async function deleteObject(
  config: ReturnType<typeof useRuntimeConfig>,
  objectKey: string
): Promise<void> {
  if (!hasR2SigningConfig(config)) {
    throw new Error('R2 signing is not configured')
  }

  const endpoint = getEndpoint(config)
  const url = `${endpoint}/${config.r2Bucket}/${encodeObjectKey(objectKey)}`

  const client = new AwsClient({
    accessKeyId: config.r2AccessKeyId,
    secretAccessKey: config.r2SecretAccessKey,
    region: config.r2Region || 'auto',
    service: 's3'
  })

  const signed = await client.sign(url, {
    method: 'DELETE',
    aws: {
      service: 's3',
      region: config.r2Region || 'auto'
    }
  })

  const response = await fetch(signed.url, {
    method: 'DELETE',
    headers: signed.headers
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete object: ${response.statusText}`)
  }
}

