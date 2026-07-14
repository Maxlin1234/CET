declare module 'vanta/dist/vanta.clouds.min.js' {
  interface VantaCloudsEffect {
    destroy?: () => void
    resize?: () => void
  }

  interface VantaCloudsOptions {
    el: HTMLElement | string
    THREE?: unknown
    mouseControls?: boolean
    touchControls?: boolean
    gyroControls?: boolean
    minHeight?: number
    minWidth?: number
    forceAnimate?: boolean
  }

  export default function CLOUDS(options: VantaCloudsOptions): VantaCloudsEffect
}

declare module 'vanta/dist/vanta.net.min.js' {
  interface VantaNetEffect {
    destroy?: () => void
    resize?: () => void
  }

  interface VantaNetOptions {
    el: HTMLElement | string
    THREE?: unknown
    mouseControls?: boolean
    touchControls?: boolean
    gyroControls?: boolean
    minHeight?: number
    minWidth?: number
    scale?: number
    scaleMobile?: number
    color?: number
    backgroundColor?: number
    points?: number
    maxDistance?: number
    spacing?: number
    forceAnimate?: boolean
  }

  export default function NET(options: VantaNetOptions): VantaNetEffect
}

declare module 'vanta/vendor/three.r134.min.js' {
  import type * as ThreeNamespace from 'three'
  const THREE: typeof ThreeNamespace
  export default THREE
}
