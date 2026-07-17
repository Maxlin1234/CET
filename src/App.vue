<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  artistBioCacheKey,
  fetchArtistBio,
  fetchProjectWorks,
  getWorksApiConfig,
  mapUnzipWorkToCard,
  type UnzipWork,
} from '@/api/unzipWorks'
import MapZoneAGoogle from '@/components/MapZoneAGoogle.vue'
import ScheduleCalendar from '@/components/ScheduleCalendar.vue'
import type { AdmissionTicketItem, Lang } from './i18n'
import { UNIT_ACCENT_PROGRAM_GROUPS, messages } from './i18n'
import type { ScheduleAccent } from '@/types/schedule'
import type { WorkArtistBioSource, WorkCard } from '@/types/workCard'
import { Gradient } from '@/Gradient.js'
import { initGridRevealCanvas } from '@/lib/gridRevealCanvas'
import { initMouseTrailCanvas } from '@/lib/mouseTrailCanvas'
import { initVantaClouds } from '@/lib/vantaClouds'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SplitType from 'split-type'
gsap.registerPlugin(ScrollTrigger)

/** 與 setupHeroScrollParallax 中 #about marginTop 動畫一致 */
const HERO_ABOUT_MARGIN_SHIFT_RATIO = 0.34

function envNumber(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

let heroStripeGradient: Gradient | null = null

const googleMapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()
const mapZoneALat = envNumber(import.meta.env.VITE_GOOGLE_MAP_A_LAT, 25.040615579876043)
const mapZoneALng = envNumber(import.meta.env.VITE_GOOGLE_MAP_A_LNG, 121.53817086107965)
const mapZoneAZoom = Math.round(envNumber(import.meta.env.VITE_GOOGLE_MAP_A_ZOOM, 16))

const lang = ref<Lang>('zh')
const menuOpen = ref(false)

type AdmissionTab = 'notes' | 'tickets'
const admissionTab = ref<AdmissionTab>('notes')

/** 用於是否初始化 WebGL Stripe 底（與 prefers-reduced-motion 一致） */
const heroMotionOk = ref(true)

/** true：首屏 Banner 使用全幅照片底；false：WebGL Stripe 動態底 */
const HERO_BACKGROUND_PHOTO = true
/** 底部 SVG 波浪裝飾（暫時關閉） */
const SHOW_HERO_WAVE = false
/** 關於我們上方漸層高光區（暫時隱藏） */
const SHOW_ABOUT_GLOW = false
/** 首屏 Banner 照片（置於 `public/`，與作品區素材一致） */
const HERO_BANNER_PHOTO_SRC = '/aboutus.jpeg'

/** Banner 主／副標：拆字＋字重動畫節點（見 setupHeroFontWeightEffect） */
const heroTitleFontWeightRef = ref<HTMLElement | null>(null)
const heroTitleFontWeightRef_2 = ref<HTMLElement | null>(null)
const vantaRef = ref<HTMLElement | null>(null)
let heroFontWeightMedia: ReturnType<typeof gsap.matchMedia> | null = null

function teardownHeroFontWeightEffect() {
  heroFontWeightMedia?.revert()
  heroFontWeightMedia = null
}

function setupHeroFontWeightEffect() {
  teardownHeroFontWeightEffect()
  if (typeof document === 'undefined') return
  if (!heroMotionOk.value) return
  const root = heroTitleFontWeightRef.value
  const root2 = heroTitleFontWeightRef_2.value
  if (!root || !root2) return

  const isZh = lang.value === 'zh'
  /** 中文：Noto Sans TC 字幅較大，略縮影響半徑、略抬基底字重，觸感較接近英文的 Playfair */
  const MAX_DISTANCE = isZh ? 240 : 280
  const MAX_FONT_WEIGHT = 800
  const MIN_FONT_WEIGHT = isZh ? 320 : 200
  const duration = isZh ? 0.42 : 0.55

  heroFontWeightMedia = gsap.matchMedia()
  heroFontWeightMedia.add('(min-width: 992px)', () => {
    const splitMain = new SplitType(root, { types: 'chars' })
    const splitStack = new SplitType(root2, { types: 'chars' })
    const charsMain = splitMain.chars ?? []
    const charsStack = splitStack.chars ?? []

    if (!charsMain.length && !charsStack.length) {
      return () => {
        splitMain.revert()
        splitStack.revert()
      }
    }

    const onMove = (event: MouseEvent) => {
      const mouseX = event.pageX
      const mouseY = event.pageY
      const step = (char: HTMLElement) => {
        const itemRect = char.getBoundingClientRect()
        const itemCenterX = itemRect.left + itemRect.width / 2 + window.scrollX
        const itemCenterY = itemRect.top + itemRect.height / 2 + window.scrollY
        const distance = Math.hypot(mouseX - itemCenterX, mouseY - itemCenterY)
        const fontWeight =
          distance < MAX_DISTANCE
            ? gsap.utils.mapRange(
                0,
                MAX_DISTANCE,
                MIN_FONT_WEIGHT,
                MAX_FONT_WEIGHT,
                Math.max(0, MAX_DISTANCE - distance),
              )
            : MIN_FONT_WEIGHT
        gsap.to(char, { fontWeight, duration })
      }
      for (const char of charsMain) step(char)
      for (const char of charsStack) step(char)
    }

    document.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      document.removeEventListener('mousemove', onMove)
      splitMain.revert()
      splitStack.revert()
    }
  })
}

let motionMql: MediaQueryList | null = null

function syncHeroMotionPref() {
  heroMotionOk.value =
    typeof window !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function onHeroMotionMqlChange() {
  syncHeroMotionPref()
  teardownHeroScrollParallax()
  if (!heroMotionOk.value) {
    teardownHeroGridReveal()
    teardownVantaEffect()
    teardownMouseTrailCanvas()
  } else {
    initHeroGridRevealCanvas()
    initVantaEffect()
    initMouseTrailCanvasEffect()
    void nextTick(() => setupHeroScrollParallax())
  }
}

/** 首屏 Stripe WebGL：`timeScale` 隨滑鼠移動強度（僅 banner 區 #hero） */
const HERO_STRIPE_TS_MIN = 0.62
const HERO_STRIPE_TS_MAX = 6.1
const HERO_STRIPE_MAX_DELTA_PX = 16

let heroStripePointerWarm = false
let heroStripeLastPx = { x: 0, y: 0 }
let heroStripeSmoothDist = 0
let heroStripeDecayInterval: ReturnType<typeof window.setInterval> | null = null
let heroStripeIdleDecayTimer: ReturnType<typeof window.setTimeout> | null = null

function applyHeroStripeTimeScaleFromSmooth() {
  if (!heroStripeGradient || !heroMotionOk.value) return
  const amtLin = Math.min(1, Math.max(0, heroStripeSmoothDist / HERO_STRIPE_MAX_DELTA_PX))
  const amt = Math.pow(amtLin, 0.42)
  heroStripeGradient.timeScale = HERO_STRIPE_TS_MIN + amt * (HERO_STRIPE_TS_MAX - HERO_STRIPE_TS_MIN)
}

function stopHeroStripeHoverDecay() {
  if (typeof window !== 'undefined' && heroStripeDecayInterval != null)
    window.clearInterval(heroStripeDecayInterval)
  heroStripeDecayInterval = null
}

function cancelHeroStripeIdleDecayKick() {
  if (typeof window !== 'undefined' && heroStripeIdleDecayTimer != null)
    window.clearTimeout(heroStripeIdleDecayTimer)
  heroStripeIdleDecayTimer = null
}

function runHeroStripeSmoothDecayTick() {
  if (!heroStripeGradient || !heroMotionOk.value) {
    stopHeroStripeHoverDecay()
    return
  }
  heroStripeSmoothDist *= 0.955
  if (heroStripeSmoothDist < 0.48) heroStripeSmoothDist = 0
  if (heroStripeSmoothDist < 0.02) {
    heroStripeGradient.timeScale = 1
    stopHeroStripeHoverDecay()
    return
  }
  applyHeroStripeTimeScaleFromSmooth()
}

function beginHeroStripeSmoothDecayLoop() {
  stopHeroStripeHoverDecay()
  if (typeof window === 'undefined') return
  heroStripeDecayInterval = window.setInterval(runHeroStripeSmoothDecayTick, 52)
}

function scheduleHeroStripeIdleDecay() {
  if (typeof window === 'undefined' || !heroMotionOk.value) return
  cancelHeroStripeIdleDecayKick()
  heroStripeIdleDecayTimer = window.setTimeout(() => {
    heroStripeIdleDecayTimer = null
    beginHeroStripeSmoothDecayLoop()
  }, 340)
}

function resetHeroStripePointerSpeed() {
  cancelHeroStripeIdleDecayKick()
  stopHeroStripeHoverDecay()
  heroStripePointerWarm = false
  heroStripeSmoothDist = 0
  if (heroStripeGradient) heroStripeGradient.timeScale = 1
}

function onHeroStripeMouseEnter() {
  resetHeroStripePointerSpeed()
}

function onHeroStripePointerMove(e: MouseEvent) {
  if (!heroMotionOk.value || !heroStripeGradient) return
  cancelHeroStripeIdleDecayKick()
  stopHeroStripeHoverDecay()

  if (!heroStripePointerWarm) {
    heroStripeLastPx = { x: e.clientX, y: e.clientY }
    heroStripePointerWarm = true
    heroStripeGradient.timeScale = 1
    scheduleHeroStripeIdleDecay()
    return
  }
  const dx = e.clientX - heroStripeLastPx.x
  const dy = e.clientY - heroStripeLastPx.y
  heroStripeLastPx = { x: e.clientX, y: e.clientY }
  const dist = Math.hypot(dx, dy)
  const capped = Math.min(HERO_STRIPE_MAX_DELTA_PX + 54, Math.max(dist, 0))
  heroStripeSmoothDist = heroStripeSmoothDist * 0.32 + capped * 0.68
  applyHeroStripeTimeScaleFromSmooth()
  scheduleHeroStripeIdleDecay()
}

function onHeroStripeMouseLeave() {
  resetHeroStripePointerSpeed()
}

watch(heroMotionOk, (ok) => {
  teardownHeroScrollParallax()
  if (!ok) {
    resetHeroStripePointerSpeed()
    stopAboutGlowIdleLoop()
    stopWorksDetailAutoplay()
    teardownHeroGridReveal()
    teardownVantaEffect()
    teardownMouseTrailCanvas()
  } else {
    initHeroGridRevealCanvas()
    initVantaEffect()
    initMouseTrailCanvasEffect()
    startAboutGlowIdleLoop()
    if (worksDetailIndex.value != null) startWorksDetailAutoplay()
    void nextTick(() => setupHeroScrollParallax())
  }
})

watch([lang, heroMotionOk], async () => {
  teardownHeroFontWeightEffect()
  await nextTick()
  if (heroMotionOk.value) setupHeroFontWeightEffect()
})

const stored = (): Lang | null => {
  if (typeof localStorage === 'undefined') return null
  const v = localStorage.getItem('usaf-lang')
  return v === 'en' || v === 'zh' ? v : null
}

const heroPhotoWrapRef = ref<HTMLElement | null>(null)
const heroGridCanvasRef = ref<HTMLCanvasElement | null>(null)

let teardownHeroGridRevealCanvas: (() => void) | null = null

function initHeroGridRevealCanvas() {
  teardownHeroGridRevealCanvas?.()
  teardownHeroGridRevealCanvas = null
  if (!HERO_BACKGROUND_PHOTO || !heroMotionOk.value) return

  void nextTick(() => {
    const canvas = heroGridCanvasRef.value
    const wrap = heroPhotoWrapRef.value
    const heroSection = document.getElementById('hero')
    if (!canvas || !wrap) return

    teardownHeroGridRevealCanvas = initGridRevealCanvas(canvas, {
      imgSrc: HERO_BANNER_PHOTO_SRC,
      boxSize: 60,
      dots: false,
      coverPosition: 'top',
      pointerRoot: heroSection instanceof HTMLElement ? heroSection : undefined,
      sizeRoot: wrap,
    })
  })
}

function teardownHeroGridReveal() {
  teardownHeroGridRevealCanvas?.()
  teardownHeroGridRevealCanvas = null
}

let teardownVanta: (() => void) | null = null

function initVantaEffect() {
  teardownVanta?.()
  teardownVanta = null
  if (!heroMotionOk.value) return
  const el = vantaRef.value
  if (!el) return

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!vantaRef.value || !heroMotionOk.value) return
      try {
        teardownVanta = initVantaClouds({
          el: vantaRef.value,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
        })
      } catch (err) {
        console.warn('[vanta] CLOUDS init failed', err)
      }
    })
  })
}

function teardownVantaEffect() {
  teardownVanta?.()
  teardownVanta = null
}

let teardownMouseTrail: (() => void) | null = null

function initMouseTrailCanvasEffect() {
  teardownMouseTrail?.()
  teardownMouseTrail = null
  if (!heroMotionOk.value) return
  const canvas = document.getElementById('mouse-trail-canvas')
  if (!(canvas instanceof HTMLCanvasElement)) return
  const invertCanvas = document.getElementById('mouse-trail-invert-canvas')
  const textZoneCanvas = document.getElementById('mouse-trail-text-canvas')
  teardownMouseTrail = initMouseTrailCanvas(canvas, {
    pixelSize: 25 * 2,
    pointerColor: [153 / 255, 120 / 255, 1, 1],
    textZonePointerColor: [27 / 255, 47 / 255, 158 / 255, 1],
    invertCanvas: invertCanvas instanceof HTMLCanvasElement ? invertCanvas : undefined,
    textZoneCanvas: textZoneCanvas instanceof HTMLCanvasElement ? textZoneCanvas : undefined,
    invertOnText: true,
    suppressSelectors: ['#hero'],
    allowSelectors: ['#about'],
    shrinkSelectors: ['.schedule-calendar'],
    shrinkScale: 0.68,
  })
}

function teardownMouseTrailCanvas() {
  teardownMouseTrail?.()
  teardownMouseTrail = null
}

let heroScrollParallaxCtx: gsap.Context | null = null

function teardownHeroScrollParallax() {
  heroScrollParallaxCtx?.revert()
  heroScrollParallaxCtx = null
}

/** Banner 捲動視差：背景慢移、前景快移 — 須在 DOM 掛載後執行 */
function setupHeroScrollParallax() {
  teardownHeroScrollParallax()
  if (typeof window === 'undefined' || !heroMotionOk.value) return

  const hero = document.getElementById('hero')
  const about = document.getElementById('about')
  if (!hero) return

  const BG_SHIFT_RATIO = HERO_ABOUT_MARGIN_SHIFT_RATIO
  const FG_SHIFT_RATIO = 0.52
  const BG_SCALE = 1.07
  /** 僅 scrim 等疊色層加高；照片／canvas 維持 100% 才不會載入時被 cover 裁掉 */
  const overlayOverscan = BG_SHIFT_RATIO + (BG_SCALE - 1) + 0.06

  heroScrollParallaxCtx = gsap.context(() => {
    const heroHeight = () => hero.offsetHeight

    const imageBgLayers = gsap.utils
      .toArray<HTMLElement>(
        '#hero .hero__photo, #hero .hero__canvas, #hero .hero__grid-canvas',
      )
      .filter((el): el is HTMLElement => el instanceof HTMLElement)

    const overlayBgLayers = gsap.utils
      .toArray<HTMLElement>('#hero .hero__scrim, #hero .hero__wave')
      .filter((el): el is HTMLElement => el instanceof HTMLElement)

    const fgLayers = gsap.utils
      .toArray<HTMLElement>('#hero .hero_title, #hero .hero_title-bottom, #hero .hero__inner')
      .filter((el): el is HTMLElement => el instanceof HTMLElement)

    imageBgLayers.forEach((el) => {
      gsap.set(el, {
        top: 0,
        bottom: 0,
        height: '100%',
        transformOrigin: '50% 100%',
      })
    })

    overlayBgLayers.forEach((el) => {
      gsap.set(el, {
        top: 0,
        bottom: 'auto',
        height: `${(1 + overlayOverscan) * 100}%`,
        transformOrigin: '50% 100%',
      })
    })

    const bgLayers = [...imageBgLayers, ...overlayBgLayers]

    const scrollRange = {
      trigger: hero,
      endTrigger: about ?? hero,
      start: 'center center',
      end: about ? 'top 50%' : 'bottom top',
      scrub: 1.35,
      invalidateOnRefresh: true,
       //markers: true,
    }

    const transition = gsap.timeline({ scrollTrigger: scrollRange })

    if (bgLayers.length) {
      transition.to(
        bgLayers,
        {
          y: () => -heroHeight() * BG_SHIFT_RATIO,
          scale: BG_SCALE,
          ease: 'none',
        },
        0,
      )
    }

    if (fgLayers.length) {
      transition.to(
        fgLayers,
        {
          y: () => -heroHeight() * FG_SHIFT_RATIO,
          ease: 'none',
        },
        0,
      )
    }

    /** 用 marginTop 上拉（不用 transform），避免底部出現 1px 深色縫隙 */
    if (about) {
      const aboutMarginBase = 'clamp(-7rem, -16vh, -3.5rem)'
      transition.fromTo(
        about,
        { marginTop: aboutMarginBase },
        {
          marginTop: () =>
            `calc(${aboutMarginBase} - ${heroHeight() * BG_SHIFT_RATIO}px)`,
          ease: 'none',
        },
        0,
      )
    }
  })

  ScrollTrigger.refresh()
}

onMounted(async () => {
  const s = stored()
  if (s) lang.value = s
  syncHeroMotionPref()
  motionMql = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionMql.addEventListener('change', onHeroMotionMqlChange)

  /** WebGL 動態底：首屏 */
  await nextTick()
  requestAnimationFrame(() => {
    if (heroMotionOk.value && document.getElementById('hero-gradient-canvas')) {
      try {
        heroStripeGradient = new Gradient().initGradient('#hero-gradient-canvas')
      } catch {
        heroStripeGradient = null
      }
    }
  })
  await nextTick()
  bindWorksMarqueeSizing()
  startWorksMarqueeLoop()
  void loadWorksFromApi()
  await nextTick()
  setupHeroFontWeightEffect()
  initHeroGridRevealCanvas()
  await nextTick()
  initVantaEffect()
  initMouseTrailCanvasEffect()
  if (heroMotionOk.value) startAboutGlowIdleLoop()
  setupHeroScrollParallax()
})

onUnmounted(() => {
  teardownHeroScrollParallax()
  teardownHeroGridReveal()
  teardownVantaEffect()
  teardownMouseTrailCanvas()
  teardownHeroFontWeightEffect()
  motionMql?.removeEventListener('change', onHeroMotionMqlChange)
  resetHeroStripePointerSpeed()
  heroStripeGradient?.disconnect()
  heroStripeGradient = null
  stopWorksMarqueeLoop()
  worksResizeObserver?.disconnect()
  worksResizeObserver = null
  window.removeEventListener('keydown', onWorksDetailKeydown)
  stopWorksDetailAutoplay()
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  stopAboutGlowIdleLoop()
})

const txt = computed(() => messages[lang.value])

type AdmissionTicketRow =
  | { kind: 'item'; text: string; url?: string; num: number }
  | { kind: 'heading'; text: string }
  | { kind: 'note'; text: string }
  | { kind: 'lead'; text: string }

function buildTicketDisplayRows(
  items: readonly AdmissionTicketItem[],
): AdmissionTicketRow[] {
  const rows: AdmissionTicketRow[] = []
  let num = 0
  for (const item of items) {
    if (item.kind === 'heading') {
      num = 0
      rows.push({ kind: 'heading', text: item.text })
      continue
    }
    if (item.kind === 'note' || item.kind === 'lead') {
      rows.push({ kind: item.kind, text: item.text })
      continue
    }
    num += 1
    rows.push({ kind: 'item', text: item.text, url: item.url, num })
  }
  return rows
}

const ticketDisplayRows = computed(() =>
  buildTicketDisplayRows(txt.value.admission.ticketsItems),
)

const apiWorks = ref<UnzipWork[] | null>(null)

const worksCards = computed((): readonly WorkCard[] => {
  if (apiWorks.value) {
    return apiWorks.value.map((work) => mapUnzipWorkToCard(work, lang.value))
  }
  return txt.value.works.cards
})

function workCardMarqueeText(card: { body: string }): string {
  const firstBlock = card.body.split(/\n\n+/)[0]?.trim() ?? card.body.trim()
  const text = firstBlock.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= 160) return text
  return `${text.slice(0, 157)}…`
}

async function loadWorksFromApi() {
  const { mode, url, key } = getWorksApiConfig()
  if (mode === 'direct' && !key) return

  try {
    const items = await fetchProjectWorks(url, key)
    apiWorks.value = items
    await nextTick()
    measureWorksMarqueeSegment()
  } catch (error) {
    console.error('[works] API fetch failed', error)
  }
}

function resolveWorkGalleryUrls(card: { image: string; gallery?: readonly string[] }): string[] {
  const g = card.gallery?.filter((u) => typeof u === 'string' && u.length > 0)
  if (g && g.length > 0) return [...g]
  if (card.image) return [card.image]
  return []
}

/** 跑馬燈拖曳：與 pointerdown 起點的最大水平距離，超過則不視為「點卡片」 */
const worksMarqueeTravelPx = ref(0)
const worksGestureStartX = ref(0)
/** pointerdown 時手指底下的作品卡 index（由 data-work-card-index 取得） */
const worksPointerDownCardIndex = ref<number | null>(null)

const worksDetailIndex = ref<number | null>(null)
const worksDetailSlideIx = ref(0)
const worksDetailPageIx = ref(0)
const worksDetailArtistBioMap = ref<Record<string, string>>({})
const worksDetailArtistBiosLoading = ref(false)
let worksDetailArtistBioAbort: AbortController | null = null

const worksDetailCard = computed(() => {
  const ix = worksDetailIndex.value
  if (ix == null) return null
  return worksCards.value[ix] ?? null
})

const worksDetailGalleryUrls = computed(() => {
  const c = worksDetailCard.value
  if (!c) return [] as string[]
  return resolveWorkGalleryUrls(c)
})

const worksDetailArtists = computed(() => {
  const c = worksDetailCard.value
  return c?.artists ?? []
})

const worksDetailArtistBioFallback = computed(
  (): WorkArtistBioSource | null => worksDetailCard.value?.artistBioFallback ?? null,
)

const worksDetailHasArtistPage = computed(() => worksDetailArtists.value.length > 0)

const worksDetailArtistHeading = computed(() => {
  const names = worksDetailArtists.value.map((a) => a.name).filter(Boolean)
  if (names.length === 0) return txt.value.works.detailArtistsAria
  return names.join(lang.value === 'zh' ? '、' : ', ')
})

function worksDetailArtistBioKey(artist: { id: number; authorType: string }) {
  return artistBioCacheKey(artist as { id: number; authorType: 'collective' | 'contributor' })
}

function worksDetailArtistBioParagraphs(artist: { id: number; authorType: string }) {
  const bio = worksDetailArtistBioMap.value[worksDetailArtistBioKey(artist)]?.trim()
  if (!bio) return [] as string[]
  return splitProseParagraphs(bio)
}

const worksDetailHasIndividualArtistBio = computed(() =>
  worksDetailArtists.value.some((artist) => worksDetailArtistBioParagraphs(artist).length > 0),
)

const worksDetailFallbackBioParagraphs = computed(() => {
  const fallback = worksDetailArtistBioFallback.value
  return fallback ? worksDetailArtistBioParagraphs(fallback) : []
})

const worksDetailSlideCount = computed(() => {
  const n = worksDetailGalleryUrls.value.length
  return n > 0 ? n : 1
})

const worksDetailActiveSlideIx = computed(() => {
  const n = worksDetailGalleryUrls.value.length
  if (n === 0) return 0
  return ((worksDetailSlideIx.value % n) + n) % n
})

function preloadWorkGalleryImages(urls: readonly string[]) {
  if (typeof window === 'undefined') return
  for (const url of urls) {
    const probe = new Image()
    probe.decoding = 'async'
    probe.src = url
  }
}

function splitProseParagraphs(text: string): string[] {
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
}

const worksDetailIntroParagraphs = computed(() => {
  const c = worksDetailCard.value as { intro?: string } | null
  if (!c?.intro?.trim()) return [] as string[]
  return splitProseParagraphs(c.intro)
})

const worksDetailSubtitle = computed(() => {
  const c = worksDetailCard.value as { subtitle?: string } | null
  const s = c?.subtitle?.trim()
  return s || null
})

const worksDetailBodyParagraphs = computed(() => {
  const c = worksDetailCard.value
  if (!c?.body) return [] as string[]
  return splitProseParagraphs(c.body)
})

function openWorksDetail(index: number) {
  worksDetailIndex.value = index
  worksDetailSlideIx.value = 0
  worksDetailPageIx.value = 0
  worksDetailArtistBioMap.value = {}
  worksDetailArtistBiosLoading.value = false
  abortWorksDetailArtistBioFetch()
  nextTick(() => document.getElementById('works-detail-title')?.focus())
}

function normalizeWorkTitle(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\s　]/g, '')
    .replace(/[：:－—–\-_/\\|《》〈〉「」『』【】\[\]()（）]/g, '')
    .toLowerCase()
}

const unitAccentTitleKeys = computed(() => {
  return UNIT_ACCENT_PROGRAM_GROUPS.map((group) => {
    const keys = new Set<string>()
    for (const title of group.titles) {
      const key = normalizeWorkTitle(title)
      if (key) keys.add(key)
    }
    return { accent: group.accent, keys }
  })
})

function getWorkCardAccent(card: WorkCard, index: number): ScheduleAccent | null {
  const work = apiWorks.value?.[index] ?? null
  const candidates = workTitleCandidates(card, work).map(normalizeWorkTitle).filter(Boolean)
  if (!candidates.length) return null

  for (const group of unitAccentTitleKeys.value) {
    for (const needle of candidates) {
      for (const key of group.keys) {
        if (needle === key || needle.includes(key) || key.includes(needle)) {
          return group.accent
        }
      }
    }
  }
  return null
}

function workCardUnitClass(card: WorkCard, index: number): string | undefined {
  const accent = getWorkCardAccent(card, index)
  if (!accent) return undefined
  return `work-card--accent-${accent}`
}

const openableWorkTitles = computed(() => {
  const titles = new Set<string>()

  if (apiWorks.value?.length) {
    for (const work of apiWorks.value) {
      for (const candidate of [work.title_zh_tw, work.title]) {
        const text = candidate?.trim()
        if (text) titles.add(text)
      }
    }
  }

  for (const card of worksCards.value) {
    if (card.title?.trim()) titles.add(card.title.trim())
    if (card.subtitle?.trim()) titles.add(card.subtitle.trim())
  }

  return [...titles]
})

function workTitleCandidates(card: WorkCard, work?: UnzipWork | null): string[] {
  const titles = new Set<string>()
  if (work) {
    for (const candidate of [work.title_zh_tw, work.title]) {
      const text = candidate?.trim()
      if (text) titles.add(text)
    }
  }
  for (const candidate of [card.title, card.subtitle]) {
    const text = candidate?.trim()
    if (text) titles.add(text)
  }
  return [...titles]
}

function findWorkCardIndexByProgramName(name: string): number {
  const needle = normalizeWorkTitle(name)
  if (!needle) return -1
  return worksCards.value.findIndex((card, index) => {
    const work = apiWorks.value?.[index] ?? null
    return workTitleCandidates(card, work).some((title) => {
      const hay = normalizeWorkTitle(title)
      return hay === needle || hay.includes(needle) || needle.includes(hay)
    })
  })
}

function openWorksDetailByProgram(program: { name: string }) {
  const ix = findWorkCardIndexByProgramName(program.name)
  if (ix < 0) return
  openWorksDetail(ix)
}

function closeWorksDetail() {
  worksDetailIndex.value = null
  worksDetailPageIx.value = 0
  abortWorksDetailArtistBioFetch()
}

function abortWorksDetailArtistBioFetch() {
  worksDetailArtistBioAbort?.abort()
  worksDetailArtistBioAbort = null
}

async function loadWorksDetailArtistBios() {
  const artists = worksDetailArtists.value
  if (!artists.length) return

  const sources: WorkArtistBioSource[] = artists.map(({ id, authorType, name }) => ({
    id,
    authorType,
    name,
  }))
  if (worksDetailArtistBioFallback.value) {
    sources.push(worksDetailArtistBioFallback.value)
  }

  const uniqueSources = [...new Map(
    sources.map((source) => [worksDetailArtistBioKey(source), source]),
  ).values()]

  const pending = uniqueSources.filter((artist) => {
    const key = worksDetailArtistBioKey(artist)
    return worksDetailArtistBioMap.value[key] == null
  })
  if (!pending.length) return

  abortWorksDetailArtistBioFetch()
  const controller = new AbortController()
  worksDetailArtistBioAbort = controller
  worksDetailArtistBiosLoading.value = true

  const { mode, key: apiKey } = getWorksApiConfig()
  if (mode === 'direct' && !apiKey.trim()) {
    worksDetailArtistBiosLoading.value = false
    worksDetailArtistBioAbort = null
    return
  }

  try {
    const entries = await Promise.all(
      pending.map(async (artist) => {
        const cacheKey = worksDetailArtistBioKey(artist)
        try {
          const bio = await fetchArtistBio(artist, lang.value, apiKey, controller.signal)
          return [cacheKey, bio] as const
        } catch (err) {
          if (controller.signal.aborted) return null
          console.warn('[CET] artist bio fetch failed', artist.name, err)
          return [cacheKey, ''] as const
        }
      }),
    )

    if (controller.signal.aborted) return

    const next = { ...worksDetailArtistBioMap.value }
    for (const entry of entries) {
      if (!entry) continue
      next[entry[0]] = entry[1]
    }
    worksDetailArtistBioMap.value = next
  } finally {
    if (worksDetailArtistBioAbort === controller) {
      worksDetailArtistBiosLoading.value = false
      worksDetailArtistBioAbort = null
    }
  }
}

function worksDetailSetPage(index: number) {
  if (!worksDetailHasArtistPage.value) {
    worksDetailPageIx.value = 0
    return
  }
  const next = Math.max(0, Math.min(1, index))
  worksDetailPageIx.value = next
  if (next === 1) {
    stopWorksDetailAutoplay()
    void loadWorksDetailArtistBios()
  } else {
    restartWorksDetailAutoplay()
  }
}

function worksDetailStepPage(delta: number) {
  worksDetailSetPage(worksDetailPageIx.value + delta)
}

function worksDetailAdvanceSlide(delta: number) {
  const n = worksDetailGalleryUrls.value.length
  if (n < 2) return
  worksDetailSlideIx.value = (worksDetailSlideIx.value + delta + n) % n
}

function worksDetailGoToSlide(index: number) {
  worksDetailSlideIx.value = index
  restartWorksDetailAutoplay()
}

function worksDetailStepSlide(delta: number) {
  worksDetailAdvanceSlide(delta)
  restartWorksDetailAutoplay()
}

const WORKS_DETAIL_AUTOPLAY_MS = 3000
let worksDetailAutoplayTimer: ReturnType<typeof setInterval> | null = null

function stopWorksDetailAutoplay() {
  if (worksDetailAutoplayTimer != null) {
    clearInterval(worksDetailAutoplayTimer)
    worksDetailAutoplayTimer = null
  }
}

function startWorksDetailAutoplay() {
  stopWorksDetailAutoplay()
  if (typeof window === 'undefined') return
  if (!heroMotionOk.value) return
  if (worksDetailIndex.value == null) return
  if (worksDetailGalleryUrls.value.length < 2) return
  worksDetailAutoplayTimer = setInterval(() => {
    worksDetailAdvanceSlide(1)
  }, WORKS_DETAIL_AUTOPLAY_MS)
}

function restartWorksDetailAutoplay() {
  if (worksDetailIndex.value == null) return
  startWorksDetailAutoplay()
}

watch(worksDetailIndex, (ix) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (ix != null) {
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onWorksDetailKeydown)
    if (worksDetailPageIx.value === 0) startWorksDetailAutoplay()
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onWorksDetailKeydown)
    stopWorksDetailAutoplay()
    abortWorksDetailArtistBioFetch()
  }
})

watch(worksDetailPageIx, (pageIx) => {
  if (worksDetailIndex.value == null) return
  if (pageIx === 0) restartWorksDetailAutoplay()
  else stopWorksDetailAutoplay()
})

watch(worksDetailGalleryUrls, (urls) => {
  if (urls.length) preloadWorkGalleryImages(urls)
  if (worksDetailIndex.value != null) restartWorksDetailAutoplay()
}, { immediate: true })

function onWorksDetailKeydown(e: KeyboardEvent) {
  if (worksDetailIndex.value == null) return
  if (e.key === 'Escape') {
    e.preventDefault()
    closeWorksDetail()
    return
  }
  if (worksDetailHasArtistPage.value) {
    if (e.key === 'ArrowLeft' && worksDetailPageIx.value === 1) {
      e.preventDefault()
      worksDetailStepPage(-1)
      return
    }
    if (e.key === 'ArrowRight' && worksDetailPageIx.value === 0) {
      e.preventDefault()
      worksDetailStepPage(1)
      return
    }
  }
  if (worksDetailPageIx.value !== 0) return
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    worksDetailStepSlide(-1)
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    worksDetailStepSlide(1)
  }
}

let worksDetailTouchStartX = 0

function onWorksDetailTouchStart(e: TouchEvent) {
  worksDetailTouchStartX = e.changedTouches[0]?.clientX ?? 0
}

function onWorksDetailTouchEnd(e: TouchEvent) {
  if (worksDetailPageIx.value !== 0) return
  const x = e.changedTouches[0]?.clientX ?? worksDetailTouchStartX
  const dx = x - worksDetailTouchStartX
  if (Math.abs(dx) < 48) return
  worksDetailStepSlide(dx < 0 ? 1 : -1)
}

/** 作品區：單行無縫跑馬燈（可拖曳；prefers-reduced-motion 時僅停自動捲動） */
const worksSegmentRef = ref<HTMLElement | null>(null)
const worksOffsetPx = ref(0)
const worksDragging = ref(false)
let worksPointerId: number | null = null
let worksLastPointerX = 0
let worksMarqueeCycleWidth = 0
let worksMarqueeRafId: number | null = null
let worksMarqueeLastTs = 0
let worksResizeObserver: ResizeObserver | null = null

const WORKS_MARQUEE_PX_PER_SEC = 48

function measureWorksMarqueeSegment() {
  const seg = worksSegmentRef.value
  const track = seg?.parentElement
  if (!seg || !(track instanceof HTMLElement)) {
    worksMarqueeCycleWidth = 0
    return
  }
  const segW = seg.getBoundingClientRect().width
  const gapStr = window.getComputedStyle(track).columnGap ?? window.getComputedStyle(track).gap
  let gapPx = 0
  if (gapStr && gapStr !== 'normal') {
    const px = Number.parseFloat(gapStr)
    gapPx = Number.isFinite(px) ? px : 0
  }
  worksMarqueeCycleWidth = segW + gapPx
  normalizeWorksMarqueeOffset()
}

function normalizeWorksMarqueeOffset() {
  const w = worksMarqueeCycleWidth
  if (w <= 0) return
  let o = worksOffsetPx.value
  while (o <= -w) o += w
  while (o > 0) o -= w
  if (o !== worksOffsetPx.value) worksOffsetPx.value = o
}

function worksMarqueeFrame(ts: number) {
  worksMarqueeRafId = requestAnimationFrame(worksMarqueeFrame)
  const w = worksMarqueeCycleWidth
  if (!worksMarqueeLastTs) worksMarqueeLastTs = ts
  const dt = Math.min(0.1, (ts - worksMarqueeLastTs) / 1000)
  worksMarqueeLastTs = ts

  if (!worksDragging.value && heroMotionOk.value && w > 0) {
    worksOffsetPx.value -= WORKS_MARQUEE_PX_PER_SEC * dt
    normalizeWorksMarqueeOffset()
  }
}

function startWorksMarqueeLoop() {
  if (typeof window === 'undefined') return
  if (worksMarqueeRafId != null) return
  worksMarqueeRafId = requestAnimationFrame(worksMarqueeFrame)
}

function stopWorksMarqueeLoop() {
  if (worksMarqueeRafId != null && typeof window !== 'undefined') {
    cancelAnimationFrame(worksMarqueeRafId)
  }
  worksMarqueeRafId = null
  worksMarqueeLastTs = 0
}

function bindWorksMarqueeSizing() {
  worksResizeObserver?.disconnect()
  worksResizeObserver = null
  nextTick(() => {
    measureWorksMarqueeSegment()
    const el = worksSegmentRef.value
    const track = el?.parentElement instanceof HTMLElement ? el.parentElement : null
    if (!el || typeof ResizeObserver === 'undefined') return
    worksResizeObserver = new ResizeObserver(() => measureWorksMarqueeSegment())
    worksResizeObserver.observe(el)
    if (track) worksResizeObserver.observe(track)
  })
}

function onWorksMarqueePointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  worksGestureStartX.value = e.clientX
  worksMarqueeTravelPx.value = 0
  const fromEl = (e.target as HTMLElement | null)?.closest?.('[data-work-card-index]')
  if (fromEl instanceof HTMLElement) {
    const raw = fromEl.dataset.workCardIndex
    const ix = raw != null ? Number(raw) : NaN
    worksPointerDownCardIndex.value = Number.isFinite(ix) ? ix : null
  } else {
    worksPointerDownCardIndex.value = null
  }
  const t = e.currentTarget as HTMLElement
  worksDragging.value = true
  worksLastPointerX = e.clientX
  worksPointerId = e.pointerId
  t.setPointerCapture(e.pointerId)
}

function onWorksMarqueePointerMove(e: PointerEvent) {
  if (!worksDragging.value || worksPointerId !== e.pointerId) return
  const dx = e.clientX - worksLastPointerX
  worksMarqueeTravelPx.value = Math.max(
    worksMarqueeTravelPx.value,
    Math.abs(e.clientX - worksGestureStartX.value),
  )
  worksLastPointerX = e.clientX
  worksOffsetPx.value += dx
  normalizeWorksMarqueeOffset()
}

function onWorksMarqueePointerUp(e: PointerEvent) {
  if (worksPointerId !== e.pointerId) return
  const tapCardIx = worksPointerDownCardIndex.value
  const travel = worksMarqueeTravelPx.value
  worksPointerDownCardIndex.value = null
  const t = e.currentTarget as HTMLElement
  worksDragging.value = false
  worksPointerId = null
  try {
    t.releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
  /** 跑馬燈持續位移時 click 常對不到元素，改於 pointerup 開啟 */
  const TAP_PX = 24
  if (tapCardIx != null && travel <= TAP_PX) {
    openWorksDetail(tapCardIx)
  }
}

function onWorksMarqueePointerCancel(e: PointerEvent) {
  if (worksPointerId !== e.pointerId) return
  worksPointerDownCardIndex.value = null
  const t = e.currentTarget as HTMLElement
  worksDragging.value = false
  worksPointerId = null
  try {
    t.releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function onWorksMarqueeLostPointerCapture(e: PointerEvent) {
  if (worksPointerId !== e.pointerId) return
  worksDragging.value = false
  worksPointerId = null
  worksPointerDownCardIndex.value = null
}

watch(lang, (l) => {
  document.documentElement.lang = l === 'zh' ? 'zh-Hant' : 'en'
  localStorage.setItem('usaf-lang', l)
  admissionTab.value = 'notes'
  bindWorksMarqueeSizing()
})

/** 「關於我們」上方互動區：八格網格；sx／sy（垂直／水平）主線跟游標，側直線為左右半區中線 */
const aboutGlowRef = ref<HTMLElement | null>(null)
/** 區塊內游標對應 0–100%（分界與高光皆由此推算；閒置時由 requestAnimationFrame 緩動）*/
const aboutGlowGlobalX = ref(50)
const aboutGlowGlobalY = ref(48)
/** 游標目前是否在本區 DOM 上 */
const aboutGlowPointerInside = ref(false)
/** 上一筆 pointer 活動時間（performance.now）；區內且在此時間窗內由游標駕駛，否則交給閒置漂移 */
let aboutGlowLastPointerActivityMs = 0
const ABOUT_GLOW_POINTER_SILENCE_MS = 420

let aboutGlowIdleRafId: number | null = null

function stopAboutGlowIdleLoop() {
  if (aboutGlowIdleRafId != null && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(aboutGlowIdleRafId)
    aboutGlowIdleRafId = null
  }
}

function clampAboutGlowGlobal(n: number): number {
  return Math.min(100, Math.max(0, n))
}

function tickAboutGlowIdleDrift(now: number) {
  const t = now * 0.000135
  const targetX =
    50 + 11 * Math.sin(t * 0.71 + 0.15) + 6 * Math.sin(t * 1.29 + 0.92) + 3 * Math.sin(t * 2.07 + 1.8)
  const targetY =
    48 + 9 * Math.cos(t * 0.63 + 0.48) + 5 * Math.sin(t * 1.14 + 1.97) + 3.5 * Math.cos(t * 1.93 + 0.31)
  aboutGlowGlobalX.value = clampAboutGlowGlobal(
    aboutGlowGlobalX.value + (targetX - aboutGlowGlobalX.value) * 0.056,
  )
  aboutGlowGlobalY.value = clampAboutGlowGlobal(
    aboutGlowGlobalY.value + (targetY - aboutGlowGlobalY.value) * 0.056,
  )
}

function aboutGlowIdleFrame(ts: DOMHighResTimeStamp) {
  aboutGlowIdleRafId = requestAnimationFrame(aboutGlowIdleFrame)
  if (!heroMotionOk.value) return
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }
  const now = typeof performance !== 'undefined' ? performance.now() : ts
  if (
    aboutGlowPointerInside.value &&
    now - aboutGlowLastPointerActivityMs < ABOUT_GLOW_POINTER_SILENCE_MS
  ) {
    return
  }
  tickAboutGlowIdleDrift(now)
}

function startAboutGlowIdleLoop() {
  if (!SHOW_ABOUT_GLOW) return
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') return
  stopAboutGlowIdleLoop()
  aboutGlowIdleRafId = requestAnimationFrame(aboutGlowIdleFrame)
}

function clampGlowSplitPct(n: number): number {
  return Math.min(94, Math.max(6, n))
}

/** 八格：直向以游標 sx 分兩大欄、每欄再均分；橫向 sy 分兩列。換算該欄內高光 0–100％ */
function columnOctLocalHighlightX(globalXPct: number, splitX: number, band: 0 | 1 | 2 | 3): number {
  const g = Math.min(100, Math.max(0, globalXPct))
  const sx = Math.min(100, Math.max(0, splitX))
  const b0 = 0
  const b1 = sx * 0.5
  const b2 = sx
  const b3 = sx + (100 - sx) * 0.5
  const b4 = 100
  const bounds: [number, number, number, number, number] = [b0, b1, b2, b3, b4]
  const lo = bounds[band]!
  const hi = bounds[band + 1]!
  const w = hi - lo
  if (w <= 1e-6) return 50
  let v: number
  if (g <= lo) v = 0
  else if (g >= hi) v = 100
  else v = ((g - lo) / w) * 100
  return Math.round(Math.min(100, Math.max(0, v)) * 100) / 100
}

const aboutGlowStyle = computed(() => {
  const gx = aboutGlowGlobalX.value
  const gy = aboutGlowGlobalY.value
  const sx = clampGlowSplitPct(gx)
  const sy = clampGlowSplitPct(gy)
  const style: Record<string, string> = {
    '--about-cross-x': `${sx}%`,
    '--about-cross-y': `${sy}%`,
  }
  for (const row of [0, 1] as const) {
    for (const col of [0, 1, 2, 3] as const) {
      const lx = columnOctLocalHighlightX(gx, sx, col)
      style[`--about-glow-r${row}c${col}-x`] = `${lx}%`
    }
  }
  return style
})

function syncAboutGlowFromPointer(clientX: number, clientY: number) {
  const el = aboutGlowRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0) return
  const x = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100))
  const y = Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100))
  aboutGlowGlobalX.value = x
  aboutGlowGlobalY.value = y
}

function bumpAboutGlowPointerActivity() {
  aboutGlowLastPointerActivityMs =
    typeof performance !== 'undefined' ? performance.now() : typeof Date !== 'undefined' ? Date.now() : 0
}

function onAboutGlowPointerMove(e: PointerEvent) {
  if (!heroMotionOk.value) return
  aboutGlowPointerInside.value = true
  bumpAboutGlowPointerActivity()
  syncAboutGlowFromPointer(e.clientX, e.clientY)
}

function onAboutGlowPointerEnter(e: PointerEvent) {
  if (!heroMotionOk.value) return
  aboutGlowPointerInside.value = true
  bumpAboutGlowPointerActivity()
  syncAboutGlowFromPointer(e.clientX, e.clientY)
}

function onAboutGlowPointerLeave() {
  aboutGlowPointerInside.value = false
}

function setLang(l: Lang) {
  lang.value = l
  menuOpen.value = false
}

const navAnchors = computed(() =>
  ['about', 'schedule', 'admission', 'works', 'map'].map((id) => ({
    id,
    label: txt.value.nav[id as keyof typeof txt.value.nav],
  })),
)

const SECTION_HEADING_SELECTOR =
  '.section__head, .section__title, .admission-panel__title, .works-board__title'

function getNavAnchorOffset(): number {
  const header = document.querySelector<HTMLElement>('.header')
  if (header) {
    return Math.ceil(header.getBoundingClientRect().height) + 12
  }
  return 80
}

function getHeroAboutParallaxMetrics() {
  const hero = document.getElementById('hero')
  if (!hero) return null
  const trigger = ScrollTrigger.getAll().find((t) => t.trigger === hero)
  if (!trigger) return null
  return {
    progress: trigger.progress,
    marginShift: hero.offsetHeight * HERO_ABOUT_MARGIN_SHIFT_RATIO,
  }
}

function isSectionAfterAbout(section: HTMLElement): boolean {
  const about = document.getElementById('about')
  if (!about) return false
  return Boolean(section.compareDocumentPosition(about) & Node.DOCUMENT_POSITION_PRECEDING)
}

function measureSectionScrollTop(section: HTMLElement): number {
  ScrollTrigger.refresh()
  const heading =
    section.querySelector<HTMLElement>(SECTION_HEADING_SELECTOR) ?? section
  const offset = getNavAnchorOffset()
  const scrollY = window.scrollY
  const rectTop = heading.getBoundingClientRect().top

  if (isSectionAfterAbout(section)) {
    const parallax = getHeroAboutParallaxMetrics()
    if (parallax) {
      const layoutBase = rectTop + scrollY + parallax.marginShift * parallax.progress
      return Math.max(0, layoutBase - parallax.marginShift - offset)
    }
  }

  return Math.max(0, rectTop + scrollY - offset)
}

function scrollToSection(id: string) {
  if (typeof window === 'undefined') return
  const section = document.getElementById(id)
  if (!section) return

  menuOpen.value = false
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({
    top: measureSectionScrollTop(section),
    behavior: reduced ? 'auto' : 'smooth',
  })
}

function scrollToPageTop() {
  if (typeof window === 'undefined') return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
}



</script>

<template>

  <div class="page">
    <header class="header">
      <div class="header__inner">
        <a
          href="https://fvl.clab.org.tw/"
          class="brand"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img class="brand__mark" src="/skyward.svg" width="120" height="120" :alt="txt.siteName" />
        </a>

        <div class="header__end">
          <nav id="site-nav" class="nav" :data-open="menuOpen">
            <ul class="nav__list">
              <li v-for="item in navAnchors" :key="item.id">
                <button type="button" class="nav__link" @click="scrollToSection(item.id)">
                  <span class="nav__link__label">{{ item.label }}</span>
                </button>
              </li>
            </ul>
          </nav>
          <div class="header__tools">
            <button
              v-if="lang === 'zh'"
              type="button"
              class="lang__solo"
              :aria-label="txt.langSwitch"
              @click="setLang('en')"
            >
              EN
            </button>
            <button
              v-else
              type="button"
              class="lang__solo"
              :aria-label="txt.langSwitch"
              @click="setLang('zh')"
            >
              中
            </button>
            <button
              type="button"
              class="nav-toggle"
              :aria-expanded="menuOpen"
              aria-controls="site-nav"
              @click="menuOpen = !menuOpen"
            >
              <span class="nav-toggle__bar" />
              <span class="nav-toggle__bar" />
            </button>
          </div>
        </div>
      </div>
    </header>

    <main>
      <section
        id="hero"
        class="hero"
        @mouseenter="onHeroStripeMouseEnter"
        @mousemove="onHeroStripePointerMove"
        @mouseleave="onHeroStripeMouseLeave"
      >
        <div class="hero_title">
          <div class="hero_title__stack">
            <img
              class="hero_title__img"
              src="/title.svg"
              alt="FUTURE VISION LAB @ SKYWARD 晴空季"
              decoding="async"
            />
          </div>
        </div>
        <div
          v-if="HERO_BACKGROUND_PHOTO"
          ref="heroPhotoWrapRef"
          class="hero__photo"
          aria-hidden="true"
        />
        <canvas
          v-else
          id="hero-gradient-canvas"
          class="hero__canvas"
          data-transition-in
          aria-hidden="true"
        />
        <div class="hero__scrim" aria-hidden="true" />
        <canvas
          v-if="HERO_BACKGROUND_PHOTO && heroMotionOk"
          ref="heroGridCanvasRef"
          class="hero__grid-canvas"
          aria-hidden="true"
        />
        <div class="hero__backdrop" aria-hidden="true" />
        <div v-if="SHOW_HERO_WAVE" class="hero__wave" aria-hidden="true">
          <svg
            class="hero__wave-svg"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 64"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id="hero-wave-grad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stop-color="#162d7a" />
                <stop offset="38%" stop-color="#2a52c4" />
                <stop offset="52%" stop-color="#5b9fd4" />
                <stop offset="100%" stop-color="#e8b84a" />
              </linearGradient>
            </defs>
            <path
              class="hero__wave-path"
              fill="url(#hero-wave-grad)"
              d="M0,34 C240,62 380,14 620,38 C760,54 940,22 1120,40 C1260,52 1380,18 1440,30 L1440,64 L0,64 Z"
            />
          </svg>
        </div>
       
        <div class="hero__inner">
          <div class="hero__cta">
            <span class="hero__cta-ripple" aria-hidden="true">
              <span class="hero__cta-ripple__ring" />
              <span class="hero__cta-ripple__ring" />
              <span class="hero__cta-ripple__ring" />
            </span>
            <button type="button" class="btn btn--ghost hero__cta-btn" @click="scrollToSection('schedule')">
              {{ txt.hero.cta }}
            </button>
          </div>
        </div>
        <div class="hero_title-bottom">
          <img
            class="hero_title-bottom__img"
            src="/title2.svg"
            alt="晴空季活動資訊"
            decoding="async"
          />
        </div>
      </section>

      <section
        v-if="SHOW_ABOUT_GLOW"
        ref="aboutGlowRef"
        class="about-glow"
        :aria-label="txt.aboutGlow.ariaLabel"
        :style="aboutGlowStyle"
        @pointermove="onAboutGlowPointerMove"
        @pointerdown="onAboutGlowPointerMove"
        @pointerenter="onAboutGlowPointerEnter"
        @pointerleave="onAboutGlowPointerLeave"
      >
        <div class="about-glow__viewport" aria-hidden="true">
          <div class="about-glow__cells">
            <div class="about-glow__cell about-glow__cell--r0c0" />
            <div class="about-glow__cell about-glow__cell--r0c1" />
            <div class="about-glow__cell about-glow__cell--r0c2" />
            <div class="about-glow__cell about-glow__cell--r0c3" />
            <div class="about-glow__cell about-glow__cell--r1c0" />
            <div class="about-glow__cell about-glow__cell--r1c1" />
            <div class="about-glow__cell about-glow__cell--r1c2" />
            <div class="about-glow__cell about-glow__cell--r1c3" />
          </div>
          <div class="about-glow__cross">
            <span class="about-glow__cross-line about-glow__cross-line--v about-glow__cross-line--v1" />
            <span class="about-glow__cross-line about-glow__cross-line--v about-glow__cross-line--v2" />
            <span class="about-glow__cross-line about-glow__cross-line--v about-glow__cross-line--v3" />
            <span class="about-glow__cross-line about-glow__cross-line--h" />
          </div>
        </div>
      </section>

      <section id="about" class="section section--about">
        <div class="section__inner section__inner--about">
          <div class="about-block__head">
              <div class="about_title">
              <h1>About us</h1>
              </div>
           <h1 class="section__title about-block__title">{{ txt.about.title }}</h1>
            <a
              class="about-block__more"
              :href="txt.about.officialAboutUrl"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="txt.about.officialAboutAria"
            >
              {{ txt.about.moreLabel }}
            </a>
            <div class="hero_logo">
              <img
                class="hero_logo__img"
                src="/logo.svg"
                alt="FUTURE VISION LAB"
                decoding="async"
              />
            </div>
          
          </div>
          <div class="prose about-block__prose">
            <p
              v-for="(para, i) in txt.about.body.split('\n\n')"
              :key="i"
              class="about-block__para"
            >
              {{ para }}
            </p>
          </div>
        </div>
      </section>

      <section id="schedule" class="section section--schedule-grad">
        <div class="section__inner section__inner--schedule">
          <div class="section__head">
            <h2 id="schedule-heading" class="section__title">{{ txt.schedule.title }}</h2>
            <div
              v-if="txt.schedule.infoLines?.length"
              class="section__note section__note--schedule-info"
            >
              <p
                v-for="(line, i) in txt.schedule.infoLines"
                :key="`sch-info-${i}`"
              >
                {{ line }}
              </p>
            </div>
          </div>
          <ScheduleCalendar
            :lang="lang"
            :schedule="txt.schedule"
            :openable-work-titles="openableWorkTitles"
            @select-program="openWorksDetailByProgram"
          />
        </div>
      </section>

    

      <section id="admission" class="section section--admission-panel">
        <div class="section__inner admission-panel">
          <h2 class="admission-panel__title">{{ txt.admission.title }}</h2>
          <div
            class="admission-panel__tabs"
            role="tablist"
            :aria-label="txt.admission.title"
          >
            <button
              id="admission-tab-notes"
              type="button"
              class="admission-panel__tab"
              role="tab"
              aria-controls="admission-panel-notes"
              :aria-selected="admissionTab === 'notes'"
              @click="admissionTab = 'notes'"
            >
              {{ txt.admission.tabNotes }}
            </button>
            <button
              id="admission-tab-tickets"
              type="button"
              class="admission-panel__tab"
              role="tab"
              aria-controls="admission-panel-tickets"
              :aria-selected="admissionTab === 'tickets'"
              @click="admissionTab = 'tickets'"
            >
              {{ txt.admission.tabTickets }}
            </button>
          </div>
          <Transition name="admission-panel-fade" mode="out-in">
            <div
              v-if="admissionTab === 'notes'"
              id="admission-panel-notes"
              key="admission-notes"
              class="admission-panel__frame"
              role="tabpanel"
              aria-labelledby="admission-tab-notes"
            >
              <ul class="admission-panel__list">
                <li
                  v-for="(line, i) in txt.admission.notesItems"
                  :key="`adm-n-${i}`"
                  class="admission-panel__card"
                >
                  <span class="admission-panel__num" aria-hidden="true">{{
                    String(i + 1).padStart(2, '0')
                  }}</span>
                  <p>{{ line }}</p>
                </li>
              </ul>
            </div>
            <div
              v-else
              id="admission-panel-tickets"
              key="admission-tickets"
              class="admission-panel__frame"
              role="tabpanel"
              aria-labelledby="admission-tab-tickets"
            >
              <ul class="admission-panel__list">
                <template
                  v-for="(row, i) in ticketDisplayRows"
                  :key="`adm-t-${i}`"
                >
                  <li
                    v-if="row.kind === 'heading'"
                    class="admission-panel__section-heading"
                  >
                    {{ row.text }}
                  </li>
                  <li
                    v-else-if="row.kind === 'lead' || row.kind === 'note'"
                    class="admission-panel__aside"
                  >
                    <p>{{ row.text }}</p>
                  </li>
                  <li v-else class="admission-panel__card">
                    <span class="admission-panel__num" aria-hidden="true">{{
                      String(row.num).padStart(2, '0')
                    }}</span>
                    <p>
                      {{ row.text
                      }}<a
                        v-if="row.url"
                        :href="row.url"
                        class="admission-panel__link"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ row.url }}</a
                      >
                    </p>
                  </li>
                </template>
              </ul>
            </div>
          </Transition>
        </div>
      </section>


      <section id="works" class="section section--works-board">
        <div id="vanta" ref="vantaRef" class="vanta-test" aria-hidden="true" />
     

        <div class="works-board__backdrop" aria-hidden="true" />
        <div
          class="works-board__drag"
          :class="{ 'works-board__drag--dragging': worksDragging }"
          @pointerdown="onWorksMarqueePointerDown"
          @pointermove="onWorksMarqueePointerMove"
          @pointerup="onWorksMarqueePointerUp"
          @pointercancel="onWorksMarqueePointerCancel"
          @lostpointercapture="onWorksMarqueeLostPointerCapture"
        >
             
          <div class="section__inner section__inner--works">
            <header class="works-board__heading">
              <h2 id="works-board-heading" class="works-board__title">{{ txt.works.title }}</h2>
            </header>
        </div>
        <div
          class="works-marquee-bleed"
          role="region"
          aria-roledescription="carousel"
          :aria-label="txt.works.title"
        >
          <div class="works-marquee">
            <div
              class="works-marquee__track"
              :style="{ transform: `translate3d(${worksOffsetPx}px,0,0)` }"
            >
              <div ref="worksSegmentRef" class="works-marquee__segment">
                <article
                  v-for="(card, i) in worksCards"
                  :key="`w-a-${card.id ?? i}-${card.title}`"
                  class="work-card work-card--marquee"
                  :class="workCardUnitClass(card, i)"
                  role="button"
                  tabindex="0"
                  :data-work-card-index="i"
                  :aria-label="`${card.title} — ${txt.works.detailOpenHint}`"
                  @keydown.enter.prevent="openWorksDetail(i)"
                  @keydown.space.prevent="openWorksDetail(i)"
                >
                  <div class="work-card__media">
                    <img
                      v-if="card.image"
                      :src="card.image"
                      :alt="card.title"
                      class="work-card__img"
                      draggable="false"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div class="work-card__body">
                    <div class="work-card__toolbar">
                      <h3 class="work-card__name">{{ card.title }}</h3>
                      <span class="work-card__accent" aria-hidden="true">+</span>
                    </div>
                    <p class="work-card__text">{{ workCardMarqueeText(card) }}</p>
                  </div>
                </article>
              </div>
              <div class="works-marquee__segment" aria-hidden="true">
                <article
                  v-for="(card, i) in worksCards"
                  :key="`w-b-${card.id ?? i}-${card.title}`"
                  class="work-card work-card--marquee"
                  :class="workCardUnitClass(card, i)"
                  tabindex="-1"
                  :data-work-card-index="i"
                >
                  <div class="work-card__media">
                    <img
                      v-if="card.image"
                      :src="card.image"
                      :alt="card.title"
                      class="work-card__img"
                      draggable="false"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div class="work-card__body">
                    <div class="work-card__toolbar">
                      <h3 class="work-card__name">{{ card.title }}</h3>
                      <span class="work-card__accent" aria-hidden="true">+</span>
                    </div>
                    <p class="work-card__text">{{ workCardMarqueeText(card) }}</p>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      <section id="map" class="section section--map-grad">
        <div class="section__inner">
          <h2 class="section__title">{{ txt.map.title }}</h2>
          <p class="map__hint">{{ txt.map.hint }}</p>
          <div class="map-area" role="region" :aria-label="txt.map.title">
            <img src="/map.jpeg" alt="map" class="map_img" />
          </div>
        </div>
      </section>

      <section id="credits" class="section section--credits section--bottom">
        <div class="section__inner section__inner--credits">
          <h2 class="section__title">{{ txt.credits.title }}</h2>
          <p class="credits__subtitle">{{ txt.credits.subtitle }}</p>

          <div
            v-for="(group, gi) in txt.credits.groups"
            :key="`credits-g-${gi}`"
            class="credits__group"
          >
            <div
              v-for="(row, ri) in group"
              :key="`credits-r-${gi}-${ri}`"
              class="credits__row"
            >
              <span class="credits__role">{{ row.role }}</span>
              <span class="credits__names">{{ row.names }}</span>
            </div>
          </div>

          <div class="credits__group credits__group--artists">
            <div class="credits__row credits__row--artists">
              <span class="credits__role">{{ txt.credits.artists.role }}</span>
              <span class="credits__names">{{ txt.credits.artists.names }}</span>
            </div>
          </div>

          <ul class="credits__orgs" role="list">
            <li
              v-for="(org, oi) in txt.credits.orgs"
              :key="`credits-org-${oi}`"
              class="credits__org"
            >
              <span class="credits__org-role">{{ org.role }}</span>
              <div v-if="org.logo" class="credits__org-logo-wrap">
                <img
                  class="credits__org-logo"
                  :src="org.logo"
                  :alt="org.name"
                  decoding="async"
                />
              </div>
              <span class="credits__org-name">{{ org.name }}</span>
            </li>
          </ul>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="footer__inner">
        <p>{{ txt.footer.organizer }}</p>
        <p class="copyfooter__">
          © 2026 財團法人臺灣生活美學基金會. All Rights Reserved.</p>
      </div>
    </footer>

    <aside class="social-rail" :aria-label="txt.social.railAria">
      <div class="social-rail__pill">
        <a
          class="social-rail__link"
          :href="txt.social.urls.youtube"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="txt.social.youtube"
        >
          <svg class="social-rail__icon social-rail__icon--fill" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M23 7.5c0-1.4-.3-2.5-.9-3.4-.7-1-1.7-1.5-3.1-1.8C16.2 2 12 2 12 2s-4.2 0-7 .3c-1.4.3-2.4.9-3.1 1.8C1.3 5 1 6.1 1 7.5v9c0 1.4.3 2.5.9 3.4.7 1 1.8 1.6 3.1 1.8 2.8.3 7 .3 7 .3s4.2 0 7-.3c1.4-.2 2.4-.8 3.1-1.8.6-.9.9-2 .9-3.4v-9zM10 15.5v-7l6 3.5-6 3.5z"
            />
          </svg>
        </a>
        <a
          class="social-rail__link"
          :href="txt.social.urls.instagram"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="txt.social.instagram"
        >
          <svg class="social-rail__icon social-rail__icon--stroke" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z"
            />
            <circle cx="12" cy="12" r="3.25" fill="none" stroke="currentColor" stroke-width="1.75" />
            <circle cx="17" cy="7" r="1" fill="currentColor" />
          </svg>
        </a>
        <a
          class="social-rail__link"
          :href="txt.social.urls.facebook"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="txt.social.facebook"
        >
          <svg class="social-rail__icon social-rail__icon--stroke" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
            />
          </svg>
        </a>
      </div>

      <div class="social-rail__extras">
        <button
          type="button"
          class="social-rail__top"
          :aria-label="txt.social.backToTop"
          @click="scrollToPageTop"
        >
          <svg class="social-rail__top-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 19V5m0 0-7 7m7-7 7 7"
            />
          </svg>
        </button>
      </div>
    </aside>

    <Teleport to="body">
      <div
        v-if="worksDetailIndex !== null && worksDetailCard"
        class="works-detail-scrim"
        @click.self="closeWorksDetail"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="works-detail-title"
          class="works-detail"
          @click.stop
        >
          <header
            class="works-detail__header"
            :class="{ 'works-detail__header--navigable': worksDetailHasArtistPage }"
          >
            <h2 id="works-detail-title" class="works-detail__dialog-title" tabindex="-1">
              {{ worksDetailCard.title }}
            </h2>
            <div
              class="works-detail__tabs"
              role="tablist"
              :aria-label="worksDetailCard.title"
            >
              <button
                type="button"
                class="works-detail__tab"
                :class="{ 'works-detail__tab--active': worksDetailPageIx === 0 }"
                role="tab"
                :aria-selected="worksDetailPageIx === 0"
                aria-controls="works-detail-page-work"
                @click="worksDetailSetPage(0)"
              >
                {{ txt.works.detailWorkTab }}
              </button>
              <button
                v-if="worksDetailHasArtistPage"
                type="button"
                class="works-detail__tab"
                :class="{ 'works-detail__tab--active': worksDetailPageIx === 1 }"
                role="tab"
                :aria-selected="worksDetailPageIx === 1"
                aria-controls="works-detail-page-artist"
                @click="worksDetailSetPage(1)"
              >
                {{ txt.works.detailArtistTab }}
              </button>
            </div>
            <button
              type="button"
              class="works-detail__close"
              :aria-label="txt.works.detailCloseAria"
              @click="closeWorksDetail"
            >
              <span class="works-detail__close-icon" aria-hidden="true">×</span>
            </button>
          </header>
          <div class="works-detail__divider" aria-hidden="true" />
          <div
            class="works-detail__pages"
            :class="{
              'works-detail__pages--artist': worksDetailPageIx === 1,
              'works-detail__pages--single': !worksDetailHasArtistPage,
            }"
          >
            <div
              id="works-detail-page-work"
              class="works-detail__page works-detail__page--work"
              role="tabpanel"
              :aria-hidden="worksDetailPageIx === 1 ? 'true' : undefined"
            >
              <div class="works-detail__main">
                <div
                  class="works-detail__media"
                  :class="{ 'works-detail__media--with-artists': worksDetailArtists.length > 0 }"
                >
                  <div class="works-detail__gallery">
                    <div
                      class="works-detail__carousel"
                      @touchstart.passive="onWorksDetailTouchStart"
                      @touchend="onWorksDetailTouchEnd"
                    >
                      <button
                        v-if="worksDetailGalleryUrls.length > 1"
                        type="button"
                        class="works-detail__arrow works-detail__arrow--prev"
                        :aria-label="txt.works.detailPrevAria"
                        @click="worksDetailStepSlide(-1)"
                      />
                      <div class="works-detail__viewport">
                        <template v-if="worksDetailGalleryUrls.length">
                          <img
                            v-for="(url, si) in worksDetailGalleryUrls"
                            :key="`${worksDetailIndex}-${si}-${url}`"
                            :src="url"
                            :alt="worksDetailCard.title"
                            class="works-detail__img"
                            :class="{ 'works-detail__img--active': worksDetailActiveSlideIx === si }"
                            decoding="async"
                          />
                        </template>
                        <div v-else class="works-detail__placeholder" aria-hidden="true" />
                      </div>
                      <button
                        v-if="worksDetailGalleryUrls.length > 1"
                        type="button"
                        class="works-detail__arrow works-detail__arrow--next"
                        :aria-label="txt.works.detailNextAria"
                        @click="worksDetailStepSlide(1)"
                      />
                    </div>
                    <div
                      v-if="worksDetailGalleryUrls.length > 1"
                      class="works-detail__dots"
                      role="tablist"
                    >
                      <button
                        v-for="(_u, di) in worksDetailGalleryUrls"
                        :key="'wdot-' + di"
                        type="button"
                        class="works-detail__dot"
                        :class="{ 'works-detail__dot--active': worksDetailSlideIx === di }"
                        :aria-label="`${di + 1} / ${worksDetailGalleryUrls.length}`"
                        :aria-current="worksDetailSlideIx === di ? 'true' : undefined"
                        @click="worksDetailGoToSlide(di)"
                      />
                    </div>
                  </div>
                </div>
                <div class="works-detail__prose">
                  <div class="works-detail__body">
                    <p
                      v-for="(para, bi) in worksDetailBodyParagraphs"
                      :key="'wbody-' + bi"
                      class="works-detail__para"
                    >
                      {{ para }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div
              v-if="worksDetailHasArtistPage"
              id="works-detail-page-artist"
              class="works-detail__page works-detail__page--artist"
              role="tabpanel"
              :aria-hidden="worksDetailPageIx === 0 ? 'true' : undefined"
            >
              <div class="works-detail__artist-main">
                <div class="works-detail__artist-media" :aria-label="txt.works.detailArtistsAria">
                  <figure
                    v-for="(artist, ai) in worksDetailArtists"
                    :key="`artist-page-${ai}-${artist.id}`"
                    class="works-detail__artist"
                  >
                    <img
                      :src="artist.photoUrl"
                      :alt="artist.name"
                      class="works-detail__artist-photo"
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                </div>
                <div class="works-detail__artist-prose">
                  <template v-for="(artist, ai) in worksDetailArtists" :key="`artist-bio-${ai}-${artist.id}`">
                    <div
                      v-if="worksDetailArtistBioParagraphs(artist).length"
                      class="works-detail__artist-bio"
                    >
                      <h3 class="works-detail__artist-bio-name">
                        {{ artist.name }}
                      </h3>
                      <p
                        v-for="(para, pi) in worksDetailArtistBioParagraphs(artist)"
                        :key="`abio-${ai}-${pi}`"
                        class="works-detail__para"
                      >
                        {{ para }}
                      </p>
                    </div>
                  </template>
                  <div
                    v-if="
                      !worksDetailHasIndividualArtistBio &&
                      worksDetailFallbackBioParagraphs.length
                    "
                    class="works-detail__artist-bio"
                  >
                    <h3 class="works-detail__artist-bio-name">
                      {{ worksDetailArtistBioFallback?.name || worksDetailArtistHeading }}
                    </h3>
                    <p
                      v-for="(para, pi) in worksDetailFallbackBioParagraphs"
                      :key="`fallback-bio-${pi}`"
                      class="works-detail__para"
                    >
                      {{ para }}
                    </p>
                  </div>
                  <template
                    v-if="
                      worksDetailArtistBiosLoading ||
                      (
                        !worksDetailHasIndividualArtistBio &&
                        !worksDetailFallbackBioParagraphs.length
                      )
                    "
                  >
                    <h3 class="works-detail__artist-bio-name">
                      {{ worksDetailArtistHeading }}
                    </h3>
                    <p
                      v-if="worksDetailArtistBiosLoading"
                      class="works-detail__artist-bio-empty"
                    >
                      {{ txt.works.detailArtistBioLoading }}
                    </p>
                    <p
                      v-else
                      class="works-detail__artist-bio-empty"
                    >
                      {{ txt.works.detailArtistBioEmpty }}
                    </p>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <canvas
      id="mouse-trail-invert-canvas"
      class="mouse-trail-invert-canvas"
      aria-hidden="true"
    />
    <canvas
      id="mouse-trail-text-canvas"
      class="mouse-trail-text-canvas"
      aria-hidden="true"
    />
    <canvas
      id="mouse-trail-canvas"
      class="mouse-trail-canvas"
      aria-hidden="true"
    />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..600&family=IBM+Plex+Mono:wght@400;500;600;700&family=Noto+Sans+TC:wght@200..900&family=Playfair+Display:ital,wght@0,400..800;1,400..600&display=swap');
@import url(//fonts.googleapis.com/earlyaccess/notosanstc.css);
*,
*::before,
*::after {
  box-sizing: border-box;
}

:root {
  color-scheme: dark;
  /** 主視覺四色：靛藍 → 陶土橘 → 暖金（降低霓虹感、漸層更柔和） */
  --palette-blue: #1b2f9e;
  --palette-blue-dim: #0e1a5c;
  --palette-orange: #d97b4a;
  --palette-yellow: #e8b84a;
  --palette-purple: #8b6fd4;
  /** 單元標示色：比主色更亮、更醒目 */
  --unit-orange: #ff8f3d;
  --unit-blue: #3d6dff;
  --unit-purple: #b48cff;
  --unit-yellow: #ffe14a;
  --unit-orange-rgb: 255 143 61;
  --unit-blue-rgb: 61 109 255;
  --unit-purple-rgb: 180 140 255;
  --unit-yellow-rgb: 255 225 74;
  --blue-rgb: 27 47 158;
  --orange-rgb: 217 123 74;
  --purple-rgb: 139 111 212;
  --yellow-rgb: 232 184 74;
  /** 場次區由上往下漸層：靛藍 → 天青 → 暖金 */
  --schedule-grad-from: #162d7a;
  --schedule-grad-mid: #4a7fd4;
  --schedule-grad-to: #e0b44a;
  --ink: #f0f4fc;
  --ink-soft: #a8b8e8;
  /** 區塊打底 */
  --paper: #152470;
  --paper-tint: #1e2f8a;
  /** 淺底內文、圖標用深藍 */
  --text-on-light: #111b45;
  /** 深色底上做亮色按鈕時用的字／圖標色 */
  --on-accent: #0e1a52;
  /** 頁面主漸層 */
  --page-bg-from: #121f66;
  --page-bg-to: #c46940;
  --schedule-map-seam: #1a3278;
  --map-corner-text: #eef2ff;
  /** 次要操作底上的字形 */
  --social-alt-fg: #e8eeff;
  --social-alt-bg: rgb(var(--blue-rgb) / 0.88);
  --accent: #e8c04a;
  --accent-soft: rgb(var(--yellow-rgb) / 0.22);
  --line: rgba(255, 255, 255, 0.18);
  /** 區塊／頁面主標題字色（暖白） */
  --section-heading-terracotta: #faf6ee;
  /** Stripe／WebGL */
  --stripe-gradient-color-1: #1b2f9e;
  --stripe-gradient-color-2: #d97b4a;
  --stripe-gradient-color-3: #e8b84a;
  --stripe-gradient-color-4: #0e1a5c;
  --font-display: 'Playfair Display', 'Noto Sans TC', serif;
  --font-body: 'Noto Sans TC', 'DM Sans', system-ui, sans-serif;
  --font-ibm-plex-mono: 'IBM Plex Mono', ui-monospace, monospace;
  --font-noto-sans-tc: 'Noto Sans TC', sans-serif;
  --font-title: var(--font-ibm-plex-mono), var(--font-noto-sans-tc), Helvetica, sans-serif;
  /** 社群直欄 */
  --social-rail-pill: #1a2a7a;
  --social-rail-icon: #dce4ff;
  --social-rail-icon-hover: #ffffff;
  /** 較深藍面板 */
  --surface-raised: #243580;
  --surface-muted: rgb(var(--blue-rgb) / 0.45);
  /** 淺色內容區（作品卡等） */
  --surface-light: #faf8f4;
  --surface-light-hover: #fffdf8;
  /** 場次、入場須知字卡：預設白底，hover 淺藍 */
  --card-info-surface: #ffffff;
  --card-info-surface-hover: #c1adff;
  --text-on-surface: #1a1f3d;
  /**
   * 導覽 scrollIntoView／錨點滾動時預留白：sticky header 高度＋微量呼吸空間，
   * 搭配 safe-area 避免主標題「切」在選單下緣。
   */
  --nav-anchor-offset: max(5rem, calc(4.35rem + env(safe-area-inset-top, 0px)));
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.65;
  color: var(--ink);
  background-color: var(--page-bg-from);
  background-image: linear-gradient(
    155deg,
    var(--page-bg-from) 0%,
    color-mix(in srgb, var(--page-bg-from) 52%, var(--page-bg-to)) 45%,
    var(--page-bg-to) 100%
  );
  background-repeat: no-repeat;
  background-size: 100% 100%;
  -webkit-font-smoothing: antialiased;
}

body:lang(en) {
  font-family: 'DM Sans', 'Noto Sans TC', system-ui, sans-serif;
}

#app {
  min-height: 100vh;
}

a {
  color: var(--accent);
  text-underline-offset: 0.18em;
}

a:hover {
  color: #fff;
}

.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}


/** 錨點滾動時留白，避免區塊主標題被 sticky header 切掉 */
.page main > section[id] .section__head,
.page main > section[id] .section__title,
.page main > section[id] .admission-panel__title,
.page main > section[id] .works-board__title {
  scroll-margin-top: var(--nav-anchor-offset);
}

/* Fixed right social rail — orange pill + extras */
.social-rail {
  position: fixed;
  z-index: 38;
  right: max(0.6rem, env(safe-area-inset-right, 0px));
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding-top: max(4.5rem, env(safe-area-inset-top));
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  box-sizing: border-box;
  pointer-events: none;
}

.social-rail > * {
  pointer-events: auto;
}

.social-rail__pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.45rem 0.55rem 1.55rem;
  min-width: 3.25rem;
  max-width: 3.6rem;
  background:#9978ff;
  border-radius: 999px;
  box-shadow: 0 12px 40px rgb(var(--blue-rgb) / 0.35);
}

.social-rail__link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 0;
  padding: 0;
  color: var(--social-rail-icon);
  text-decoration: none;
  border-radius: 50%;
  background: transparent;
  transition: color 0.15s ease, transform 0.15s ease, background 0.15s ease;
}

.social-rail__link:hover {
  color: var(--social-rail-icon-hover);
  transform: scale(1.06);
}

.social-rail__link:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.social-rail__icon {
  width: 26px;
  height: 26px;
  display: block;
}

.social-rail__icon--sm {
  width: 21px;
  height: 21px;
}

.social-rail__extras {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
}

.social-rail__link--minimal {
  width: 38px;
  height: 38px;
  color: var(--social-alt-fg);
  background: var(--social-alt-bg);
  border-radius: 50%;
  box-shadow: 0 6px 18px rgb(var(--blue-rgb) / 0.35);
}

.social-rail__link--minimal:hover {
  color: #fff;
  background: rgb(var(--blue-rgb) / 0.93);
  transform: translateY(-1px) scale(1.03);
}

.social-rail__top {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--social-alt-fg);
  background: var(--social-alt-bg);
  box-shadow: 0 8px 22px rgb(var(--blue-rgb) / 0.35);
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.social-rail__top:hover {
  background: rgb(var(--blue-rgb) / 0.94);
  color: #fff;
  transform: translateY(-1px);
}

.social-rail__top:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.social-rail__top-icon {
  width: 18px;
  height: 18px;
  display: block;
}

@media (max-width: 360px) {
  .social-rail {
    display: none;
  }
}

@media (max-width: 480px) {
  .social-rail__pill {
    padding: 1.15rem 0.45rem 1.25rem;
    gap: 0.78rem;
  }

  .social-rail__link {
    width: 36px;
    height: 36px;
  }

  .social-rail__icon {
    width: 23px;
    height: 23px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .social-rail__link:hover,
  .social-rail__link--minimal:hover,
  .social-rail__top:hover {
    transform: none;
  }
}

/* Header */
.header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: #000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.header__inner {
  position: relative;
  max-width: none;
  margin: 0 auto;
  padding: 0.7rem clamp(1rem, 3vw, 2.5rem);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(1rem, 3vw, 2.5rem);
}

.header__end {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: clamp(1rem, 2.5vw, 2rem);
  flex: 1 1 auto;
  min-width: 0;
}

.header__tools {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  flex-shrink: 0;
}

.brand {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: clamp(0.55rem, 1.5vw, 0.85rem);
  text-decoration: none;
  color: #fff;
  flex-shrink: 0;
  min-width: 0;
}

.brand:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 4px;
  border-radius: 4px;
}

.brand__mark {
  display: block;
  flex-shrink: 0;
  width: clamp(4rem, 4.5vw, 2.65rem);
  height: clamp(4rem, 4.5vw, 2.65rem);
  object-fit: contain;
  object-position: center;
}

.brand__text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.brand__eyebrow {
  font-size: clamp(0.58rem, 1.1vw, 0.68rem);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  line-height: 1.25;
  white-space: nowrap;
}

.brand__headline {
  font-family: var(--font-title);
  font-size: clamp(1.15rem, 2.4vw, 1.75rem);
  font-weight: 400;
  color: #fff;
  line-height: 1.05;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.nav-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
}

.nav-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.nav-toggle__bar {
  display: block;
  height: 2px;
  width: 22px;
  background: var(--ink);
  margin: 0 auto;
  border-radius: 1px;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.nav-toggle[aria-expanded='true'] .nav-toggle__bar:first-child {
  transform: translateY(4px) rotate(45deg);
}

.nav-toggle[aria-expanded='true'] .nav-toggle__bar:last-child {
  transform: translateY(-4px) rotate(-45deg);
}

.nav {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  justify-content: flex-end;
}

.nav__list {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: clamp(0.15rem, 1.2vw, 0.55rem);
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav__link {
  font: inherit;
  font-size: clamp(0.72rem, 1.1vw, 0.84rem);
  font-weight: 400;
  color: #fff;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.3rem clamp(0.25rem, 0.8vw, 0.45rem);
  border-radius: 0;
  transition: color 0.15s ease;
  white-space: nowrap;
  position: relative;
  isolation: isolate;
}

.nav__link__label {
  position: relative;
  z-index: 1;
  transition: color 0.15s ease;
}

.nav__link::before,
.nav__link::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

/** 白層 difference：疊在文字上方，反相字色 */
.nav__link::before {
  z-index: 2;
  background: #fff;
  mix-blend-mode: difference;
}

/** 藍層 lighten：與滑鼠拖曳文字區一致 */
.nav__link::after {
  z-index: 3;
  background: #1b2f9e;
  mix-blend-mode: lighten;
}

.nav__link:hover::before,
.nav__link:hover::after {
  opacity: 1;
}

.nav__link:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.lang__solo {
  font: inherit;
  font-size: clamp(0.72rem, 1.1vw, 0.82rem);
  font-weight: 500;
  letter-spacing: 0.06em;
  padding: 0.32rem 0.72rem;
  border: 1px solid #fff;
  border-radius: 4px;
  background: transparent;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}

.lang__solo:hover {
  background: #fff;
  color: #000;
}

.lang__solo:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

@media (max-width: 1100px) {
  .header__inner {
    align-items: center;
    flex-wrap: nowrap;
    padding: 0.65rem 1rem;
  }

  .brand__mark {
    width: clamp(1.65rem, 4vw, 2rem);
    height: clamp(1.65rem, 4vw, 2rem);
  }

  .brand__eyebrow {
    font-size: 0.52rem;
    letter-spacing: 0.05em;
  }

  .brand__headline {
    font-size: clamp(0.95rem, 3.8vw, 1.2rem);
  }

  .nav-toggle {
    display: flex;
  }

  /** 僅剩「語切｜選單」在列上；導覽連結全靠下方展開面板 */
  .header__end {
    flex: 0 0 auto;
    flex-shrink: 0;
    min-width: 0;
    justify-content: flex-end;
    gap: 0;
  }

  .nav {
    position: absolute;
    top: calc(100% + 1px);
    left: 0;
    right: 0;
    flex: none;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 0;
    padding: 0.6rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
    margin: 0;
    background: #000;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-bottom: none;
    box-shadow: none;
    display: none;
    z-index: 50;
  }

  .nav[data-open='true'] {
    display: flex;
  }

  .nav__list {
    flex-direction: column;
    align-items: stretch;
    flex-wrap: nowrap;
    width: 100%;
  }

  .nav__link {
    width: 100%;
    text-align: left;
    padding: 0.72rem 0.4rem;
    font-size: 1rem;
    border-radius: 0;
    color: #fff;
  }

  .lang__solo {
    padding: 0.32rem 0.58rem;
    font-size: 0.78rem;
    min-height: 38px;
    min-width: 2.25rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .header__tools {
    gap: 0.4rem;
  }
}

@media (max-width: 520px) {
  .brand__eyebrow {
    display: none;
  }

  .nav-toggle {
    width: 42px;
    height: 42px;
  }
}

/* Hero — WebGL Stripe 或全幅照片底 + 可選底部波浪；scrim 壓在底圖上供 CTA 可讀 */
.hero {
  position: relative;
  isolation: isolate;
  z-index: 1;
  width: 100%;
  max-width: none;
  margin: 0;
  min-height: 100svh;
  min-height: 100dvh;
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  background: transparent;
}

.hero__photo {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.hero__grid-canvas {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  touch-action: none;
}

.hero__canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  --gradient-color-1: var(--stripe-gradient-color-1);
  --gradient-color-2: var(--stripe-gradient-color-2);
  --gradient-color-3: var(--stripe-gradient-color-3);
  --gradient-color-4: var(--stripe-gradient-color-4);
}

.hero__scrim {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  /** 與主視覺：靛藍→陶土橘→暖金（柔和過渡） */
  background: linear-gradient(
    to bottom,
    rgb(var(--blue-rgb) / 0.36) 0%,
    rgb(var(--orange-rgb) / 0.16) min(52%, calc(100% - 160px)),
    rgb(var(--yellow-rgb) / 0.07) 100%
  );
}

.hero__backdrop {
  display: none;
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0.42;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' fill='none'%3E%3Cg stroke='%23d9d5d3' stroke-width='0.45' opacity='0.95'%3E%3Ccircle cx='70' cy='70' r='56'/%3E%3Ccircle cx='70' cy='70' r='40'/%3E%3Cellipse cx='70' cy='70' rx='68' ry='28'/%3E%3C/g%3E%3Cg fill='%23cbc6c4' opacity='0.85'%3E%3Ccircle cx='34' cy='28' r='1.35'/%3E%3Ccircle cx='98' cy='44' r='1.1'/%3E%3Ccircle cx='52' cy='108' r='1.05'/%3E%3Ccircle cx='108' cy='96' r='1.25'/%3E%3Ccircle cx='16' cy='92' r='0.95'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 140px 140px;
}

/** 疊在首屏 Stripe 之上，頂側透明處仍可見 Banner 底；輕 blur 柔化波浪邊緣 */
.hero__wave {
  position: absolute;
  left: -4%;
  right: -4%;
  bottom: -6px;
  z-index: 4;
  line-height: 0;
  pointer-events: none;
  filter: blur(3px);
  -webkit-filter: blur(3px);
}

.hero__wave-svg {
  display: block;
  width: 100%;
  height: clamp(52px, 10vw, 92px);
  vertical-align: top;
  opacity: 0.97;
}

.hero__inner {
  position: absolute;
  z-index: 5;
  inset: 0;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
}

.hero_title {
  position: absolute;
  z-index: 5;
  top: 0;
  left: 0;
  width: 100%;
  padding: clamp(1rem, 2.5vw, 1.75rem) 0 0;
  box-sizing: border-box;
  pointer-events: none;
}

.hero_title__stack {
  position: relative;
  width: 80%;
  margin: 0 auto;
}

.hero_title__img {
  display: block;
  width: 100%;
  height: auto;
  filter: brightness(0) invert(1) drop-shadow(0 2px 14px rgb(0 0 0 / 0.45));
}

/** 關於我們右上角 logo（由 hero 移入） */
.hero_logo {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  width: clamp(24px, 14vw, 96px);
  pointer-events: none;
}

.hero_logo__img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.hero_title-bottom {
  position: absolute;
  z-index: 5;
  bottom: 10%;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding: 0 0 max(1rem, env(safe-area-inset-bottom));
  box-sizing: border-box;
  pointer-events: none;
}

.hero_title-bottom__img {
  display: block;
  width: 100%;
  height: auto;
  filter: brightness(0) invert(1) drop-shadow(0 2px 14px rgb(0 0 0 / 0.45));
}


/** 首屏字卡（螢光綠＋黃色像素飾塊） */
.hero__card {
  position: relative;
  width: min(100%, 34rem);
  flex-shrink: 0;
  margin-left: clamp(-0.35rem, -1.8vw, -1.1rem);
  transform: translateY(clamp(-0.5rem, -1.5vh, -1rem));
}

.hero__card-green {
  position: relative;
  overflow: hidden;
  padding: clamp(1rem, 2.5vw, 1.35rem) clamp(1rem, 3vw, 1.5rem) clamp(2.5rem, 6vw, 3.25rem);
  background: transparent;
  color: #ffff;
  clip-path: polygon(
    0 0,
    100% 0,
    100% 40%,
    86% 40%,
    86% 68%,
    72% 68%,
    72% 100%,
    0 100%
  );
}

.hero__card-body {
  position: relative;
}

.hero__card-zh {
  margin: 0 0 0.85rem;
  font-size: clamp(0.82rem, 1.8vw, 0.95rem);
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: 0.02em;
}

.hero__card-en {
  margin: 0 0 1.35rem;
  font-family: var(--font-body);
  font-size: clamp(1.35rem, 3.8vw, 2rem);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.02em;
}

.hero__card-en span {
  display: block;
}

.hero__card-date {
  display: flex;
  align-items: flex-start;
  gap: 0;
  margin: 0;
  font-size: clamp(0.95rem, 2.2vw, 1.15rem);
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0.01em;
}

.hero__card-date-square {
  display: block;
  flex-shrink: 0;
  width: 0.55rem;
  height: 0.55rem;
  margin-top: -0.72rem;
  margin-right: 0.15rem;
  background: #000;
}

.hero__card-accent {
  position: absolute;
  right: 0;
  bottom: 0;
  width: clamp(5.25rem, 20vw, 7rem);
  height: clamp(3.75rem, 14vw, 5rem);
  background: #ffe800;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 0.35rem 0.4rem 0.3rem 0.3rem;
}

.hero__card-pixels {
  display: block;
  width: 100%;
  height: auto;
  image-rendering: pixelated;
}

.hero__inner .hero__cta-btn {
  pointer-events: auto;
}

.hero__kicker {
  position: relative;
  z-index: 1;
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-soft);
  margin: 0 0 1rem;
}

.hero__title {
  position: relative;
  z-index: 1;
  font-family: var(--font-display);
  font-weight: 500;
  font-size: clamp(2.75rem, 7vw, 4.25rem);
  line-height: 1.08;
  margin: 0 auto 1.25rem;
  max-width: 18ch;
  text-align: center;
  color: #fff;
}

.hero .btn--ghost {
  position: relative;
  z-index: 1;
  align-self: center;
}

/** 查看場次 CTA：同心波紋擴散 */
.hero__cta {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.hero__cta-ripple {
  position: absolute;
  inset: -1.1rem;
  pointer-events: none;
  z-index: 0;
}

.hero__cta-ripple__ring {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1px solid rgb(255 255 255 / 0.5);
  box-shadow: 0 0 0 1px rgb(var(--yellow-rgb) / 0.12);
  opacity: 0;
  animation: hero-cta-ripple 2.9s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
}

.hero__cta-ripple__ring:nth-child(2) {
  animation-delay: 0.95s;
}

.hero__cta-ripple__ring:nth-child(3) {
  animation-delay: 1.9s;
}

@keyframes hero-cta-ripple {
  0% {
    transform: scale(0.82);
    opacity: 0.62;
  }
  75%,
  100% {
    transform: scale(1.1);
    opacity: 0;
  }
}

.hero__cta-btn {
  position: relative;
  z-index: 1;
  pointer-events: auto;
}

.hero__title-main {
  /* display: inline-block; */
  /* display:flex;
  flex-direction: row; */
  display: inline-flex;
  width: auto;
}

/** 英文主標以 Playfair 呈現；中文以 Noto（與變體字重動畫同一套字型） */
.hero__title-main--ascii {
  font-family: 'Playfair Display', 'Noto Sans TC', serif;
}

.hero__title-main:not(.hero__title-main--ascii) {
  font-family: 'Noto Sans TC', 'Playfair Display', serif;
  letter-spacing: 0.04em;
}

.hero__title-stack {
  display: block;
  font-size: 0.42em;
  font-weight: 400;
  letter-spacing: 0.06em;
  margin-top: 0.35em;
  color: #fff;
}

.hero__title-stack--ascii {
  font-family: 'Playfair Display', 'Noto Sans TC', serif;
}

.hero__title-stack:not(.hero__title-stack--ascii) {
  font-family: 'Noto Sans TC', 'Playfair Display', serif;
  letter-spacing: 0.06em;
}

.btn {
  position: relative;
  font: inherit;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 0.75rem 1.5rem;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn--ghost {
  align-self: flex-start;
  border: 1px solid var(--ink);
  background: transparent;
  color: var(--ink);
}

.btn--ghost:hover {
  background: #fff;
  color: var(--paper);
  border-color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgb(var(--blue-rgb) / 0.3);
}

.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

/* Sections */
.section {
  padding: 4rem 1.25rem;
}

/** 入場須知：白底、淺色字卡 */
.section--admission-panel {
  position: relative;
  background: #fff;
  color: var(--text-on-surface);
  padding-bottom: clamp(6rem, 14vh, 9rem);
}

.section--admission-panel > .section__inner {
  position: relative;
}

.admission-panel__title {
  margin: 0 auto 1.35rem;
  font-family: var(--font-title);
  font-weight: 800;
  font-size: clamp(32px, 2.5vw, 72px);
  line-height: 1.35;
  letter-spacing: 0.02em;
  color: var(--text-on-light);
  padding-bottom: 0;
  width: 100%;
  max-width: 100%;
  text-align: center;
}

.admission-panel__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 0.75rem;
  margin-bottom: 1rem;
  justify-content: center;
}

/** 僅以下兩顆為入場須知分頁（非導覽／語言切換按鈕） */
.admission-panel__tab {
  font-family: inherit;
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.35;
  letter-spacing: 0.02em;
  cursor: pointer;
  padding: 0.62rem 1rem;
  min-height: 2.75rem;
  color: var(--palette-blue);
  background: transparent;
  border: none;
  border-radius: 4px;
  box-shadow: none;
  appearance: none;
  text-align: center;
  transition:
    background-color 0.18s ease,
    color 0.18s ease;
}

.admission-panel__tab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.admission-panel__tab[aria-selected='true'] {
  background: #9978ff;
  color: #fff;
}

.admission-panel__tab:hover {
  color: var(--palette-blue);
  background: rgb(var(--blue-rgb) / 0.08);
}

.admission-panel__tab[aria-selected='true']:hover {
  color: #fff;
  background: #8a66f5;
}

.admission-panel-fade-enter-active,
.admission-panel-fade-leave-active {
  transition: opacity 0.38s ease;
}

.admission-panel-fade-enter-from,
.admission-panel-fade-leave-to {
  opacity: 0;
}

.admission-panel__frame {
  margin: 0;
  padding: clamp(1rem, 2.8vw, 1.35rem);
  border-radius: 14px;
  background: transparent;
  border: none;
  box-shadow: none;
}

.admission-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.admission-panel__card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem 1rem;
  align-items: start;
  margin: 0;
  padding: 1rem 1.15rem;
  background: var(--card-info-surface);
  border: 1px solid rgb(var(--blue-rgb) / 0.12);
  border-radius: 12px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.92) inset,
    0 6px 22px rgb(var(--blue-rgb) / 0.1);
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.admission-panel__card:hover {
  background: var(--card-info-surface-hover);
  border-color: rgb(var(--blue-rgb) / 0.2);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.96) inset,
    0 8px 26px rgb(var(--blue-rgb) / 0.14);
}

.admission-panel__num {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--text-on-surface);
  line-height: 1;
  padding-top: 0.06em;
  flex-shrink: 0;
}

.admission-panel__card--flow {
  display: block;
}

.admission-panel__section-heading {
  margin: 0.35rem 0 0;
  padding: 0 0.15rem;
  font-family: var(--font-title);
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-on-surface);
}

.admission-panel__aside {
  margin: 0;
  padding: 0 0.15rem;
}

.admission-panel__aside p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.6;
  color: rgb(var(--blue-rgb) / 0.78);
}

.admission-panel__card p {
  margin: 0;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.65;
  color: var(--text-on-surface);
}

.admission-panel__link {
  color: rgb(var(--blue-rgb));
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
}

.admission-panel__link:hover {
  text-decoration-thickness: 2px;
}

@keyframes about-glow-cell-flow {
  0% {
    background-position: 2% 50%;
  }

  100% {
    background-position: 64% 50%;
  }
}

/** 「關於我們」上方：八格；直向分界隨游標 sx（sx/2、sx、(sx+100%)/2），橫向 sy；共用流動漸層 */
.about-glow {
  --about-glow-h: clamp(168px, 26vmin, 300px);
  /** 八格共用底色漸層橫向流動周期 */
  --about-glow-flow-dur: 18s;
  --about-cross-x: 50%;
  --about-cross-y: 48%;
  --about-glow-r0c0-x: 50%;
  --about-glow-r0c1-x: 50%;
  --about-glow-r0c2-x: 50%;
  --about-glow-r0c3-x: 50%;
  --about-glow-r1c0-x: 50%;
  --about-glow-r1c1-x: 50%;
  --about-glow-r1c2-x: 50%;
  --about-glow-r1c3-x: 50%;
  /** 海報橫向漸層：靛藍 → 天青 → 極窄幅淺綠 → 暖金 */
  --ag-blue-deep: #162d7a;
  --ag-blue: #2a52c4;
  --ag-blue-light: #5b9fd4;
  /** 淺綠僅作青↔金之間的窄過渡 */
  --ag-green-soft: #b8dcc8;
  --ag-yellow-bright: #e8b84a;
  position: relative;
  isolation: isolate;
  height: var(--about-glow-h);
  min-height: var(--about-glow-h);
  margin-top: -4px;
  overflow: hidden;
  cursor: crosshair;
  touch-action: none;
  box-sizing: border-box;
  background: linear-gradient(
    148deg,
    var(--ag-blue-deep) 0%,
    var(--ag-blue) 32%,
    var(--ag-blue-light) 48%,
    var(--ag-green-soft) 50.5%,
    var(--ag-green-soft) 51.5%,
    var(--ag-yellow-bright) 58%,
    var(--ag-yellow-bright) 100%
  );
  box-shadow:
    inset 0 0 0 2px color-mix(in srgb, var(--ag-blue-light) 52%, var(--ag-yellow-bright) 48%),
    inset 0 0 28px color-mix(in srgb, var(--ag-blue) 35%, transparent);
}

.about-glow__viewport {
  position: relative;
  width: 100%;
  height: 100%;
}

.about-glow__cells {
  position: absolute;
  inset: 0;
}

.about-glow__cross {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.about-glow__cross-line {
  position: absolute;
  background: linear-gradient(
    155deg,
    var(--ag-blue-deep) 0%,
    var(--ag-blue) 36%,
    var(--ag-blue-light) 50%,
    var(--ag-green-soft) 51.5%,
    var(--ag-green-soft) 52.3%,
    var(--ag-yellow-bright) 60%,
    var(--ag-yellow-bright) 100%
  );
  box-shadow:
    0 0 16px color-mix(in srgb, var(--ag-blue-light) 55%, transparent),
    0 0 22px rgb(var(--yellow-rgb) / 0.58);
}

.about-glow__cross-line--v {
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-50%);
}

.about-glow__cross-line--v1 {
  /** 左半區中線 */
  left: calc(var(--about-cross-x) * 0.5);
}

.about-glow__cross-line--v2 {
  /** 主垂直線（跟游標） */
  left: var(--about-cross-x);
}

.about-glow__cross-line--v3 {
  /** 右半區中線 */
  left: calc(var(--about-cross-x) + (100% - var(--about-cross-x)) * 0.5);
}

.about-glow__cross-line--h {
  left: 0;
  right: 0;
  top: var(--about-cross-y);
  height: 2px;
  transform: translateY(-50%);
}

.about-glow__cell {
  position: absolute;
  overflow: hidden;
  pointer-events: none;
}

.about-glow__cell::before,
.about-glow__cell::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/** 底色：橫向流動（靛藍／天青／極窄淺綠／暖金） */
.about-glow__cell::before {
  z-index: 0;
  background-image: linear-gradient(
    90deg,
    var(--ag-blue-deep) 0%,
    var(--ag-blue) 14%,
    var(--ag-blue-deep) 26%,
    var(--ag-blue) 38%,
    var(--ag-blue-light) 44%,
    var(--ag-green-soft) 47.5%,
    var(--ag-green-soft) 48.8%,
    var(--ag-yellow-bright) 52%,
    var(--ag-yellow-bright) 60%,
    var(--ag-blue-light) 66%,
    var(--ag-green-soft) 67.2%,
    var(--ag-green-soft) 68%,
    var(--ag-blue) 74%,
    var(--ag-blue-deep) 86%,
    var(--ag-blue) 93%,
    var(--ag-blue-deep) 100%
  );
  background-repeat: no-repeat;
  background-size: 320% 100%;
  background-position: 0% 50%;
  animation-name: about-glow-cell-flow;
  animation-duration: var(--about-glow-flow-dur);
  animation-delay: 0s;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}

/** 游標高光疊在最上 */
.about-glow__cell::after {
  z-index: 1;
  background-repeat: no-repeat;
}

.about-glow__cell--r0c0 {
  left: 0;
  top: 0;
  width: calc(var(--about-cross-x) * 0.5);
  height: var(--about-cross-y);
}

.about-glow__cell--r0c0::after {
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    transparent calc(var(--about-glow-r0c0-x) - 28%),
    color-mix(in srgb, var(--ag-blue-light) 78%, transparent) calc(var(--about-glow-r0c0-x) - 11%),
    color-mix(in srgb, var(--ag-yellow-bright) 82%, transparent) var(--about-glow-r0c0-x),
    color-mix(in srgb, var(--ag-blue) 68%, transparent) calc(var(--about-glow-r0c0-x) + 14%),
    transparent calc(var(--about-glow-r0c0-x) + 32%),
    transparent 100%
  );
}

.about-glow__cell--r0c1 {
  left: calc(var(--about-cross-x) * 0.5);
  top: 0;
  width: calc(var(--about-cross-x) * 0.5);
  height: var(--about-cross-y);
}

.about-glow__cell--r0c1::after {
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    transparent calc(var(--about-glow-r0c1-x) - 28%),
    color-mix(in srgb, var(--ag-blue-light) 78%, transparent) calc(var(--about-glow-r0c1-x) - 11%),
    color-mix(in srgb, var(--ag-yellow-bright) 82%, transparent) var(--about-glow-r0c1-x),
    color-mix(in srgb, var(--ag-blue) 68%, transparent) calc(var(--about-glow-r0c1-x) + 14%),
    transparent calc(var(--about-glow-r0c1-x) + 32%),
    transparent 100%
  );
}

.about-glow__cell--r0c2 {
  left: var(--about-cross-x);
  top: 0;
  width: calc((100% - var(--about-cross-x)) * 0.5);
  height: var(--about-cross-y);
}

.about-glow__cell--r0c2::after {
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    transparent calc(var(--about-glow-r0c2-x) - 28%),
    color-mix(in srgb, var(--ag-blue-light) 78%, transparent) calc(var(--about-glow-r0c2-x) - 11%),
    color-mix(in srgb, var(--ag-yellow-bright) 82%, transparent) var(--about-glow-r0c2-x),
    color-mix(in srgb, var(--ag-blue) 68%, transparent) calc(var(--about-glow-r0c2-x) + 14%),
    transparent calc(var(--about-glow-r0c2-x) + 32%),
    transparent 100%
  );
}

.about-glow__cell--r0c3 {
  left: calc(var(--about-cross-x) + (100% - var(--about-cross-x)) * 0.5);
  top: 0;
  width: calc((100% - var(--about-cross-x)) * 0.5);
  height: var(--about-cross-y);
}

.about-glow__cell--r0c3::after {
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    transparent calc(var(--about-glow-r0c3-x) - 26%),
    color-mix(in srgb, var(--ag-blue-light) 80%, transparent) calc(var(--about-glow-r0c3-x) - 9%),
    color-mix(in srgb, var(--ag-blue) 76%, transparent) var(--about-glow-r0c3-x),
    color-mix(in srgb, var(--ag-yellow-bright) 68%, transparent) calc(var(--about-glow-r0c3-x) + 16%),
    transparent calc(var(--about-glow-r0c3-x) + 34%),
    transparent 100%
  );
}

.about-glow__cell--r1c0 {
  left: 0;
  top: var(--about-cross-y);
  bottom: 0;
  width: calc(var(--about-cross-x) * 0.5);
}

.about-glow__cell--r1c0::after {
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    transparent calc(var(--about-glow-r1c0-x) - 27%),
    color-mix(in srgb, var(--ag-blue-light) 78%, transparent) calc(var(--about-glow-r1c0-x) - 10%),
    color-mix(in srgb, var(--ag-blue) 76%, transparent) var(--about-glow-r1c0-x),
    color-mix(in srgb, var(--ag-yellow-bright) 62%, transparent) calc(var(--about-glow-r1c0-x) + 15%),
    transparent calc(var(--about-glow-r1c0-x) + 33%),
    transparent 100%
  );
}

.about-glow__cell--r1c1 {
  left: calc(var(--about-cross-x) * 0.5);
  top: var(--about-cross-y);
  bottom: 0;
  width: calc(var(--about-cross-x) * 0.5);
}

.about-glow__cell--r1c1::after {
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    transparent calc(var(--about-glow-r1c1-x) - 27%),
    color-mix(in srgb, var(--ag-blue-light) 78%, transparent) calc(var(--about-glow-r1c1-x) - 10%),
    color-mix(in srgb, var(--ag-blue) 76%, transparent) var(--about-glow-r1c1-x),
    color-mix(in srgb, var(--ag-yellow-bright) 62%, transparent) calc(var(--about-glow-r1c1-x) + 15%),
    transparent calc(var(--about-glow-r1c1-x) + 33%),
    transparent 100%
  );
}

.about-glow__cell--r1c2 {
  left: var(--about-cross-x);
  top: var(--about-cross-y);
  bottom: 0;
  width: calc((100% - var(--about-cross-x)) * 0.5);
}

.about-glow__cell--r1c2::after {
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    transparent calc(var(--about-glow-r1c2-x) - 27%),
    color-mix(in srgb, var(--ag-blue-light) 78%, transparent) calc(var(--about-glow-r1c2-x) - 10%),
    color-mix(in srgb, var(--ag-blue) 76%, transparent) var(--about-glow-r1c2-x),
    color-mix(in srgb, var(--ag-yellow-bright) 62%, transparent) calc(var(--about-glow-r1c2-x) + 15%),
    transparent calc(var(--about-glow-r1c2-x) + 33%),
    transparent 100%
  );
}

.about-glow__cell--r1c3 {
  left: calc(var(--about-cross-x) + (100% - var(--about-cross-x)) * 0.5);
  top: var(--about-cross-y);
  bottom: 0;
  width: calc((100% - var(--about-cross-x)) * 0.5);
}

.about-glow__cell--r1c3::after {
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    transparent calc(var(--about-glow-r1c3-x) - 29%),
    color-mix(in srgb, var(--ag-blue) 76%, transparent) calc(var(--about-glow-r1c3-x) - 11%),
    color-mix(in srgb, var(--ag-yellow-bright) 80%, transparent) var(--about-glow-r1c3-x),
    color-mix(in srgb, var(--ag-blue-light) 68%, transparent) calc(var(--about-glow-r1c3-x) + 14%),
    transparent calc(var(--about-glow-r1c3-x) + 36%),
    transparent 100%
  );
}

@media (prefers-reduced-motion: reduce) {
  .about-glow {
    cursor: default;
    touch-action: auto;
  }

  .about-glow__cell::before {
    animation: none;
    background-position: 38% 50%;
  }
}

/** 關於我們：白底；負 margin 疊在 banner 底，視差以 marginTop 上拉（避免 transform 縫隙） */
.section--about {
  position: relative;
  z-index: 2;
  margin-top: clamp(-7rem, -16vh, -3.5rem);
  background: #fff;
  color: var(--text-on-surface);
}

.section--about::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 6px;
  background: #fff;
  pointer-events: none;
}

.section--about .section__title {
  color: var(--text-on-light);
}

.section__inner--about {
  max-width: 52rem;
}

.about-block__head {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.15rem 1.25rem;
  margin-bottom: 1.25rem;
  text-align: center;
  padding-right: clamp(3.5rem, 16vw, 7rem);
}

.about_title {
  margin-bottom:0.2em;
  color:#69419b;
  padding: 0;
}

.about_title h1 {
  margin: 0;
  line-height: 1.1;
  font-family: var(--font-title);
}

.about-block__title {
  margin: 0 0 1rem;
  width: 100%;
  line-height: 1.5;
}

.about-block__more {
  flex-shrink: 0;
  padding: 0.2rem 0;
  font-family: var(--font-body);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--text-on-light);
  text-decoration: none;
  border: none;
  background: none;
  box-shadow: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.about-block__more:hover {
  color: var(--palette-blue-dim);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.22em;
}

.about-block__more:focus-visible {
  outline: 2px solid rgb(var(--blue-rgb) / 0.55);
  outline-offset: 3px;
  border-radius: 3px;
}

.about-block__prose {
  color: var(--text-on-surface);
}

.about-block__prose p,
.about-block__para {
  margin: 0 0 1.1em;
  color: var(--text-on-surface);
  line-height: 1.75;
}

.about-block__para:last-child {
  margin-bottom: 0;
}

/** 場次表：白底＋字卡；與關於我們重疊 1px，消除捲動時底部細線 */
.section--schedule-grad {
  position: relative;
  z-index: 1;
  margin-top: -1px;
  padding-top: calc(4rem + 1px);
  background: #fff;
}

.section__inner--schedule {
  max-width: 960px;
}

.section--schedule-grad .section__title {
  color: var(--text-on-light);
}

/** 地圖區：白底 */
.section--map-grad {
  position: relative;
  background: #fff;
  color: var(--text-on-surface);
}

.section--map-grad > .section__inner {
  position: relative;
  z-index: 1;
}

#map.section--map-grad {
  margin-top: -1px;
  padding-top: calc(4rem + 1px);
  overflow: hidden;
}

.section--map-grad .section__title {
  color: var(--text-on-light);
}

/** 製作團隊 */
.section--credits {
  position: relative;
  background: #fff;
  color: var(--text-on-surface);
}

.section--credits .section__title {
  color: var(--text-on-light);
  margin-bottom: 0.65rem;
}

.section__inner--credits {
  max-width: 52rem;
}

.credits__subtitle {
  margin: 0 0 2rem;
  font-family: var(--font-title);
  font-size: clamp(1.05rem, 2.2vw, 1.25rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text-on-light);
}

.credits__group {
  margin: 0 0 1.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.credits__group--artists {
  margin-bottom: 2.25rem;
}

.credits__row {
  display: grid;
  grid-template-columns: minmax(7.5rem, 11.5rem) minmax(0, 1fr);
  gap: 0.35rem 1rem;
  align-items: start;
}

.credits__row--artists {
  grid-template-columns: minmax(7.5rem, 11.5rem) minmax(0, 1fr);
}

.credits__role {
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--text-on-light);
  white-space: nowrap;
}

.credits__role::after {
  content: '｜';
  font-weight: 600;
  opacity: 0.55;
}

.credits__names {
  font-size: 0.95rem;
  line-height: 1.7;
  color: rgb(var(--blue-rgb) / 0.88);
}

.credits__orgs {
  list-style: none;
  margin: 0;
  padding: 1.5rem 0 0;
  border-top: 1px solid rgb(var(--blue-rgb) / 0.14);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem 1.5rem;
}

.credits__org {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  text-align: center;
}

.credits__org-role {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgb(var(--blue-rgb) / 0.7);
}

.credits__org-logo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 3.25rem;
}

.credits__org-logo {
  display: block;
  height: 100%;
  width: auto;
  max-width: min(100%, 9.5rem);
  object-fit: contain;
}

.credits__org-name {
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-on-light);
}

@media (max-width: 720px) {
  .credits__row,
  .credits__row--artists {
    grid-template-columns: 1fr;
    gap: 0.15rem;
  }

  .credits__role {
    white-space: normal;
  }

  .credits__orgs {
    grid-template-columns: 1fr;
    gap: 1.35rem;
  }
}

/** 作品介紹：Vanta CLOUDS 滿版底 */
.section--works-board {
  position: relative;
  isolation: isolate;
  background: transparent;
  overflow: hidden;
  /** 底部多留空間，讓雲層動態更明顯 */
  padding-bottom: clamp(13rem, 38vh, 24rem);
  /**
   * hover 陰影最大層約 0 38px 88px blur，底部可見尾很長；供子層 .works-marquee-bleed 繼承。
   */
  --works-marquee-shadow-room-t: clamp(2.6rem, 6.5vmin, 4rem);
  --works-marquee-shadow-room-b: clamp(5rem, 18vmin, 9rem);
}

/** 作品區 Vanta 背景層（#vanta / .vanta-test） */
.section--works-board .vanta-test {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.vanta-test .vanta-canvas {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
}

.works-board__backdrop {
  display: none;
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0.42;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' fill='none'%3E%3Cg stroke='%23d9d5d3' stroke-width='0.45' opacity='0.95'%3E%3Ccircle cx='70' cy='70' r='56'/%3E%3Ccircle cx='70' cy='70' r='40'/%3E%3Cellipse cx='70' cy='70' rx='68' ry='28'/%3E%3C/g%3E%3Cg fill='%23cbc6c4' opacity='0.85'%3E%3Ccircle cx='34' cy='28' r='1.35'/%3E%3Ccircle cx='98' cy='44' r='1.1'/%3E%3Ccircle cx='52' cy='108' r='1.05'/%3E%3Ccircle cx='108' cy='96' r='1.25'/%3E%3Ccircle cx='16' cy='92' r='0.95'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 140px 140px;
}

/** 標題區＋跑馬燈統一為可拖曳手勢區（capture 綁於此層） */
.works-board__drag {
  position: relative;
  z-index: 3;
  cursor: grab;
  touch-action: none;
}

.works-board__drag:active {
  cursor: grabbing;
}

.works-board__drag--dragging {
  cursor: grabbing;
}

.section--works-board .section__inner--works {
  position: relative;
  max-width: 1120px;
}

.works-board__heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
  margin-bottom: clamp(2rem, 5vw, 2.85rem);
}

.works-board__title {
  font-family: var(--font-title);
  font-weight: 800;
  font-size: clamp(32px, 2.5vw, 72px);
  line-height: 1.35;
  letter-spacing: 0.02em;
  margin: 0;
  color: var(--section-heading-terracotta);
}

.works-marquee-bleed {
  position: relative;
  width: 100vw;
  max-width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  /**
   * hover 時 translateY + 大 blur 的 box-shadow 會超出本區塊邊界；若僅 overflow:hidden
   * 會在上下被硬裁切成橫線。留垂直空間再靠負 margin 抵銷版面高度（底部需比頂部大）。
   */
  padding-top: var(--works-marquee-shadow-room-t);
  padding-bottom: var(--works-marquee-shadow-room-b);
  margin-top: calc(-1 * var(--works-marquee-shadow-room-t));
  margin-bottom: calc(-1 * var(--works-marquee-shadow-room-b));
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent 0%, #000 5%, #000 95%, transparent 100%);
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent 0%,
    #000 5%,
    #000 95%,
    transparent 100%
  );
}

.works-marquee__track {
  --works-marquee-gap: 1.5rem;
  display: flex;
  flex-flow: row nowrap;
  align-items: stretch;
  gap: var(--works-marquee-gap);
  width: max-content;
  will-change: transform;
  user-select: none;
}

.works-marquee__segment {
  display: flex;
  flex-flow: row nowrap;
  gap: var(--works-marquee-gap);
}

.work-card--marquee {
  flex: 0 0 auto;
  width: clamp(268px, 38vw, 320px);
  max-width: min(320px, 88vw);
  cursor: pointer;
}

.works-board__drag--dragging .work-card--marquee {
  cursor: grabbing;
}

.work-card.work-card--marquee:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

.work-card.work-card--marquee:hover {
  transform: translateY(-4px) translateZ(0);
}

.work-card {
  position: relative;
  background: var(--surface-light);
  border-radius: 12px;
  border: 1px solid rgb(var(--blue-rgb) / 0.22);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.92) inset,
    0 6px 24px rgb(var(--blue-rgb) / 0.18);
  /** 陰影畫在圓角外；與 overflow:hidden 同層易在邊緣出現裁切橫線，改由子層裁圖 */
  overflow: visible;
  display: flex;
  flex-direction: column;
  transition:
    box-shadow 0.26s ease,
    transform 0.26s ease,
    border-color 0.26s ease,
    border-width 0.26s ease;
}

.work-card:hover {
  transform: translateY(-7px) translateZ(0);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.96) inset,
    0 14px 36px rgb(var(--blue-rgb) / 0.22),
    0 22px 56px rgb(var(--orange-rgb) / 0.14);
  border-color: rgb(var(--orange-rgb) / 0.45);
}

.work-card--accent-orange {
  border: 0.2px solid var(--unit-orange);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.92) inset,
    0 8px 26px rgb(var(--unit-orange-rgb) / 0.3);
}

.work-card--accent-orange:hover {
  border-width: 4px;
  border-color: var(--unit-orange);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.96) inset,
    0 16px 40px rgb(var(--unit-orange-rgb) / 0.38),
    0 24px 60px rgb(var(--unit-orange-rgb) / 0.22);
}

.work-card--accent-orange:hover .work-card__name,
.work-card--accent-orange:hover .work-card__accent {
  color: var(--unit-orange);
}

.work-card--accent-orange:hover .work-card__name,
.work-card--accent-orange:hover .work-card__accent {
  color: var(--unit-orange);
}

.work-card--accent-blue {
  border: 0.2px solid var(--unit-blue);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.92) inset,
    0 8px 26px rgb(var(--unit-blue-rgb) / 0.26);
}

.work-card--accent-blue:hover {
  border-width: 4px;
  border-color: var(--unit-blue);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.96) inset,
    0 16px 40px rgb(var(--unit-blue-rgb) / 0.34),
    0 24px 60px rgb(var(--unit-blue-rgb) / 0.18);
}

.work-card--accent-blue:hover .work-card__name,
.work-card--accent-blue:hover .work-card__accent {
  color: var(--unit-blue);
}

.work-card--accent-blue:hover .work-card__name,
.work-card--accent-blue:hover .work-card__accent {
  color: var(--unit-blue);
}

.work-card--accent-purple {
  border: 0.2px solid var(--unit-purple);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.92) inset,
    0 8px 26px rgb(var(--unit-purple-rgb) / 0.28);
}

.work-card--accent-purple:hover {
  border-width: 4px;
  border-color: var(--unit-purple);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.96) inset,
    0 16px 40px rgb(var(--unit-purple-rgb) / 0.36),
    0 24px 60px rgb(var(--unit-purple-rgb) / 0.2);
}

.work-card--accent-purple:hover .work-card__name,
.work-card--accent-purple:hover .work-card__accent {
  color: var(--unit-purple);
}

.work-card--accent-purple:hover .work-card__name,
.work-card--accent-purple:hover .work-card__accent {
  color: var(--unit-purple);
}

.work-card__media {
  aspect-ratio: 3 / 2;
  min-height: 160px;
  background: linear-gradient(
    145deg,
    var(--surface-light) 0%,
    color-mix(in srgb, var(--palette-blue) 5%, var(--surface-light)) 100%
  );
  position: relative;
  border-radius: 11px 11px 0 0;
  overflow: hidden;
}

.work-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/** 相片預設可拖曳會搶走跑馬燈手勢；改由外層 article 接住 pointer／tap-to-open */
.work-card--marquee .work-card__img {
  -webkit-user-drag: none;
  user-select: none;
  pointer-events: none;
}

.work-card__body {
  border-radius: 0 0 11px 11px;
  background: var(--surface-light);
  padding: 1.15rem 1.25rem 1.35rem;
  text-align: center;
}

.work-card__toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  margin-bottom: 0.6rem;
}

.work-card__name {
  flex: 0 1 auto;
  margin: 0;
  font-family: var(--font-body);
  font-size: clamp(1rem, 1.85vw, 1.125rem);
  font-weight: 700;
  line-height: 1.35;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--on-accent);
  text-align: center;
  transition: color 0.2s ease;
}

.work-card__accent {
  flex-shrink: 0;
  font-size: 1.45rem;
  font-weight: 300;
  line-height: 1;
  color: var(--text-on-light);
  transform: translateY(-1px);
  transition: color 0.2s ease;
}

.work-card__text {
  margin: 0;
  font-size: 0.905rem;
  line-height: 1.62;
  color: var(--text-on-light);
}

/** 作品詳情字卡（點擊跑馬燈卡片）：頂欄＋左圖右文，窄螢幕直向堆疊 */
.works-detail-scrim {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
  background: rgb(var(--blue-rgb) / 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.works-detail {
  position: relative;
  width: min(100%, 52rem);
  --works-detail-height: min(88vh, 840px);
  height: var(--works-detail-height);
  max-height: var(--works-detail-height);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: linear-gradient(
    165deg,
    var(--surface-light) 0%,
    color-mix(in srgb, var(--palette-yellow) 8%, var(--surface-light)) 50%,
    var(--surface-light) 100%
  );
  border: 1px solid rgb(var(--blue-rgb) / 0.28);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    0 28px 70px rgb(var(--blue-rgb) / 0.2);
}

.works-detail__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  gap: 0;
  padding: 1.1rem 1.25rem 0.95rem;
  flex-shrink: 0;
}

.works-detail__header--navigable {
  padding-bottom: 0.95rem;
}

.works-detail__dialog-title {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.works-detail__tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.85rem, 3vw, 1.4rem);
  width: 100%;
  margin: 0;
  padding: 0 2.85rem;
  box-sizing: border-box;
}

.works-detail__tab {
  position: relative;
  margin: 0;
  padding: 0.2rem 0 0.35rem;
  border: none;
  background: transparent;
  color: rgb(var(--blue-rgb) / 0.56);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: clamp(0.95rem, 2.5vw, 1.08rem);
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1.35;
  transition:
    color 0.15s ease,
    transform 0.15s ease;
}

.works-detail__tab::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.18s ease;
}

.works-detail__tab:hover,
.works-detail__tab--active {
  color: var(--on-accent);
}

.works-detail__tab:hover {
  transform: translateY(-1px);
}

.works-detail__tab--active::after {
  transform: scaleX(1);
}

.works-detail__tab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
  border-radius: 4px;
}

.works-detail__header-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  width: 100%;
  padding-right: 2.35rem;
}

.works-detail__header-swipe {
  flex: 0 1 auto;
  width: min(20rem, calc(100% - 5rem));
  min-width: 0;
  overflow: hidden;
}

.works-detail__header-track {
  display: flex;
  width: 200%;
  transform: translateX(0);
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.works-detail__header-swipe--artist .works-detail__header-track {
  transform: translateX(-50%);
}

.works-detail__page-arrow {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 1px solid rgb(var(--blue-rgb) / 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--text-on-light);
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1;
  box-shadow: 0 4px 12px rgb(var(--blue-rgb) / 0.12);
  transition:
    background 0.15s ease,
    transform 0.12s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    opacity 0.15s ease;
}

.works-detail__page-arrow:hover:not(:disabled) {
  color: var(--palette-blue-dim);
  background: var(--surface-light-hover);
  border-color: rgb(var(--blue-rgb) / 0.28);
  transform: scale(1.05);
}

.works-detail__page-arrow:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.works-detail__page-arrow:disabled {
  opacity: 0.28;
  cursor: default;
  box-shadow: none;
}

.works-detail__page-arrow--prev::after {
  content: '‹';
  display: block;
  transform: translateX(-1px);
}

.works-detail__page-arrow--next::after {
  content: '›';
  display: block;
  transform: translateX(1px);
}

.works-detail__header:not(.works-detail__header--navigable) .works-detail__header-nav {
  padding: 0 2.85rem;
}

.works-detail__header:not(.works-detail__header--navigable) .works-detail__heading {
  padding: 0;
  flex: 1 1 auto;
  width: 100%;
  max-width: 100%;
}

.works-detail__heading {
  margin: 0;
  padding: 0;
  font-family: var(--font-title);
  font-size: clamp(1.1rem, 2.8vw, 1.35rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--on-accent);
  line-height: 1.35;
  flex: 0 0 50%;
  width: 50%;
  max-width: 50%;
  text-align: center;
}

.works-detail__heading--artist {
  font-size: clamp(1rem, 2.5vw, 1.2rem);
}

.works-detail__pages {
  display: flex;
  width: 200%;
  flex: 1 1 auto;
  min-height: 0;
  transform: translateX(0);
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  touch-action: pan-y;
}

.works-detail__pages--artist {
  transform: translateX(-50%);
}

.works-detail__pages--single {
  width: 100%;
}

.works-detail__pages--single .works-detail__page {
  flex: 0 0 100%;
  width: 100%;
}

.works-detail__page {
  flex: 0 0 50%;
  width: 50%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.works-detail__page--work,
.works-detail__page--artist {
  overflow: hidden;
}

.works-detail__divider {
  height: 1px;
  margin: 0;
  border: none;
  background: rgb(var(--blue-rgb) / 0.14);
  flex-shrink: 0;
}

.works-detail__main {
  display: grid;
  grid-template-columns: minmax(0, 1.14fr) minmax(0, 0.86fr);
  gap: 1.75rem 2rem;
  align-items: stretch;
  padding: 1.35rem 1.25rem 1.5rem;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.works-detail__media {
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  align-self: stretch;
}

.works-detail__gallery {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}

/**
 * 有藝術家照片時：作品圖與藝術家圖上下堆疊、各約半寬正方形；
 * 多位藝術家時左側媒體區可上下捲動，避免重疊。
 */
.works-detail__media--with-artists {
  gap: 0.75rem;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.works-detail__media--with-artists .works-detail__gallery {
  flex: 0 0 auto;
  min-height: auto;
}

.works-detail__media--with-artists .works-detail__carousel {
  flex: 0 0 auto;
  min-height: auto;
  container-type: normal;
}

.works-detail__media--with-artists .works-detail__viewport {
  width: 100%;
  height: auto;
  max-width: 100%;
  aspect-ratio: 1 / 1;
  margin: 0 auto;
}

.works-detail__carousel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  flex: 1 1 auto;
  min-height: 0;
  container-type: size;
}

.works-detail__viewport {
  position: relative;
  flex: 0 0 auto;
  width: min(100%, 100cqw, 100cqh);
  aspect-ratio: 1 / 1;
  height: auto;
  align-self: center;
  margin: 0 auto;
  border-radius: 4px;
  overflow: hidden;
  background: #1a1f3d;
  isolation: isolate;
}

.works-detail__img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.works-detail__img--active {
  opacity: 1;
  pointer-events: auto;
}

.works-detail__placeholder {
  width: 100%;
  height: 100%;
  min-height: 10rem;
  background: linear-gradient(
    145deg,
    var(--palette-blue) 0%,
    var(--palette-orange) 62%,
    var(--palette-yellow) 100%
  );
}

.works-detail__close {
  position: absolute;
  right: 0.85rem;
  top: 1.05rem;
  transform: none;
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-on-light);
  cursor: pointer;
  font: inherit;
  line-height: 1;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.works-detail__close:hover {
  color: var(--palette-blue-dim);
  background: rgb(var(--blue-rgb) / 0.08);
}

.works-detail__close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.works-detail__close-icon {
  font-size: 1.85rem;
  font-weight: 300;
  line-height: 1;
  transform: translateY(-2px);
}

.works-detail__arrow {
  position: absolute;
  top: 50%;
  z-index: 2;
  transform: translateY(-50%);
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-on-light);
  cursor: pointer;
  font-size: 1.35rem;
  font-weight: 500;
  line-height: 1;
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 6px 18px rgb(var(--blue-rgb) / 0.22);
  transition:
    background 0.15s ease,
    transform 0.12s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}

.works-detail__arrow:hover {
  color: var(--palette-blue-dim);
  background: var(--surface-light-hover);
  border-color: rgba(255, 255, 255, 0.85);
  transform: translateY(-50%) scale(1.05);
}

.works-detail__arrow:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.works-detail__arrow--prev {
  left: 0.45rem;
}

.works-detail__arrow--prev::after {
  content: '‹';
  display: block;
  transform: translateX(-1px);
}

.works-detail__arrow--next {
  right: 0.45rem;
}

.works-detail__arrow--next::after {
  content: '›';
  display: block;
  transform: translateX(1px);
}

.works-detail__dots {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  flex-shrink: 0;
}

.works-detail__dot {
  width: 7px;
  height: 7px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: rgb(var(--blue-rgb) / 0.32);
  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.15s ease;
}

.works-detail__dot:hover {
  background: rgb(var(--orange-rgb) / 0.62);
}

.works-detail__dot--active:hover {
  background: var(--palette-orange);
}

.works-detail__dot--active {
  background: var(--palette-orange);
  transform: scale(1.15);
}

.works-detail__dot:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.works-detail__artists {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  justify-items: center;
  align-items: start;
  gap: 0.75rem 0.85rem;
  flex: 0 0 auto;
  min-height: auto;
  width: 100%;
}

.works-detail__artist {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.45rem;
  min-width: 0;
  width: 100%;
}

.works-detail__artist-photo {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
  border-radius: 4px;
  object-fit: cover;
  object-position: center top;
  border: 2px solid rgb(var(--blue-rgb) / 0.18);
  box-shadow: 0 4px 14px rgb(var(--blue-rgb) / 0.14);
  background: #e8ecf8;
}

.works-detail__artists:has(> :only-child) {
  grid-template-columns: minmax(0, 1fr);
}

.works-detail__artist-name {
  font-family: var(--font-body);
  font-size: 0.78rem;
  line-height: 1.35;
  text-align: center;
  color: var(--text-on-light);
  max-width: 100%;
}

.works-detail__artist-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.75rem 2rem;
  align-items: stretch;
  padding: 1.35rem 1.25rem 1.5rem;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.works-detail__artist-media {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  align-content: start;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.works-detail__artist-media:has(> :only-child) {
  grid-template-columns: 1fr;
}

.works-detail__artist-prose {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding-right: 0.15rem;
  font-family: var(--font-body);
  font-size: 0.95rem;
  line-height: 1.75;
  color: var(--on-accent);
}

.works-detail__artist-bio + .works-detail__artist-bio {
  margin-top: 1.25rem;
  padding-top: 1.1rem;
  border-top: 1px solid rgb(var(--blue-rgb) / 0.12);
}

.works-detail__artist-bio-name {
  margin: 0 0 0.75rem;
  font-family: var(--font-title);
  font-size: clamp(1.05rem, 2.4vw, 1.25rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.35;
  color: var(--on-accent);
}

.works-detail__artist-bio-empty {
  margin: 0;
  color: rgb(var(--blue-rgb) / 0.55);
  font-style: italic;
}

.works-detail__prose {
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding-right: 0.35rem;
  font-family: var(--font-body);
  font-size: 0.95rem;
  line-height: 1.75;
  color: var(--on-accent);
  scrollbar-gutter: stable;
}

.works-detail__intro {
  margin-bottom: 1rem;
}

.works-detail__intro-p {
  margin: 0 0 0.85em;
  color: var(--text-on-light);
}

.works-detail__intro-p:last-child {
  margin-bottom: 0;
}

.works-detail__subheading {
  margin: 0.25rem 0 0.75rem;
  font-family: var(--font-body);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--on-accent);
  letter-spacing: 0.02em;
  text-align: center;
}

.works-detail__body {
  margin: 0;
}

.works-detail__para {
  margin: 0 0 1em;
  color: var(--text-on-light);
}

.works-detail__para:last-child {
  margin-bottom: 0;
}

@media (max-width: 840px) {
  .works-detail-scrim {
    align-items: center;
    padding: 0.75rem;
    padding-top: max(0.75rem, env(safe-area-inset-top));
    padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  }

  .works-detail {
    width: min(100%, 28rem);
    --works-detail-height: min(92dvh, 100%);
  }

  .works-detail__header {
    padding: 0.95rem 1rem 0.85rem;
  }

  .works-detail__tabs {
    gap: 0.9rem;
    padding: 0 2.5rem;
  }

  .works-detail__tab {
    font-size: 0.98rem;
    letter-spacing: 0.08em;
  }

  /** 手機：圖在上、文在下 */
  .works-detail__main {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem 1.15rem;
    overflow: hidden;
  }

  .works-detail__artist-main {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem 1.15rem;
    overflow: hidden;
  }

  .works-detail__artist-media {
    flex: 0 0 auto;
    order: 1;
    max-height: min(42vh, 18rem);
  }

  .works-detail__artist-prose {
    flex: 1 1 auto;
    order: 2;
    min-height: 0;
    padding-right: 0;
  }

  .works-detail__media {
    flex: 0 0 auto;
    order: 1;
    width: 100%;
    height: auto;
  }

  .works-detail__media--with-artists {
    width: 100%;
    height: auto;
    max-height: min(58vh, 28rem);
  }

  .works-detail__prose {
    flex: 1 1 auto;
    order: 2;
    min-height: 0;
    padding-right: 0;
  }

  .works-detail__carousel {
    flex: 0 0 auto;
    width: 100%;
    container-type: normal;
    gap: 0;
  }

  .works-detail__viewport {
    width: 100%;
    max-width: 100%;
    aspect-ratio: 1 / 1;
    height: auto;
    margin: 0;
  }

  .works-detail__artists {
    gap: 0.65rem 0.75rem;
  }

  .works-detail__artist-name {
    font-size: 0.72rem;
  }

  .works-detail__arrow {
    width: 2rem;
    height: 2rem;
    font-size: 1.2rem;
  }

  .works-detail__arrow--prev {
    left: 0.35rem;
  }

  .works-detail__arrow--next {
    right: 0.35rem;
  }
}

@media (max-width: 520px) {
  .works-detail-scrim {
    padding: 0.5rem;
    padding-top: max(0.5rem, env(safe-area-inset-top));
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  }

  .works-detail {
    width: 100%;
    --works-detail-height: min(96dvh, 100%);
    border-radius: 10px;
  }

  .works-detail__header {
    padding: 0.85rem 0.85rem 0.75rem;
  }

  .works-detail__tabs {
    gap: 0.7rem;
    padding: 0 2.35rem;
  }

  .works-detail__tab {
    font-size: 0.9rem;
    letter-spacing: 0.05em;
  }

  .works-detail__main {
    gap: 0.85rem;
    padding: 0 0.85rem 1rem;
  }

  .works-detail__prose {
    font-size: 0.9rem;
    line-height: 1.7;
  }

  .works-detail__subheading {
    font-size: 1rem;
    text-align: left;
  }
}

.section--bottom {
  padding-bottom: 5rem;
}

.section__inner {
  max-width: 880px;
  margin: 0 auto;
}

.section__title {
  width:fit-content;
  font-family: var(--font-title);
  font-weight: 600;
  font-size: clamp(32px, 2.5vw, 72px);
  margin: 0 0 1.5rem;
  line-height: 1.35;
  color: #000;
  text-align: left;
  letter-spacing: 0.02em;
 
}

.section__head {
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  align-items:center;
  justify-content:center;
  gap: 0.5rem 1.5rem;
  margin-bottom: 2rem;
  text-align: center;
}

.section__head .section__title {
  margin: 0;
}

.section__note {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink-soft);
  text-align: center;
  max-width: 62ch;
}

.section__note--schedule-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.section__note--schedule-info p {
  margin: 0;
  font-weight: 600;
  color: var(--text-on-light);
}
.prose p {
  margin: 0 0 1.1em;
}

.prose p:last-child {
  margin-bottom: 0;
}

@media (prefers-reduced-motion: reduce) {
  .admission-panel-fade-enter-active,
  .admission-panel-fade-leave-active {
    transition-duration: 0.01ms;
    transition-delay: 0ms;
  }
}

.map__hint {
  font-size: 0.92rem;
  color: var(--text-on-surface);
  opacity: 0.85;
  max-width: 52ch;
  text-align: left;
}

.map-area {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0;
  border-radius: 12px;
  overflow: hidden;
  min-height: 260px;
}

.map_img {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  height: auto;
}

.footer {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: 2.25rem 1.25rem 2.75rem;
  text-align: center;
  font-size: 0.88rem;
  color: rgb(255 255 255 / 0.82);
  border-top: 1px solid rgb(255 255 255 / 0.12);
  margin-top: auto;
  background: #000;
}

@media (prefers-reduced-motion: reduce) {
  .hero__canvas {
    display: none !important;
  }

  .hero__scrim {
    display: none !important;
  }

  .hero__grid-canvas {
    display: none !important;
  }

  .hero__cta-ripple__ring {
    animation: none !important;
    opacity: 0 !important;
  }

  .footer {
    background: #000;
  }

  .work-card {
    transition: box-shadow 0.2s ease;
  }

  .work-card:hover {
    transform: none;
  }
}

.footer__inner {
  position: relative;
  color: #fff;
}

.footer p {
  margin: 0.35rem 0;
}

.footer a {
  color: rgb(255 255 255 / 0.9);
  text-decoration: none;
}

.footer a:hover {
  color: #fff;
  text-decoration: underline;
}

.footer__copy {
  opacity: 0.75;
  margin-top: 1rem !important;
  font-size: 0.8rem;
}


/** 文字區下層：白方塊 + difference → 字變白 */
.mouse-trail-invert-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 60;
  pointer-events: none;
  background: transparent;
  mix-blend-mode: difference;
}

/** 文字區中層：藍方塊 #1b2f9e + lighten → 填滿方塊底色 */
.mouse-trail-text-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 61;
  pointer-events: none;
  background: transparent;
  mix-blend-mode: lighten;
}

/** 上層：一般區域紫色方塊 #9978ff */
.mouse-trail-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 62;
  pointer-events: none;
  background: transparent;
}
</style>
