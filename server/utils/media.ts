import { extname } from 'node:path'

export const supportedAudioMimeTypes = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/ogg; codecs=vorbis'
])

const extensionMimeMap: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg'
}

export function inferAudioMimeType(filename: string, fallback = '') {
  const extension = extname(filename).toLowerCase()
  return extensionMimeMap[extension] || fallback || 'application/octet-stream'
}

export function isSupportedAudioType(filename: string, mimeType = '') {
  const inferred = inferAudioMimeType(filename, mimeType)
  return supportedAudioMimeTypes.has(inferred)
}

export function sanitizeFilename(filename: string) {
  return filename
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export function makeObjectKey(filename: string) {
  const clean = sanitizeFilename(filename || 'track')
  const month = new Date().toISOString().slice(0, 7)
  return `tracks/${month}/${crypto.randomUUID()}-${clean}`
}
