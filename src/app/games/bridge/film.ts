import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

// The scene as if shot on film, like the stop-motion puppets the ship
// meets: the far sky and the near scene drawn in turn, a soft glow round
// bright lights (not on a phone, where it costs too much), then a warm
// grade, a darkening toward the corners and a fine grain that moves.

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.055 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // Warm highlights, slightly lifted blacks, as on film stock
      c.rgb = c.rgb * vec3(1.04, 1.0, 0.95) + vec3(0.014, 0.01, 0.022);
      // Darker toward the corners
      vec2 d = vUv - 0.5;
      d.x *= uRes.x / uRes.y;
      c.rgb *= mix(0.6, 1.0, smoothstep(1.0, 0.35, length(d)));
      // Grain, a little stronger in the shadows
      float g = hash(floor(vUv * uRes / 1.6) + fract(uTime * 7.3) * 97.0) - 0.5;
      float lum = dot(c.rgb, vec3(0.3, 0.59, 0.11));
      c.rgb += g * uGrain * (1.2 - lum * 0.6);
      gl_FragColor = c;
    }`,
}

export class Film {
  private composer: EffectComposer
  private film: ShaderPass
  private bloom: UnrealBloomPass | null = null

  constructor(
    renderer: THREE.WebGLRenderer,
    far: { scene: THREE.Scene; camera: THREE.Camera },
    near: { scene: THREE.Scene; camera: THREE.Camera },
    opts: { glow: boolean },
  ) {
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(far.scene, far.camera))
    const nearPass = new RenderPass(near.scene, near.camera)
    // Over the sky, with a depth range of its own
    nearPass.clear = false
    nearPass.clearDepth = true
    composer.addPass(nearPass)
    if (opts.glow) {
      this.bloom = new UnrealBloomPass(
        new THREE.Vector2(256, 256),
        0.5,
        0.45,
        0.82,
      )
      composer.addPass(this.bloom)
    }
    composer.addPass(new OutputPass())
    this.film = new ShaderPass(FilmShader)
    composer.addPass(this.film)
    this.composer = composer
  }

  setSize(w: number, h: number, dpr: number) {
    this.composer.setPixelRatio(dpr)
    this.composer.setSize(w, h)
    ;(this.film.uniforms.uRes.value as THREE.Vector2).set(w * dpr, h * dpr)
  }

  render(time: number, still: boolean) {
    this.film.uniforms.uTime.value = still ? 0 : time
    this.composer.render()
  }

  dispose() {
    this.bloom?.dispose()
    this.film.dispose()
    this.composer.dispose()
  }
}
