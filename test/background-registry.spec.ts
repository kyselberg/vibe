import { describe, expect, it } from 'vitest'
import {
  defaultBackgroundScenes,
  getMissingBackgroundScenes,
  normalizeBackgroundScene
} from '../shared/backgrounds/registry'

describe('background scene registry', () => {
  it('fills missing built-in metadata from the registry without overwriting stored values', () => {
    const normalized = normalizeBackgroundScene({
      id: 'neo-bloom',
      kind: 'shader',
      name: 'Neo Bloom',
      config: {
        shader: 'neo-gradient',
        palette: ['#ffffff', '#00ffaa', '#081018']
      }
    })

    expect(normalized.config.palette).toEqual(['#ffffff', '#00ffaa', '#081018'])
    expect(normalized.config.category).toBe('geometric')
    expect(normalized.config.sortOrder).toBe(10)
    expect(normalized.config.speed).toBe(defaultBackgroundScenes[0]?.config.speed)
    expect(normalized.config.reactivity).toBe(defaultBackgroundScenes[0]?.config.reactivity)
  })

  it('reports only missing built-in scene ids for seed reconciliation', () => {
    const missing = getMissingBackgroundScenes([
      'neo-bloom',
      'aurora-drift',
      'city-rain'
    ])

    expect(missing.some(scene => scene.id === 'neo-bloom')).toBe(false)
    expect(missing.some(scene => scene.id === 'aurora-drift')).toBe(false)
    expect(missing.some(scene => scene.id === 'city-rain')).toBe(false)
    expect(missing.some(scene => scene.id === 'prism-lattice')).toBe(true)
    expect(missing.some(scene => scene.id === 'signal-radar')).toBe(true)
    expect(new Set(missing.map(scene => scene.id)).size).toBe(missing.length)
  })
})
