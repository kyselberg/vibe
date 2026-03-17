<script setup lang="ts">
import { getBackgroundCategoryMeta, getBackgroundShaderMode } from '~~/shared/backgrounds/registry'

const vibe = useVibeStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const videoVisible = ref(false)
const webglReady = ref(false)

let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let animationFrame = 0
let uniforms = {
  resolution: null as WebGLUniformLocation | null,
  time: null as WebGLUniformLocation | null,
  level: null as WebGLUniformLocation | null,
  intensity: null as WebGLUniformLocation | null,
  glow: null as WebGLUniformLocation | null,
  grain: null as WebGLUniformLocation | null,
  speed: null as WebGLUniformLocation | null,
  scale: null as WebGLUniformLocation | null,
  density: null as WebGLUniformLocation | null,
  contrast: null as WebGLUniformLocation | null,
  reactivity: null as WebGLUniformLocation | null,
  mode: null as WebGLUniformLocation | null,
  colorA: null as WebGLUniformLocation | null,
  colorB: null as WebGLUniformLocation | null,
  colorC: null as WebGLUniformLocation | null
}

const fallbackStyle = computed(() => {
  const palette = vibe.activeScene?.config.palette || ['#4ef0cb', '#ff8f51', '#102038']
  return {
    background: `radial-gradient(circle at top left, ${palette[0]}, transparent 42%), linear-gradient(135deg, ${palette[2]}, ${palette[1]})`
  }
})

const stageShellClasses = computed(() => {
  const categoryMeta = getBackgroundCategoryMeta(vibe.activeScene?.config.category, vibe.activeScene?.kind ?? 'shader')

  return [
    `stage-shell--${categoryMeta.overlay}`,
    {
      'stage-shell--video-active': vibe.activeScene?.kind === 'video'
    }
  ]
})

function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '')
  const value = sanitized.length === 3
    ? sanitized.split('').map(char => char + char).join('')
    : sanitized

  const number = Number.parseInt(value, 16)
  return [
    ((number >> 16) & 255) / 255,
    ((number >> 8) & 255) / 255,
    (number & 255) / 255
  ]
}

function compileShader(glContext: WebGLRenderingContext, type: number, source: string) {
  const shader = glContext.createShader(type)
  if (!shader) {
    return null
  }

  glContext.shaderSource(shader, source)
  glContext.compileShader(shader)

  if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
    console.error(glContext.getShaderInfoLog(shader))
    glContext.deleteShader(shader)
    return null
  }

  return shader
}

function initWebgl() {
  const canvas = canvasRef.value
  if (!canvas) {
    return
  }

  gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true
  })

  if (!gl) {
    webglReady.value = false
    return
  }

  const vertexSource = `
    attribute vec2 position;
    varying vec2 vUv;

    void main() {
      vUv = (position + 1.0) * 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `

  const fragmentSource = `
    precision mediump float;

    const float PI = 3.141592653589793;
    const float TAU = 6.283185307179586;

    varying vec2 vUv;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uLevel;
    uniform float uIntensity;
    uniform float uGlow;
    uniform float uGrain;
    uniform float uSpeed;
    uniform float uScale;
    uniform float uDensity;
    uniform float uContrast;
    uniform float uReactivity;
    uniform int uMode;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.03;
        amplitude *= 0.55;
      }
      return value;
    }

    vec2 rotate2d(vec2 p, float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return mat2(c, -s, s, c) * p;
    }

    float angleDistance(float a, float b) {
      float delta = abs(a - b);
      return min(delta, TAU - delta);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / max(1.0, min(uResolution.x, uResolution.y));
      float drive = uLevel * (0.55 + uReactivity * 1.6);
      float t = uTime * (0.08 + uSpeed * 0.34);
      float scaledIntensity = 0.9 + uIntensity * 1.2;
      float scale = 0.75 + uScale * 2.8;
      float density = 1.0 + uDensity * 5.0;
      float contrastBoost = 0.85 + uContrast * 1.15;

      vec2 flow = uv * scale;
      vec2 warp = flow;
      warp.x += sin((flow.y + t) * 2.4) * 0.12;
      warp.y += cos((flow.x - t) * 2.1) * 0.11;

      float fieldA = fbm(warp * (1.15 + scaledIntensity));
      float fieldB = fbm((warp + vec2(1.8, -1.2)) * (1.45 + drive * 1.8));
      float fieldC = fbm((warp * 2.3) - vec2(t * 1.4, t));

      float shape = smoothstep(0.2, 0.95, fieldA + fieldB * 0.55 + drive * 0.18);
      float shimmer = smoothstep(0.22, 0.88, fieldC + fieldA * 0.35);
      float halo = smoothstep(0.4, 1.1, fieldB + drive * 0.4);

      if (uMode == 1) {
        float ribbons = sin((flow.x + fieldA * 1.8) * (1.6 + density * 0.25) + t * (1.4 + drive * 3.0)) * 0.5 + 0.5;
        float haze = fbm(vec2(flow.x * 1.05, flow.y * 0.6 + t * 0.45));
        shape = smoothstep(0.18, 0.9, ribbons * 0.55 + haze * 0.68 + drive * 0.2);
        shimmer = smoothstep(0.32, 0.95, ribbons + fieldB * 0.45);
        halo = smoothstep(0.22, 0.96, haze + ribbons * 0.35);
      } else if (uMode == 2) {
        float mist = fbm(warp * 0.8 + vec2(t * 0.7, -t * 0.4));
        shape = smoothstep(0.22, 0.84, mist * 0.78 + fieldB * 0.35);
        shimmer = smoothstep(0.35, 0.88, fieldC * 0.5 + mist * 0.42);
        halo = smoothstep(0.18, 0.96, mist + drive * 0.25);
      } else if (uMode == 3) {
        vec2 particleUv = rotate2d(flow, t * 0.12);
        float particleField = fbm(particleUv * (1.55 + density * 0.35) + vec2(t * 1.2, -t * 0.7));
        float sparks = step(0.82 - drive * 0.12, fract(particleField * (7.0 + density) + t * (1.5 + drive * 4.0)));
        shape = smoothstep(0.18, 0.9, fieldA * 0.58 + fieldB * 0.32);
        shimmer = max(sparks, smoothstep(0.35, 0.9, fieldC * 0.55 + fieldB * 0.2));
        halo = sparks * (0.4 + uGlow * 0.8);
      } else if (uMode == 4) {
        float staticNoise = noise((uv + vUv) * uResolution.xy * 0.004 + vec2(t * 0.3, t));
        shape = smoothstep(0.3, 0.85, fieldA * 0.42 + fieldB * 0.22);
        shimmer = staticNoise * 0.45 + smoothstep(0.4, 0.9, fieldB * 0.32);
        halo = smoothstep(0.16, 0.74, staticNoise + fieldA * 0.18);
      } else if (uMode == 5) {
        float wave = sin(flow.x * (4.0 + density * 0.7) - t * (2.0 + drive * 4.0) + fieldA * 1.25);
        float undercurrent = sin(flow.y * (2.2 + density * 0.35) + t * 1.15);
        shape = smoothstep(-0.42, 0.92, wave * 0.45 + undercurrent * 0.24 + fieldB * 0.52);
        shimmer = smoothstep(-0.2, 0.85, wave * 0.55 + fieldC * 0.45);
        halo = smoothstep(-0.05, 0.82, wave + undercurrent + drive * 0.5);
      } else if (uMode == 6) {
        vec2 prismUv = rotate2d(flow * (1.05 + uScale * 0.7), PI * 0.25);
        vec2 cell = abs(fract(prismUv * (1.45 + density * 0.32)) - 0.5);
        float lattice = 1.0 - smoothstep(0.16, 0.23, cell.x + cell.y);
        float bands = 1.0 - smoothstep(0.15, 0.42, abs(sin((uv.x - uv.y) * (5.5 + density) + t * (2.6 + drive * 5.0))));
        float prismGlow = fbm(prismUv * 0.8 + vec2(t * 0.7, -t * 0.45));
        shape = clamp(lattice * 0.78 + bands * 0.46 + prismGlow * 0.28, 0.0, 1.0);
        shimmer = clamp(lattice + bands * (0.38 + drive * 1.4), 0.0, 1.0);
        halo = bands * (0.32 + uGlow * 0.55);
      } else if (uMode == 7) {
        float blobs = 0.0;
        float highlights = 0.0;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float orbit = t * (0.72 + fi * 0.12) + fi * (PI * 0.5);
          vec2 center = vec2(
            cos(orbit * (1.0 + fi * 0.08)),
            sin(orbit * (0.82 + fi * 0.12))
          ) * (0.22 + fi * 0.06);
          float radius = 0.16 + uDensity * 0.05 + drive * 0.07 + fi * 0.01;
          float distanceToBlob = length(uv - center);
          blobs += (radius * radius) / max(0.02, distanceToBlob * distanceToBlob);
          highlights += smoothstep(radius * 1.1, 0.0, distanceToBlob);
        }
        shape = smoothstep(1.25, 2.55, blobs);
        shimmer = smoothstep(0.85, 2.1, highlights + fieldC * 0.42);
        halo = smoothstep(1.5, 2.9, blobs) * (0.25 + uGlow * 0.55);
      } else if (uMode == 8) {
        float radius = length(uv);
        float angle = atan(uv.y, uv.x);
        float sweepAngle = t * (1.4 + uSpeed * 1.8);
        float sweep = exp(-angleDistance(angle, sweepAngle) * (9.0 - drive * 2.5)) * smoothstep(1.08, 0.02, radius);
        float ringPattern = abs(fract(radius * (4.0 + density * 0.4) - t * 0.28) - 0.5);
        float rings = 1.0 - smoothstep(0.0, 0.08 + drive * 0.06, ringPattern);
        float blipField = hash(floor(rotate2d(uv, 0.28) * (6.0 + density * 0.45)));
        float blips = step(0.86 - drive * 0.18, blipField) * smoothstep(0.24, 0.02, abs(ringPattern - 0.12));
        shape = clamp(rings * 0.44 + sweep * 0.92, 0.0, 1.0);
        shimmer = clamp(sweep + blips + rings * 0.22, 0.0, 1.0);
        halo = sweep * 0.82 + blips * 0.62;
      } else if (uMode == 9) {
        vec2 contourUv = rotate2d(flow, 0.22);
        float terrain = fbm(contourUv * (0.9 + uScale * 0.55) + vec2(t * 0.45, -t * 0.22));
        float contourA = sin(terrain * (7.0 + density * 1.5) + contourUv.y * (4.6 + density * 0.7) - t * (1.5 + drive * 3.2));
        float contourB = sin(contourUv.x * (7.8 + density * 0.95) + terrain * 6.0 + t * 0.8);
        float lines = 1.0 - smoothstep(0.52 - drive * 0.18, 0.95, abs(contourA));
        float moire = 1.0 - smoothstep(0.42, 0.92, abs(contourA * 0.65 + contourB * 0.35));
        shape = clamp(lines * 0.62 + terrain * 0.34, 0.0, 1.0);
        shimmer = clamp(moire * (0.48 + drive) + lines * 0.24, 0.0, 1.0);
        halo = moire * 0.34;
      }

      vec3 base = mix(uColorC, uColorA, clamp(shape, 0.0, 1.0));
      vec3 accent = mix(uColorB, uColorA, clamp(shimmer, 0.0, 1.0));
      vec3 color = mix(base, accent, 0.38 + uGlow * 0.34);
      color += halo * (0.05 + uGlow * 0.26) * mix(uColorB, uColorA, 0.45);

      float beam = smoothstep(0.7, -0.08, length(uv - vec2(0.0, 0.18 - drive * 0.1)));
      color += beam * (0.05 + uGlow * 0.14) * uColorB;

      float vignette = smoothstep(1.72, 0.18, length(uv));
      color *= vignette;

      color = clamp((color - 0.5) * contrastBoost + 0.5, 0.0, 1.0);

      float grain = (hash(gl_FragCoord.xy + uTime) - 0.5) * uGrain;
      color += grain;

      gl_FragColor = vec4(color, 1.0);
    }
  `

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertexShader || !fragmentShader) {
    webglReady.value = false
    return
  }

  program = gl.createProgram()
  if (!program) {
    webglReady.value = false
    return
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    webglReady.value = false
    return
  }

  gl.useProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    1, 1
  ]), gl.STATIC_DRAW)

  const positionLocation = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  uniforms = {
    resolution: gl.getUniformLocation(program, 'uResolution'),
    time: gl.getUniformLocation(program, 'uTime'),
    level: gl.getUniformLocation(program, 'uLevel'),
    intensity: gl.getUniformLocation(program, 'uIntensity'),
    glow: gl.getUniformLocation(program, 'uGlow'),
    grain: gl.getUniformLocation(program, 'uGrain'),
    speed: gl.getUniformLocation(program, 'uSpeed'),
    scale: gl.getUniformLocation(program, 'uScale'),
    density: gl.getUniformLocation(program, 'uDensity'),
    contrast: gl.getUniformLocation(program, 'uContrast'),
    reactivity: gl.getUniformLocation(program, 'uReactivity'),
    mode: gl.getUniformLocation(program, 'uMode'),
    colorA: gl.getUniformLocation(program, 'uColorA'),
    colorB: gl.getUniformLocation(program, 'uColorB'),
    colorC: gl.getUniformLocation(program, 'uColorC')
  }

  webglReady.value = true
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas || !gl) {
    return
  }

  const width = canvas.clientWidth * window.devicePixelRatio
  const height = canvas.clientHeight * window.devicePixelRatio

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height)
  }
}

function setUniform1f(location: WebGLUniformLocation | null, value: number) {
  if (gl && location) {
    gl.uniform1f(location, value)
  }
}

function setUniform1i(location: WebGLUniformLocation | null, value: number) {
  if (gl && location) {
    gl.uniform1i(location, value)
  }
}

function setUniform2f(location: WebGLUniformLocation | null, x: number, y: number) {
  if (gl && location) {
    gl.uniform2f(location, x, y)
  }
}

function setUniform3f(location: WebGLUniformLocation | null, x: number, y: number, z: number) {
  if (gl && location) {
    gl.uniform3f(location, x, y, z)
  }
}

function animate() {
  if (!gl || !program || !webglReady.value) {
    return
  }

  resizeCanvas()

  const scene = vibe.activeScene
  const config = scene?.config ?? {}
  const palette = config.palette || ['#4ef0cb', '#ff8f51', '#102038']
  const colorA = hexToRgb(palette[0] || '#4ef0cb')
  const colorB = hexToRgb(palette[1] || '#ff8f51')
  const colorC = hexToRgb(palette[2] || '#102038')

  setUniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height)
  setUniform1f(uniforms.time, performance.now() * 0.001)
  setUniform1f(uniforms.level, vibe.audioLevel)
  setUniform1f(uniforms.intensity, config.intensity ?? 0.72)
  setUniform1f(uniforms.glow, config.glow ?? 0.45)
  setUniform1f(uniforms.grain, config.grain ?? 0.14)
  setUniform1f(uniforms.speed, config.speed ?? 0.55)
  setUniform1f(uniforms.scale, config.scale ?? 0.5)
  setUniform1f(uniforms.density, config.density ?? 0.5)
  setUniform1f(uniforms.contrast, config.contrast ?? 0.7)
  setUniform1f(uniforms.reactivity, config.reactivity ?? 0.7)
  setUniform1i(uniforms.mode, getBackgroundShaderMode(config.shader))
  setUniform3f(uniforms.colorA, colorA[0], colorA[1], colorA[2])
  setUniform3f(uniforms.colorB, colorB[0], colorB[1], colorB[2])
  setUniform3f(uniforms.colorC, colorC[0], colorC[1], colorC[2])

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  animationFrame = requestAnimationFrame(animate)
}

async function loadVideoScene() {
  const scene = vibe.activeScene
  if (!scene || scene.kind !== 'video') {
    videoVisible.value = false
    return
  }

  const url = scene.playbackUrl || await vibe.refreshBackgroundPlayback(scene.id)
  if (videoRef.value && url) {
    videoVisible.value = false
    videoRef.value.src = url
    videoRef.value.load()
  }
}

function onVideoLoaded() {
  videoVisible.value = true
  videoRef.value?.play().catch(() => undefined)
}

async function onVideoError() {
  const scene = vibe.activeScene
  if (!scene || scene.kind !== 'video') {
    return
  }

  const refreshedUrl = await vibe.refreshBackgroundPlayback(scene.id)
  if (videoRef.value && refreshedUrl) {
    videoVisible.value = false
    videoRef.value.src = refreshedUrl
    videoRef.value.load()
  }
}

onMounted(() => {
  initWebgl()
  animate()
  loadVideoScene()
  window.addEventListener('resize', resizeCanvas)
})

watch(() => vibe.activeScene?.id, () => {
  loadVideoScene()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  window.removeEventListener('resize', resizeCanvas)

  if (gl && program) {
    gl.deleteProgram(program)
  }
})
</script>

<template>
  <div class="stage-shell" :class="stageShellClasses" :style="fallbackStyle">
    <canvas
      ref="canvasRef"
      class="stage-shell__canvas"
      :class="{ 'is-hidden': !webglReady }"
    />

    <video
      ref="videoRef"
      class="stage-shell__video"
      muted
      loop
      playsinline
      preload="auto"
      :class="{ 'is-visible': vibe.activeScene?.kind === 'video' && videoVisible }"
      @loadeddata="onVideoLoaded"
      @error="onVideoError"
    />

    <div class="stage-shell__wash" />
    <div class="stage-shell__grain" />
    <div class="stage-shell__grid" />
  </div>
</template>
