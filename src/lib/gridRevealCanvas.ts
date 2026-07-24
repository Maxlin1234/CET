import gsap from 'gsap'
import { assetUrl } from '@/lib/assetUrl'

type GridBox = {
  x: number
  y: number
  d: number
  s: number
}

type CoverCrop = {
  sx: number
  sy: number
  sw: number
  sh: number
  dw: number
  dh: number
}

export type GridRevealCanvasOptions = {
  imgSrc?: string
  boxSize?: number
  fade?: boolean
  dots?: boolean
  dotColor?: string
  pointerRoot?: HTMLElement
  sizeRoot?: HTMLElement
  /** cover 裁切時的垂直錨點（banner 建議 top，避免載入時切掉過多） */
  coverPosition?: 'center' | 'top'
  /**
   * cover 縮放：1 = 標準 cover；<1 = 拉遠（露出更多主視覺，可能上下留白）；
   * >1 = 拉近。未指定時，≤720px 自動用 0.78。
   */
  coverZoom?: number
  /** letterbox 時垂直錨點 0–1（0 靠上、0.5 置中） */
  coverFocalY?: number
  /** letterbox 填色 */
  letterboxColor?: string
}

type CoverDraw = CoverCrop & {
  dx: number
  dy: number
  outW: number
  outH: number
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function computeCoverCrop(
  img: HTMLImageElement,
  dw: number,
  dh: number,
  coverPosition: 'center' | 'top' = 'center',
  coverZoom = 1,
  coverFocalY = 0.5,
): CoverDraw {
  const zoom = coverZoom > 0 ? coverZoom : 1
  const imageRatio = img.naturalWidth / img.naturalHeight
  const canvasRatio = dw / dh
  let sx = 0
  let sy = 0
  let sw = img.naturalWidth
  let sh = img.naturalHeight

  if (imageRatio > canvasRatio) {
    sh = img.naturalHeight
    sw = sh * canvasRatio
    sx = (img.naturalWidth - sw) / 2
  } else {
    sw = img.naturalWidth
    sh = sw / canvasRatio
    sy = coverPosition === 'top' ? 0 : (img.naturalHeight - sh) / 2
  }

  if (zoom !== 1) {
    const cx = sx + sw / 2
    const cy = sy + sh / 2
    sw = Math.min(img.naturalWidth, sw / zoom)
    sh = Math.min(img.naturalHeight, sh / zoom)
    sx = clamp(cx - sw / 2, 0, img.naturalWidth - sw)
    sy = clamp(cy - sh / 2, 0, img.naturalHeight - sh)
  }

  let outW = dw
  let outH = dh
  let dx = 0
  let dy = 0

  if (zoom < 1) {
    const contain = Math.min(dw / sw, dh / sh)
    outW = sw * contain
    outH = sh * contain
    dx = (dw - outW) / 2
    dy = (dh - outH) * clamp(coverFocalY, 0, 1)
  }

  return { sx, sy, sw, sh, dw, dh, dx, dy, outW, outH }
}

function canvasRectToSource(crop: CoverDraw, x: number, y: number, w: number, h: number) {
  const relX = x - crop.dx
  const relY = y - crop.dy
  return {
    sx: crop.sx + (relX / crop.outW) * crop.sw,
    sy: crop.sy + (relY / crop.outH) * crop.sh,
    sw: (w / crop.outW) * crop.sw,
    sh: (h / crop.outH) * crop.sh,
  }
}

export function initGridRevealCanvas(
  canvas: HTMLCanvasElement,
  options: GridRevealCanvasOptions = {},
): () => void {
  const props = {
    imgSrc: options.imgSrc ?? assetUrl('aboutus.jpeg'),
    boxSize: options.boxSize ?? 123,
    fade: options.fade ?? false,
    dots: options.dots ?? true,
    dotColor: options.dotColor ?? '#fff',
  }

  const coverPosition = options.coverPosition ?? 'center'
  const coverZoomOption = options.coverZoom
  const coverFocalY = options.coverFocalY ?? 0.32
  const letterboxColor = options.letterboxColor ?? '#24143a'

  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const context = ctx

  const sizeRoot = options.sizeRoot ?? canvas.parentElement
  const pointerRoot = options.pointerRoot ?? window

  let cw = 0
  let ch = 0
  let cover: CoverDraw | null = null
  let cRect = canvas.getBoundingClientRect()
  let sx = 1
  let sy = 1
  let activeZoom = 1

  const T = Math.PI * 2
  const m = { x: 0, y: 0, s: 1.5, x2: 0, y2: 0 }
  const xTo = gsap.quickTo(m, 'x', { duration: 1, ease: 'expo' })
  const yTo = gsap.quickTo(m, 'y', { duration: 1, ease: 'expo' })
  const sTo = gsap.quickTo(m, 's', { duration: 2, ease: 'power2' })

  let boxes: GridBox[] = []
  let started = false
  let resizeObserver: ResizeObserver | null = null
  let mobileZoomMql: MediaQueryList | null = null

  context.fillStyle = props.dotColor

  const img = new Image()

  function resolveZoom() {
    if (typeof coverZoomOption === 'number') return coverZoomOption
    if (typeof window === 'undefined') return 1
    /** 手機略拉遠，讓穹頂半圓左右多露出一點 */
    return window.matchMedia('(max-width: 720px)').matches ? 0.65 : 1
  }

  function syncCover() {
    if (img.naturalWidth > 0 && cw > 0 && ch > 0) {
      activeZoom = resolveZoom()
      cover = computeCoverCrop(img, cw, ch, coverPosition, activeZoom, coverFocalY)
    }
  }

  function resizeCanvas() {
    if (!sizeRoot) return
    const w = Math.round(sizeRoot.clientWidth)
    const h = Math.round(sizeRoot.clientHeight)
    if (w <= 0 || h <= 0) return

    const nextZoom = resolveZoom()
    const changed = cw !== w || ch !== h || activeZoom !== nextZoom
    cw = w
    ch = h

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    context.setTransform(dpr, 0, 0, dpr, 0, 0)

    syncCover()
    if (changed) {
      buildBoxes()
      m.x = cw / 2
      m.y = ch / 2
      m.x2 = cw / 2
      m.y2 = ch / 2
    }
    syncRect()
    if (started) update()
  }

  function buildBoxes() {
    boxes = []
    for (let x = 0; x <= cw; x += props.boxSize) {
      for (let y = 0; y <= ch; y += props.boxSize) {
        boxes.push({ x, y, d: 0, s: 0 })
      }
    }
  }

  function drawImg(box: GridBox) {
    if (!cover) return
    box.d = Math.hypot(box.x - m.x, box.y - m.y)
    box.s = 1 - gsap.utils.clamp(0, 1, box.d / cw / m.s)
    if (box.s < 0.001) return

    const boxScaled = props.boxSize * box.s
    const inner = boxScaled / 2
    const outer = props.boxSize - boxScaled
    const src = canvasRectToSource(cover, box.x + inner, box.y + inner, outer, outer)

    if (src.sw <= 0 || src.sh <= 0) return
    if (props.fade) context.globalAlpha = box.s
    context.drawImage(
      img,
      src.sx,
      src.sy,
      src.sw,
      src.sh,
      box.x,
      box.y,
      props.boxSize,
      props.boxSize,
    )
    if (props.fade) context.globalAlpha = 1
  }

  function drawDots(box: GridBox) {
    context.beginPath()
    context.arc(box.x, box.y, props.boxSize * 0.15 * box.s, 0, T)
    context.fill()
  }

  function update() {
    if (!cover || cw <= 0 || ch <= 0) return
    const d = Math.hypot(m.x - m.x2, m.y - m.y2)
    sTo(d / cw * 2)
    context.clearRect(0, 0, cw, ch)
    if (activeZoom < 1) {
      const grad = context.createLinearGradient(0, 0, 0, ch)
      grad.addColorStop(0, '#1a0f33')
      grad.addColorStop(0.45, letterboxColor)
      grad.addColorStop(1, '#3a2460')
      context.fillStyle = grad
      context.fillRect(0, 0, cw, ch)
      context.fillStyle = props.dotColor
    }
    context.drawImage(
      img,
      cover.sx,
      cover.sy,
      cover.sw,
      cover.sh,
      cover.dx,
      cover.dy,
      cover.outW,
      cover.outH,
    )
    boxes.forEach(drawImg)
    if (props.dots) boxes.forEach(drawDots)
  }

  function syncRect() {
    cRect = canvas.getBoundingClientRect()
    if (cRect.width > 0 && cRect.height > 0) {
      sx = cw / cRect.width
      sy = ch / cRect.height
    }
  }

  function onPointerMove(e: Event) {
    if (!(e instanceof PointerEvent)) return
    syncRect()
    m.x2 = (e.clientX - cRect.left) * sx
    m.y2 = (e.clientY - cRect.top) * sy
    xTo(m.x2)
    yTo(m.y2)
  }

  function onResize() {
    resizeCanvas()
  }

  function onMobileZoomChange() {
    resizeCanvas()
  }

  function start() {
    if (started) return
    started = true
    resizeCanvas()
    syncCover()
    gsap.ticker.add(update)
    pointerRoot.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('resize', onResize)
    if (typeof window !== 'undefined' && typeof coverZoomOption !== 'number') {
      mobileZoomMql = window.matchMedia('(max-width: 720px)')
      mobileZoomMql.addEventListener('change', onMobileZoomChange)
    }
    if (sizeRoot && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => resizeCanvas())
      resizeObserver.observe(sizeRoot)
    }
    update()
  }

  img.onload = start
  img.onerror = start
  img.src = props.imgSrc

  return () => {
    gsap.ticker.remove(update)
    pointerRoot.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('resize', onResize)
    mobileZoomMql?.removeEventListener('change', onMobileZoomChange)
    mobileZoomMql = null
    resizeObserver?.disconnect()
    resizeObserver = null
    gsap.killTweensOf(m)
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    boxes = []
    started = false
    cover = null
    cw = 0
    ch = 0
  }
}
