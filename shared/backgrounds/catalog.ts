import type { BackgroundScene } from '../types/vibe'

export const defaultBackgroundScenes: BackgroundScene[] = [
  {
    id: 'neo-bloom',
    kind: 'shader',
    name: 'Neo Bloom',
    config: {
      shader: 'neo-gradient',
      palette: ['#52f1cf', '#ff8952', '#102449'],
      intensity: 0.82,
      glow: 0.58,
      grain: 0.16
    }
  },
  {
    id: 'aurora-drift',
    kind: 'shader',
    name: 'Aurora Drift',
    config: {
      shader: 'aurora',
      palette: ['#8ff7d3', '#b4f0ff', '#0f1d33'],
      intensity: 0.74,
      glow: 0.66,
      grain: 0.08
    }
  },
  {
    id: 'velvet-fog',
    kind: 'shader',
    name: 'Velvet Fog',
    config: {
      shader: 'fog',
      palette: ['#f5b971', '#d95d39', '#1a0f1b'],
      intensity: 0.64,
      glow: 0.28,
      grain: 0.18
    }
  },
  {
    id: 'particle-haze',
    kind: 'shader',
    name: 'Particle Haze',
    config: {
      shader: 'particles',
      palette: ['#f1ff7a', '#76e7d6', '#101f31'],
      intensity: 0.78,
      glow: 0.52,
      grain: 0.14
    }
  },
  {
    id: 'midnight-grain',
    kind: 'shader',
    name: 'Midnight Grain',
    config: {
      shader: 'grain',
      palette: ['#9bd8ff', '#6583ff', '#090d18'],
      intensity: 0.54,
      glow: 0.22,
      grain: 0.34
    }
  },
  {
    id: 'chrome-tide',
    kind: 'shader',
    name: 'Chrome Tide',
    config: {
      shader: 'tidal',
      palette: ['#b1fff4', '#86b4ff', '#091223'],
      intensity: 0.7,
      glow: 0.5,
      grain: 0.11
    }
  },
  {
    id: 'city-rain',
    kind: 'video',
    name: 'City Rain',
    videoKey: 'backgrounds/city-rain.mp4',
    config: {
      localUrl: '/loops/city-rain.mp4',
      overlay: 'rgba(12, 18, 34, 0.42)'
    }
  },
  {
    id: 'amber-commute',
    kind: 'video',
    name: 'Amber Commute',
    videoKey: 'backgrounds/amber-commute.mp4',
    config: {
      localUrl: '/loops/amber-commute.mp4',
      overlay: 'rgba(52, 24, 8, 0.28)'
    }
  },
  {
    id: 'quiet-office',
    kind: 'video',
    name: 'Quiet Office',
    videoKey: 'backgrounds/quiet-office.mp4',
    config: {
      localUrl: '/loops/quiet-office.mp4',
      overlay: 'rgba(6, 26, 26, 0.32)'
    }
  },
  {
    id: 'night-train',
    kind: 'video',
    name: 'Night Train',
    videoKey: 'backgrounds/night-train.mp4',
    config: {
      localUrl: '/loops/night-train.mp4',
      overlay: 'rgba(12, 8, 28, 0.38)'
    }
  }
]
