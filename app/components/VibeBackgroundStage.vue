<script setup lang="ts">
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
  mode: null as WebGLUniformLocation | null,
  colorA: null as WebGLUniformLocation | null,
  colorB: null as WebGLUniformLocation | null,
  colorC: null as WebGLUniformLocation | null
}

const sceneModeMap: Record<string, number> = {
  'neo-gradient': 0,
  aurora: 1,
  fog: 2,
  particles: 3,
  grain: 4,
  tidal: 5
}

const fallbackStyle = computed(() => {
  const palette = vibe.activeScene?.config.palette || ['#4ef0cb', '#ff8f51', '#102038']
  return {
    background: `radial-gradient(circle at top left, ${palette[0]}, transparent 42%), linear-gradient(135deg, ${palette[2]}, ${palette[1]})`
  }
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

    varying vec2 vUv;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uLevel;
    uniform float uIntensity;
    uniform float uGlow;
    uniform float uGrain;
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

    void main() {
      vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
      float t = uTime * 0.12;
      float audioPush = 0.12 + (uLevel * 1.15);

      vec2 warp = uv;
      warp.x += sin((uv.y + t) * 2.4) * 0.12;
      warp.y += cos((uv.x - t) * 2.1) * 0.11;

      float fieldA = fbm(warp * (1.2 + uIntensity));
      float fieldB = fbm((warp + vec2(1.8, -1.2)) * (1.8 + audioPush));
      float fieldC = fbm((warp * 2.5) - vec2(t * 1.4, t));

      float shape = smoothstep(0.2, 0.95, fieldA + fieldB * 0.55 + audioPush * 0.15);
      float shimmer = smoothstep(0.22, 0.88, fieldC + fieldA * 0.35);

      if (uMode == 1) {
        shape = smoothstep(0.08, 0.84, fieldA + sin((uv.y + t) * 3.0) * 0.35 + audioPush * 0.2);
      } else if (uMode == 2) {
        shape = smoothstep(0.16, 0.82, fieldA * 0.7 + fieldB * 0.45 + fieldC * 0.2);
        shimmer *= 0.65;
      } else if (uMode == 3) {
        float sparks = step(0.87, fract(fieldB * 5.0 + t * 0.35));
        shape = mix(shape, sparks, 0.35 + uLevel * 0.2);
      } else if (uMode == 4) {
        shape = smoothstep(0.3, 0.85, fieldA * 0.45 + fieldB * 0.25);
        shimmer = noise(uv * uResolution.xy * 0.01 + t) * 0.35;
      } else if (uMode == 5) {
        shape = smoothstep(0.14, 0.92, fieldA + sin((uv.x * 4.0) - t * 2.2) * 0.22);
      }

      vec3 base = mix(uColorC, uColorA, clamp(shape, 0.0, 1.0));
      vec3 accent = mix(uColorB, uColorA, clamp(shimmer, 0.0, 1.0));
      vec3 color = mix(base, accent, 0.45 + uGlow * 0.25);

      float beam = smoothstep(0.55, -0.15, length(uv - vec2(0.0, 0.2 - audioPush * 0.1)));
      color += beam * (0.08 + uGlow * 0.22) * uColorB;

      float vignette = smoothstep(1.55, 0.25, length(uv));
      color *= vignette;

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
  const palette = scene?.config.palette || ['#4ef0cb', '#ff8f51', '#102038']
  const colorA = hexToRgb(palette[0] || '#4ef0cb')
  const colorB = hexToRgb(palette[1] || '#ff8f51')
  const colorC = hexToRgb(palette[2] || '#102038')
  const mode = sceneModeMap[scene?.config.shader || 'neo-gradient'] ?? 0

  setUniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height)
  setUniform1f(uniforms.time, performance.now() * 0.001)
  setUniform1f(uniforms.level, vibe.audioLevel)
  setUniform1f(uniforms.intensity, scene?.config.intensity ?? 0.72)
  setUniform1f(uniforms.glow, scene?.config.glow ?? 0.45)
  setUniform1f(uniforms.grain, scene?.config.grain ?? 0.14)
  setUniform1i(uniforms.mode, mode)
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
  <div class="stage-shell" :style="fallbackStyle">
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
