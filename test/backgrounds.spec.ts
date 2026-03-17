import { describe, expect, it } from 'vitest'
import { defaultBackgroundScenes } from '../shared/backgrounds/catalog'

describe('default background scenes', () => {
  it('ships both shader and video presets', () => {
    const shaderScenes = defaultBackgroundScenes.filter(scene => scene.kind === 'shader')
    const videoScenes = defaultBackgroundScenes.filter(scene => scene.kind === 'video')

    expect(shaderScenes.length).toBeGreaterThanOrEqual(4)
    expect(videoScenes.length).toBeGreaterThanOrEqual(4)
  })

  it('keeps scene ids unique', () => {
    const ids = defaultBackgroundScenes.map(scene => scene.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
