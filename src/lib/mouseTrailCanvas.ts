export type MouseTrailCanvasOptions = {
  pointerColor?: readonly [number, number, number, number]
  /** 經過文字時的方塊色（預設 palette 藍 #1b2f9e） */
  textZonePointerColor?: readonly [number, number, number, number]
  /** 單一像素方塊邊長（螢幕 px） */
  pixelSize?: number
  /** 負片區域內方塊放大倍率 */
  invertHoverScale?: number
  trailLength?: number
  trailFade?: number
  /** 此區域內的方塊改為負片（difference 混合） */
  invertTarget?: HTMLElement
  invertTargets?: HTMLElement[]
  /** 游標落在實際文字上時改為負片（caretRangeFromPoint 偵測） */
  invertOnText?: boolean
  invertCanvas?: HTMLCanvasElement
  /** 文字區藍方塊層（搭配 invert 白方塊 + lighten） */
  textZoneCanvas?: HTMLCanvasElement
  /** 不繪製拖尾（例如首屏 grid reveal 區） */
  suppressSelectors?: string[]
  /** 優先於 suppressSelectors：此區域內仍顯示拖尾（例如與 hero 重疊的 #about） */
  allowSelectors?: string[]
  /** 此區域內方塊縮小（例如日曆格線區） */
  shrinkSelectors?: string[]
  /** shrinkSelectors 區域內的方塊縮放倍率 */
  shrinkScale?: number
}

type TrailPoint = {
  ndcX: number
  ndcY: number
  clientX: number
  clientY: number
  life: number
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: string,
  fragmentShader: string,
) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vertexShader)
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader)
  if (!vs || !fs) return null

  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

export function initMouseTrailCanvas(
  canvas: HTMLCanvasElement,
  options: MouseTrailCanvasOptions = {},
): () => void {
  const pointerColor = options.pointerColor ?? [153 / 255, 120 / 255, 1, 1]
  const textZonePointerColor = options.textZonePointerColor ?? [27 / 255, 47 / 255, 158 / 255, 1]
  const textZoneCanvas = options.textZoneCanvas
  const basePixelSize = options.pixelSize ?? 18
  const invertHoverScale = options.invertHoverScale ?? 1.75
  const maxTrail = options.trailLength ?? 28
  const trailFade = options.trailFade ?? 0.04
  const invertTargets = [
    ...(options.invertTargets ?? []),
    ...(options.invertTarget ? [options.invertTarget] : []),
  ]
  const invertOnText = options.invertOnText ?? false
  const invertCanvas = options.invertCanvas
  const suppressSelectors = options.suppressSelectors ?? []
  const allowSelectors = options.allowSelectors ?? []
  const shrinkSelectors = options.shrinkSelectors ?? []
  const shrinkScale = options.shrinkScale ?? 0.68
  const hasInvert = invertTargets.length > 0 || invertOnText

  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: false,
  })
  if (!gl) return () => {}
  const g = gl

  g.enable(g.BLEND)
  g.blendEquation(g.FUNC_ADD)
  g.blendFuncSeparate(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA, g.ONE, g.ONE)

  const pointerProgram = createProgram(
    gl,
    `#version 300 es
uniform vec2 pointer;
uniform float pointSize;
void main() {
  gl_PointSize = pointSize;
  gl_Position = vec4(pointer, 0, 1);
}`,
    `#version 300 es
precision highp float;
uniform vec4 pointerColor;
out vec4 Color;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  if (max(abs(p.x), abs(p.y)) > 0.5) discard;
  Color = pointerColor;
}`,
  )

  if (!pointerProgram) return () => {}

  const pointerLoc = g.getUniformLocation(pointerProgram, 'pointer')
  const pointerColorLoc = g.getUniformLocation(pointerProgram, 'pointerColor')
  const pointSizeLoc = g.getUniformLocation(pointerProgram, 'pointSize')

  const invertCtx =
    invertCanvas && hasInvert ? invertCanvas.getContext('2d', { alpha: true }) : null
  const textZoneCtx =
    textZoneCanvas && hasInvert ? textZoneCanvas.getContext('2d', { alpha: true }) : null

  const pointerVec: [number, number] = [0, 0]
  let pointerClientX = 0
  let pointerClientY = 0
  const trail: TrailPoint[] = []
  let hasPointer = false
  let displayPixelSize = basePixelSize
  let rafId = 0
  let width = 0
  let height = 0

  function clientToPixel(clientX: number, clientY: number) {
    const cx = Math.floor(clientX / basePixelSize) * basePixelSize + basePixelSize / 2
    const cy = Math.floor(clientY / basePixelSize) * basePixelSize + basePixelSize / 2
    return {
      cx,
      cy,
      ndcX: (cx / width) * 2 - 1,
      ndcY: 1 - (cy / height) * 2,
    }
  }

  function isInAllowZone(clientX: number, clientY: number) {
    for (const selector of allowSelectors) {
      const el = document.querySelector(selector)
      if (!(el instanceof HTMLElement)) continue
      const rect = el.getBoundingClientRect()
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return true
      }
    }
    return false
  }

  function isInSuppressZone(clientX: number, clientY: number) {
    if (isInAllowZone(clientX, clientY)) return false
    for (const selector of suppressSelectors) {
      const el = document.querySelector(selector)
      if (!(el instanceof HTMLElement)) continue
      const rect = el.getBoundingClientRect()
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return true
      }
    }
    return false
  }

  const TEXT_HOST_SELECTOR = [
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'a',
    'span',
    'li',
    'label',
    'button',
    'figcaption',
    'td',
    'th',
    '.work-card__name',
    '.work-card__text',
    '.works-board__title',
    '.section__title',
    '.section__note',
    '.map__hint',
    '.nav__link',
    '.schedule-card__name',
    '.schedule-card__creator',
    '.schedule-card__group-intro-text',
    '.admission-panel__title',
    '.footer__inner',
  ].join(', ')

  function isTrailCanvasHost(el: Element | null) {
    return !!el?.closest(
      '.mouse-trail-canvas, .mouse-trail-invert-canvas, .mouse-trail-text-canvas',
    )
  }

  /** 跑馬燈複製段雖 aria-hidden，仍可視，需保留負片；其餘隱藏層略過 */
  function isIgnoredAriaHiddenHost(el: Element | null) {
    const hidden = el?.closest('[aria-hidden="true"]')
    if (!hidden) return false
    if (hidden.closest('.works-marquee')) return false
    return true
  }

  function hasUsableText(value: Node | Element | null | undefined) {
    const text = value?.textContent?.replace(/\s/g, '') ?? ''
    return text.length > 0
  }

  function isPointOverText(clientX: number, clientY: number) {
    const doc = document as Document & {
      caretRangeFromPoint?(x: number, y: number): Range | null
      caretPositionFromPoint?(x: number, y: number): { offsetNode: Node } | null
    }

    let textNode: Node | null = null
    if (doc.caretRangeFromPoint) {
      const range = doc.caretRangeFromPoint(clientX, clientY)
      if (range?.startContainer.nodeType === Node.TEXT_NODE) textNode = range.startContainer
    } else if (doc.caretPositionFromPoint) {
      const pos = doc.caretPositionFromPoint(clientX, clientY)
      if (pos?.offsetNode?.nodeType === Node.TEXT_NODE) textNode = pos.offsetNode
    }

    if (textNode) {
      const parent = textNode.parentElement
      if (
        parent &&
        !isTrailCanvasHost(parent) &&
        !isIgnoredAriaHiddenHost(parent) &&
        hasUsableText(textNode)
      ) {
        return true
      }
    }

    /**
     * CSS transform（作品跑馬燈）常使 caretRangeFromPoint 失效；
     * 改以 elementFromPoint 命中文字容器作為後備。
     */
    const hit = document.elementFromPoint(clientX, clientY)
    if (!(hit instanceof Element) || isTrailCanvasHost(hit) || isIgnoredAriaHiddenHost(hit)) {
      return false
    }
    if (hit.closest('img, video, canvas, svg, .work-card__media, .works-detail__viewport')) {
      return false
    }

    const textHost = hit.closest(TEXT_HOST_SELECTOR)
    return textHost instanceof Element && hasUsableText(textHost)
  }

  function isInShrinkZone(clientX: number, clientY: number) {
    for (const selector of shrinkSelectors) {
      const el = document.querySelector(selector)
      if (!(el instanceof HTMLElement)) continue
      const rect = el.getBoundingClientRect()
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return true
      }
    }
    return false
  }

  function isInInvertZone(clientX: number, clientY: number) {
    if (invertOnText && isPointOverText(clientX, clientY)) return true
    for (const target of invertTargets) {
      const rect = target.getBoundingClientRect()
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return true
      }
    }
    return false
  }

  function targetPixelSizeAt(clientX: number, clientY: number) {
    if (isInShrinkZone(clientX, clientY)) {
      return basePixelSize * shrinkScale
    }
    if (isInInvertZone(clientX, clientY)) {
      return basePixelSize * invertHoverScale
    }
    return basePixelSize
  }

  function updateDisplayPixelSize() {
    const target = hasPointer
      ? targetPixelSizeAt(pointerClientX, pointerClientY)
      : basePixelSize
    displayPixelSize += (target - displayPixelSize) * 0.18
    if (Math.abs(target - displayPixelSize) < 0.25) displayPixelSize = target
  }

  function drawGlPointer(ndcX: number, ndcY: number, alpha: number, size: number) {
    g.uniform2fv(pointerLoc, [ndcX, ndcY])
    g.uniform4fv(pointerColorLoc, [
      pointerColor[0],
      pointerColor[1],
      pointerColor[2],
      pointerColor[3] * alpha,
    ])
    g.uniform1f(pointSizeLoc, size)
    g.drawArrays(g.POINTS, 0, 1)
  }

  function drawTextZoneSquare(clientX: number, clientY: number, alpha: number, size: number) {
    if (!textZoneCtx) return
    const gridX = Math.floor(clientX / basePixelSize) * basePixelSize
    const gridY = Math.floor(clientY / basePixelSize) * basePixelSize
    const offset = (size - basePixelSize) / 2
    const [r, g, b] = textZonePointerColor
    textZoneCtx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`
    textZoneCtx.fillRect(gridX - offset, gridY - offset, size, size)
  }

  function drawTextZoneEffect(clientX: number, clientY: number, alpha: number, size: number) {
    drawInvertSquare(clientX, clientY, alpha, size)
    drawTextZoneSquare(clientX, clientY, alpha, size)
  }

  function drawInvertSquare(clientX: number, clientY: number, alpha: number, size: number) {
    if (!invertCtx) return
    const gridX = Math.floor(clientX / basePixelSize) * basePixelSize
    const gridY = Math.floor(clientY / basePixelSize) * basePixelSize
    const offset = (size - basePixelSize) / 2
    invertCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    invertCtx.fillRect(gridX - offset, gridY - offset, size, size)
  }

  function setViewSize() {
    const w = window.innerWidth
    const h = window.innerHeight
    if (w <= 0 || h <= 0) return
    width = w
    height = h
    canvas.width = w
    canvas.height = h
    g.viewport(0, 0, w, h)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    for (const layer of [
      { el: invertCanvas, ctx: invertCtx },
      { el: textZoneCanvas, ctx: textZoneCtx },
    ]) {
      if (!layer.el || !layer.ctx) continue
      layer.el.width = Math.round(w * dpr)
      layer.el.height = Math.round(h * dpr)
      layer.el.style.width = `${w}px`
      layer.el.style.height = `${h}px`
      layer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }

  function draw() {
    updateDisplayPixelSize()

    g.clearColor(0, 0, 0, 0)
    g.clear(g.COLOR_BUFFER_BIT)
    g.useProgram(pointerProgram)

    if (invertCtx && invertCanvas) {
      invertCtx.clearRect(0, 0, width, height)
    }
    if (textZoneCtx && textZoneCanvas) {
      textZoneCtx.clearRect(0, 0, width, height)
    }

    for (let i = trail.length - 1; i >= 0; i--) {
      const point = trail[i]!
      point.life -= trailFade
      if (point.life <= 0) {
        trail.splice(i, 1)
        continue
      }
      const alpha = point.life * 0.65
      if (isInSuppressZone(point.clientX, point.clientY)) continue
      const size = targetPixelSizeAt(point.clientX, point.clientY)
      if (isInInvertZone(point.clientX, point.clientY)) {
        drawTextZoneEffect(point.clientX, point.clientY, alpha, size)
      } else {
        drawGlPointer(point.ndcX, point.ndcY, alpha, size)
      }
    }

    if (hasPointer) {
      if (!isInSuppressZone(pointerClientX, pointerClientY)) {
        if (isInInvertZone(pointerClientX, pointerClientY)) {
          drawTextZoneEffect(pointerClientX, pointerClientY, 1, displayPixelSize)
        } else {
          drawGlPointer(pointerVec[0], pointerVec[1], 1, displayPixelSize)
        }
      }
    }

    rafId = window.requestAnimationFrame(draw)
  }

  function onPointerMove(e: PointerEvent) {
    if (width <= 0 || height <= 0) return
    if (isInSuppressZone(e.clientX, e.clientY)) {
      hasPointer = false
      return
    }
    hasPointer = true
    pointerClientX = e.clientX
    pointerClientY = e.clientY
    const pixel = clientToPixel(e.clientX, e.clientY)
    pointerVec[0] = pixel.ndcX
    pointerVec[1] = pixel.ndcY
    trail.push({
      ndcX: pixel.ndcX,
      ndcY: pixel.ndcY,
      clientX: pixel.cx,
      clientY: pixel.cy,
      life: 1,
    })
    if (trail.length > maxTrail) trail.shift()
  }

  function onResize() {
    setViewSize()
  }

  setViewSize()
  rafId = window.requestAnimationFrame(draw)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('resize', onResize)

  return () => {
    window.cancelAnimationFrame(rafId)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('resize', onResize)
    g.deleteProgram(pointerProgram)
    trail.length = 0
  }
}
