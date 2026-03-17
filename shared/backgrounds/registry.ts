import type { BackgroundKind, BackgroundScene, BackgroundSceneCategory, BackgroundSceneConfig } from '../types/vibe'

export interface BackgroundCategoryMeta {
  label: string
  order: number
  overlay: BackgroundSceneCategory
}

export interface ShaderSceneMeta {
  mode: number
  defaults: BackgroundSceneConfig
}

export interface BackgroundSceneGroup<TScene extends BackgroundScene = BackgroundScene> {
  category: BackgroundSceneCategory
  label: string
  scenes: TScene[]
}

export const backgroundCategoryRegistry = {
  geometric: {
    label: 'Geometric',
    order: 0,
    overlay: 'geometric'
  },
  organic: {
    label: 'Organic',
    order: 1,
    overlay: 'organic'
  },
  signal: {
    label: 'Signal',
    order: 2,
    overlay: 'signal'
  },
  video: {
    label: 'Loops',
    order: 3,
    overlay: 'video'
  }
} satisfies Record<BackgroundSceneCategory, BackgroundCategoryMeta>

export const shaderSceneRegistry = {
  'neo-gradient': {
    mode: 0,
    defaults: {
      category: 'geometric',
      intensity: 0.82,
      glow: 0.58,
      grain: 0.16,
      speed: 0.56,
      scale: 0.48,
      density: 0.52,
      contrast: 0.72,
      reactivity: 0.78
    }
  },
  aurora: {
    mode: 1,
    defaults: {
      category: 'organic',
      intensity: 0.74,
      glow: 0.66,
      grain: 0.08,
      speed: 0.38,
      scale: 0.74,
      density: 0.34,
      contrast: 0.58,
      reactivity: 0.64
    }
  },
  fog: {
    mode: 2,
    defaults: {
      category: 'organic',
      intensity: 0.64,
      glow: 0.28,
      grain: 0.18,
      speed: 0.28,
      scale: 0.78,
      density: 0.28,
      contrast: 0.46,
      reactivity: 0.48
    }
  },
  particles: {
    mode: 3,
    defaults: {
      category: 'signal',
      intensity: 0.78,
      glow: 0.52,
      grain: 0.14,
      speed: 0.72,
      scale: 0.52,
      density: 0.86,
      contrast: 0.76,
      reactivity: 0.88
    }
  },
  grain: {
    mode: 4,
    defaults: {
      category: 'signal',
      intensity: 0.54,
      glow: 0.22,
      grain: 0.34,
      speed: 0.24,
      scale: 0.44,
      density: 0.38,
      contrast: 0.62,
      reactivity: 0.42
    }
  },
  tidal: {
    mode: 5,
    defaults: {
      category: 'geometric',
      intensity: 0.7,
      glow: 0.5,
      grain: 0.11,
      speed: 0.66,
      scale: 0.62,
      density: 0.48,
      contrast: 0.68,
      reactivity: 0.72
    }
  },
  'prism-lattice': {
    mode: 6,
    defaults: {
      category: 'geometric',
      intensity: 0.76,
      glow: 0.72,
      grain: 0.08,
      speed: 0.82,
      scale: 0.62,
      density: 0.84,
      contrast: 0.86,
      reactivity: 0.9
    }
  },
  'liquid-orbit': {
    mode: 7,
    defaults: {
      category: 'organic',
      intensity: 0.8,
      glow: 0.7,
      grain: 0.1,
      speed: 0.54,
      scale: 0.7,
      density: 0.66,
      contrast: 0.74,
      reactivity: 0.82
    }
  },
  'signal-radar': {
    mode: 8,
    defaults: {
      category: 'signal',
      intensity: 0.72,
      glow: 0.64,
      grain: 0.12,
      speed: 0.78,
      scale: 0.58,
      density: 0.78,
      contrast: 0.88,
      reactivity: 0.94
    }
  },
  'contour-drift': {
    mode: 9,
    defaults: {
      category: 'signal',
      intensity: 0.68,
      glow: 0.46,
      grain: 0.16,
      speed: 0.48,
      scale: 0.76,
      density: 0.72,
      contrast: 0.82,
      reactivity: 0.68
    }
  }
} satisfies Record<string, ShaderSceneMeta>

type ShaderSceneId = keyof typeof shaderSceneRegistry
type ShaderSceneCategory = Exclude<BackgroundSceneCategory, 'video'>

function createShaderScene(input: {
  id: string
  name: string
  shader: ShaderSceneId
  palette: [string, string, string]
  category: ShaderSceneCategory
  sortOrder: number
  overrides?: Partial<BackgroundSceneConfig>
}): BackgroundScene {
  return {
    id: input.id,
    kind: 'shader',
    name: input.name,
    config: {
      shader: input.shader,
      palette: [...input.palette],
      ...shaderSceneRegistry[input.shader].defaults,
      category: input.category,
      sortOrder: input.sortOrder,
      ...input.overrides
    }
  }
}

function createVideoScene(input: {
  id: string
  name: string
  videoKey: string
  localUrl: string
  overlay: string
  sortOrder: number
}): BackgroundScene {
  return {
    id: input.id,
    kind: 'video',
    name: input.name,
    videoKey: input.videoKey,
    config: {
      category: 'video',
      sortOrder: input.sortOrder,
      localUrl: input.localUrl,
      overlay: input.overlay
    }
  }
}

export const defaultBackgroundScenes: BackgroundScene[] = [
  createShaderScene({
    id: 'neo-bloom',
    name: 'Neo Bloom',
    shader: 'neo-gradient',
    palette: ['#52f1cf', '#ff8952', '#102449'],
    category: 'geometric',
    sortOrder: 10
  }),
  createShaderScene({
    id: 'chrome-tide',
    name: 'Chrome Tide',
    shader: 'tidal',
    palette: ['#b1fff4', '#86b4ff', '#091223'],
    category: 'geometric',
    sortOrder: 20
  }),
  createShaderScene({
    id: 'prism-lattice',
    name: 'Prism Lattice',
    shader: 'prism-lattice',
    palette: ['#9df6ff', '#f3a6ff', '#07101f'],
    category: 'geometric',
    sortOrder: 30
  }),
  createShaderScene({
    id: 'aurora-drift',
    name: 'Aurora Drift',
    shader: 'aurora',
    palette: ['#8ff7d3', '#b4f0ff', '#0f1d33'],
    category: 'organic',
    sortOrder: 10
  }),
  createShaderScene({
    id: 'velvet-fog',
    name: 'Velvet Fog',
    shader: 'fog',
    palette: ['#f5b971', '#d95d39', '#1a0f1b'],
    category: 'organic',
    sortOrder: 20
  }),
  createShaderScene({
    id: 'liquid-orbit',
    name: 'Liquid Orbit',
    shader: 'liquid-orbit',
    palette: ['#8af3d5', '#7cb7ff', '#09192d'],
    category: 'organic',
    sortOrder: 30
  }),
  createShaderScene({
    id: 'particle-haze',
    name: 'Particle Haze',
    shader: 'particles',
    palette: ['#f1ff7a', '#76e7d6', '#101f31'],
    category: 'signal',
    sortOrder: 10
  }),
  createShaderScene({
    id: 'midnight-grain',
    name: 'Midnight Grain',
    shader: 'grain',
    palette: ['#9bd8ff', '#6583ff', '#090d18'],
    category: 'signal',
    sortOrder: 20
  }),
  createShaderScene({
    id: 'signal-radar',
    name: 'Signal Radar',
    shader: 'signal-radar',
    palette: ['#90ffd7', '#64d6ff', '#07111d'],
    category: 'signal',
    sortOrder: 30
  }),
  createShaderScene({
    id: 'contour-drift',
    name: 'Contour Drift',
    shader: 'contour-drift',
    palette: ['#ffc48c', '#8bd0ff', '#0a1222'],
    category: 'signal',
    sortOrder: 40
  }),
  createVideoScene({
    id: 'city-rain',
    name: 'City Rain',
    videoKey: 'backgrounds/city-rain.mp4',
    localUrl: '/loops/city-rain.mp4',
    overlay: 'rgba(12, 18, 34, 0.42)',
    sortOrder: 10
  }),
  createVideoScene({
    id: 'amber-commute',
    name: 'Amber Commute',
    videoKey: 'backgrounds/amber-commute.mp4',
    localUrl: '/loops/amber-commute.mp4',
    overlay: 'rgba(52, 24, 8, 0.28)',
    sortOrder: 20
  }),
  createVideoScene({
    id: 'quiet-office',
    name: 'Quiet Office',
    videoKey: 'backgrounds/quiet-office.mp4',
    localUrl: '/loops/quiet-office.mp4',
    overlay: 'rgba(6, 26, 26, 0.32)',
    sortOrder: 30
  }),
  createVideoScene({
    id: 'night-train',
    name: 'Night Train',
    videoKey: 'backgrounds/night-train.mp4',
    localUrl: '/loops/night-train.mp4',
    overlay: 'rgba(12, 8, 28, 0.38)',
    sortOrder: 40
  })
]

const builtInBackgroundSceneMap = new Map(defaultBackgroundScenes.map(scene => [scene.id, scene]))

function isKnownCategory(category: string | null | undefined): category is BackgroundSceneCategory {
  return Boolean(category && Object.prototype.hasOwnProperty.call(backgroundCategoryRegistry, category))
}

function isKnownShader(shader: string | null | undefined): shader is ShaderSceneId {
  return Boolean(shader && Object.prototype.hasOwnProperty.call(shaderSceneRegistry, shader))
}

export function resolveBackgroundSceneCategory(
  category: string | null | undefined,
  kind: BackgroundKind = 'shader'
): BackgroundSceneCategory {
  if (isKnownCategory(category)) {
    return category
  }

  return kind === 'video' ? 'video' : 'geometric'
}

export function getBackgroundCategoryMeta(category: string | null | undefined, kind: BackgroundKind = 'shader') {
  return backgroundCategoryRegistry[resolveBackgroundSceneCategory(category, kind)]
}

export function getBackgroundShaderMode(shader: string | null | undefined) {
  return isKnownShader(shader) ? shaderSceneRegistry[shader].mode : 0
}

export function normalizeBackgroundSceneConfig(scene: Pick<BackgroundScene, 'id' | 'kind' | 'config'>): BackgroundSceneConfig {
  const builtInConfig = builtInBackgroundSceneMap.get(scene.id)?.config ?? {}
  const shaderId = scene.config.shader || builtInConfig.shader
  const shaderDefaults = scene.kind === 'shader' && isKnownShader(shaderId)
    ? shaderSceneRegistry[shaderId].defaults
    : {}

  const mergedConfig: BackgroundSceneConfig = {
    ...shaderDefaults,
    ...builtInConfig,
    ...scene.config
  }

  return {
    ...mergedConfig,
    category: resolveBackgroundSceneCategory(mergedConfig.category, scene.kind),
    sortOrder: typeof mergedConfig.sortOrder === 'number' ? mergedConfig.sortOrder : 999
  }
}

export function normalizeBackgroundScene<TScene extends BackgroundScene>(scene: TScene): TScene {
  return {
    ...scene,
    config: normalizeBackgroundSceneConfig(scene)
  }
}

export function compareBackgroundScenes(left: BackgroundScene, right: BackgroundScene) {
  const leftConfig = normalizeBackgroundSceneConfig(left)
  const rightConfig = normalizeBackgroundSceneConfig(right)
  const categoryDelta = getBackgroundCategoryMeta(leftConfig.category, left.kind).order
    - getBackgroundCategoryMeta(rightConfig.category, right.kind).order

  if (categoryDelta !== 0) {
    return categoryDelta
  }

  const sortOrderDelta = (leftConfig.sortOrder ?? 999) - (rightConfig.sortOrder ?? 999)
  if (sortOrderDelta !== 0) {
    return sortOrderDelta
  }

  const nameDelta = left.name.localeCompare(right.name)
  if (nameDelta !== 0) {
    return nameDelta
  }

  return left.id.localeCompare(right.id)
}

export function sortBackgroundScenes<TScene extends BackgroundScene>(scenes: TScene[]) {
  return [...scenes].sort(compareBackgroundScenes)
}

export function groupBackgroundScenes<TScene extends BackgroundScene>(scenes: TScene[]): BackgroundSceneGroup<TScene>[] {
  const groups = new Map<BackgroundSceneCategory, BackgroundSceneGroup<TScene>>()

  for (const scene of sortBackgroundScenes(scenes)) {
    const normalizedScene = normalizeBackgroundScene(scene)
    const category = resolveBackgroundSceneCategory(normalizedScene.config.category, normalizedScene.kind)
    const existingGroup = groups.get(category)

    if (existingGroup) {
      existingGroup.scenes.push(normalizedScene)
      continue
    }

    groups.set(category, {
      category,
      label: getBackgroundCategoryMeta(category, normalizedScene.kind).label,
      scenes: [normalizedScene]
    })
  }

  return Array.from(groups.values())
}

export function getMissingBackgroundScenes(existingSceneIds: Iterable<string>) {
  const existingIds = new Set(existingSceneIds)
  return defaultBackgroundScenes.filter(scene => !existingIds.has(scene.id))
}
