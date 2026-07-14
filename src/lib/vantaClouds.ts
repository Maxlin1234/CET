import THREE from 'vanta/vendor/three.r134.min.js'
import CLOUDSImport from 'vanta/dist/vanta.clouds.min.js'

export type VantaCloudsOptions = {
  el: HTMLElement
  mouseControls?: boolean
  touchControls?: boolean
  gyroControls?: boolean
  minHeight?: number
  minWidth?: number
}

type VantaCloudsEffect = {
  destroy?: () => void
  resize?: () => void
  scene?: {
    children: Array<{
      material?: {
        fragmentShader: string
        needsUpdate: boolean
      }
    }>
  }
}

type VantaCloudsFn = (options: Record<string, unknown>) => VantaCloudsEffect

/** Vanta 吃 0xRRGGBB 十進位；與 App.vue `--palette-*` 對齊 */
function hexColor(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16)
}

/** 作品區雲層：呼應 banner Stripe 藍→橘→黃色調 */
const WORKS_CLOUD_PALETTE = {
  skyColor: hexColor('#69419b'), // --palette-blue
  cloudColor: hexColor('#adc1de'), // 暖白雲，帶黃橘氛圍
  cloudShadowColor: hexColor('#0xd0646'), // --palette-blue-dim
  sunColor: hexColor('#ff9500'),
  sunGlareColor: hexColor('#fff230'),
  sunlightColor: hexColor('#d97b4a'),
  backgroundColor: hexColor('#152560'),
} as const

/** Vite 預打包後 default import 可能是 { default: fn }，需解包 */
function resolveVantaEffect(
  mod: VantaCloudsFn | { default: VantaCloudsFn },
): VantaCloudsFn {
  return typeof mod === 'function' ? mod : mod.default
}

const CLOUDS = resolveVantaEffect(
  CLOUDSImport as unknown as VantaCloudsFn | { default: VantaCloudsFn },
)

/** 加強天空太陽、雲上眩光與雲內暖光，讓黃橘光源更明顯 */
function patchCloudsSunIntensity(shader: string): string {
  return shader
    .replace(
      'col += 0.2*sunColor*pow( sun, 2.0 );',
      `col += 0.55*sunColor*pow( sun,10.0 );
    col += 0.35*sunColor*pow( sun, 3.0 );`,
    )
    .replace(
      '    // clouds\n    vec4 res = raymarch',
      `    // yellow backlight between sky and clouds
    float sunDisk = pow(sun, 10.0);
    float horizonGlow = pow(max(0.38 - rd.y, 0.0), 1.4);
    col += sunColor * (0.95 * sunDisk + 0.72 * horizonGlow);

    // clouds
    vec4 res = raymarch`,
    )
    .replace(
      'vec3 lin = cloudColor*1.4 + sunlightColor*dif;',
      'vec3 lin = cloudColor*1.35 + sunlightColor*dif*2.4;',
    )
    .replace(
      'col += 0.2*sunGlareColor*pow( sun, 3.0 );',
      'col += 0.55*sunGlareColor*pow( sun, 5.4 );',
    )
}

function applyCloudsSunIntensity(effect: VantaCloudsEffect): void {
  const material = effect.scene?.children[0]?.material
  if (!material) return
  material.fragmentShader = patchCloudsSunIntensity(material.fragmentShader)
  material.needsUpdate = true
}

export function initVantaClouds(options: VantaCloudsOptions): () => void {
  const effect = CLOUDS({
    el: options.el,
    THREE,
    mouseControls: options.mouseControls ?? true,
    touchControls: options.touchControls ?? true,
    gyroControls: options.gyroControls ?? false,
    minHeight: options.minHeight ?? 200,
    minWidth: options.minWidth ?? 200,
    forceAnimate: true,
    ...WORKS_CLOUD_PALETTE,
  })

  applyCloudsSunIntensity(effect)

  requestAnimationFrame(() => {
    effect.resize?.()
  })

  return () => {
    effect.destroy?.()
  }
}
