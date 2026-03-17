import { describe, expect, it } from 'vitest'
import { inferAudioMimeType, isSupportedAudioType, makeObjectKey } from '../server/utils/media'

describe('media helpers', () => {
  it('infers supported audio mimes from file names', () => {
    expect(inferAudioMimeType('night-drive.mp3')).toBe('audio/mpeg')
    expect(inferAudioMimeType('focus-set.m4a')).toBe('audio/mp4')
  })

  it('accepts only the MVP audio formats', () => {
    expect(isSupportedAudioType('night-drive.mp3')).toBe(true)
    expect(isSupportedAudioType('ambient.flac')).toBe(false)
  })

  it('generates namespaced object keys', () => {
    const objectKey = makeObjectKey('Night Drive.mp3')
    expect(objectKey.startsWith('tracks/')).toBe(true)
    expect(objectKey.endsWith('-night-drive.mp3')).toBe(true)
  })
})
