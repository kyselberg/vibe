import { describe, expect, it } from 'vitest'
import { defaultBackgroundScenes } from '../shared/backgrounds/catalog'
import { normalizeBackgroundScene, shaderSceneRegistry, sortBackgroundScenes } from '../shared/backgrounds/registry'

describe('default background scenes', () => {
  it('ships both shader and video presets', () => {
    const shaderScenes = defaultBackgroundScenes.filter(scene => scene.kind === 'shader')
    const videoScenes = defaultBackgroundScenes.filter(scene => scene.kind === 'video')

    expect(shaderScenes.length).toBeGreaterThanOrEqual(10)
    expect(videoScenes.length).toBeGreaterThanOrEqual(4)
  })

  it('keeps scene ids unique', () => {
    const ids = defaultBackgroundScenes.map(scene => scene.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('assigns valid shader ids and categories to live scenes', () => {
    const shaderScenes = defaultBackgroundScenes
      .filter(scene => scene.kind === 'shader')
      .map(scene => normalizeBackgroundScene(scene))

    for (const scene of shaderScenes) {
      expect(scene.config.shader && shaderSceneRegistry[scene.config.shader]).toBeTruthy()
      expect(scene.config.category).toBeTruthy()
      expect(typeof scene.config.sortOrder).toBe('number')
    }
  })

  it('keeps the built-in scene order deterministic', () => {
    expect(sortBackgroundScenes(defaultBackgroundScenes).map(scene => scene.id)).toEqual([
      'neo-bloom',
      'chrome-tide',
      'prism-lattice',
      'aurora-drift',
      'velvet-fog',
      'liquid-orbit',
      'particle-haze',
      'midnight-grain',
      'signal-radar',
      'contour-drift',
      'city-rain',
      'amber-commute',
      'quiet-office',
      'night-train'
    ])
  })
})
