<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import MapZoneAGoogle from '@/components/MapZoneAGoogle.vue'
import type { Lang } from './i18n'
import { messages } from './i18n'
import { Gradient } from '@/Gradient.js'

function envNumber(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

let footerStripeGradient: Gradient | null = null
let worksStripeGradient: Gradient | null = null
let heroStripeGradient: Gradient | null = null

const googleMapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()
const mapZoneALat = envNumber(import.meta.env.VITE_GOOGLE_MAP_A_LAT, 25.040615579876043)
const mapZoneALng = envNumber(import.meta.env.VITE_GOOGLE_MAP_A_LNG, 121.53817086107965)
const mapZoneAZoom = Math.round(envNumber(import.meta.env.VITE_GOOGLE_MAP_A_ZOOM, 16))

const lang = ref<Lang>('zh')
const menuOpen = ref(false)

type AdmissionTab = 'notes' | 'tickets'
const admissionTab = ref<AdmissionTab>('notes')

/** 關於我們字卡：捲入視窗後揭露動態 */
const aboutCardRef = ref<HTMLElement | null>(null)
const aboutCardVisible = ref(false)
let aboutCardObserver: IntersectionObserver | null = null

function bindAboutCardObserver() {
  if (typeof window === 'undefined') return
  aboutCardObserver?.disconnect()
  aboutCardObserver = null

  if (!heroMotionOk.value) {
    aboutCardVisible.value = true
    return
  }

  nextTick(() => {
    const el = aboutCardRef.value
    if (!el) return
    aboutCardObserver = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (!e?.isIntersecting) return
        aboutCardVisible.value = true
        aboutCardObserver?.disconnect()
        aboutCardObserver = null
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    )
    aboutCardObserver.observe(el)
  })
}

/** 用於是否初始化 WebGL Stripe 底（與 prefers-reduced-motion 一致） */
const heroMotionOk = ref(true)

let motionMql: MediaQueryList | null = null

function syncHeroMotionPref() {
  heroMotionOk.value =
    typeof window !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function onHeroMotionMqlChange() {
  syncHeroMotionPref()
}

/** 首屏 Stripe WebGL：`timeScale` 隨滑鼠移動強度調整（僅 banner） */
/** 對比愈大、對位移愈敏感時，視覺上 Stripe 流速變化愈明顯 */
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
  if (!ok) {
    resetHeroStripePointerSpeed()
    aboutCardObserver?.disconnect()
    aboutCardObserver = null
    aboutCardVisible.value = true
  } else if (!aboutCardVisible.value) {
    bindAboutCardObserver()
  }
})

const stored = (): Lang | null => {
  if (typeof localStorage === 'undefined') return null
  const v = localStorage.getItem('usaf-lang')
  return v === 'en' || v === 'zh' ? v : null
}

onMounted(async () => {
  const s = stored()
  if (s) lang.value = s
  syncHeroMotionPref()
  motionMql = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionMql.addEventListener('change', onHeroMotionMqlChange)

  /** WebGL 動態底：首屏、footer、作品區 */
  await nextTick()
  requestAnimationFrame(() => {
    if (heroMotionOk.value && document.getElementById('hero-gradient-canvas')) {
      try {
        heroStripeGradient = new Gradient().initGradient('#hero-gradient-canvas')
      } catch {
        heroStripeGradient = null
      }
    }
    if (heroMotionOk.value && document.getElementById('gradient-canvas')) {
      try {
        footerStripeGradient = new Gradient().initGradient('#gradient-canvas')
      } catch {
        footerStripeGradient = null
      }
    }
    if (heroMotionOk.value && document.getElementById('works-gradient-canvas')) {
      try {
        worksStripeGradient = new Gradient().initGradient('#works-gradient-canvas')
      } catch {
        worksStripeGradient = null
      }
    }
  })
  await nextTick()
  bindAboutCardObserver()
  bindWorksMarqueeSizing()
  startWorksMarqueeLoop()
})

onUnmounted(() => {
  aboutCardObserver?.disconnect()
  aboutCardObserver = null
  motionMql?.removeEventListener('change', onHeroMotionMqlChange)
  resetHeroStripePointerSpeed()
  heroStripeGradient?.disconnect()
  heroStripeGradient = null
  footerStripeGradient?.disconnect()
  footerStripeGradient = null
  worksStripeGradient?.disconnect()
  worksStripeGradient = null
  scheduleIntersectionObserver?.disconnect()
  scheduleIntersectionObserver = null
  stopWorksMarqueeLoop()
  worksResizeObserver?.disconnect()
  worksResizeObserver = null
})

const txt = computed(() => messages[lang.value])

/** 作品區：單行無縫跑馬燈（可拖曳；prefers-reduced-motion 時僅停自動捲動） */
const worksSegmentRef = ref<HTMLElement | null>(null)
const worksOffsetPx = ref(0)
const worksDragging = ref(false)
const worksMarqueePaused = ref(false)
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

  if (!worksDragging.value && heroMotionOk.value && w > 0 && !worksMarqueePaused.value) {
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

function toggleWorksMarqueePause() {
  worksMarqueePaused.value = !worksMarqueePaused.value
}

function onWorksMarqueePointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  const t = e.currentTarget as HTMLElement
  worksDragging.value = true
  worksLastPointerX = e.clientX
  worksPointerId = e.pointerId
  t.setPointerCapture(e.pointerId)
}

function onWorksMarqueePointerMove(e: PointerEvent) {
  if (!worksDragging.value || worksPointerId !== e.pointerId) return
  const dx = e.clientX - worksLastPointerX
  worksLastPointerX = e.clientX
  worksOffsetPx.value += dx
  normalizeWorksMarqueeOffset()
}

function onWorksMarqueePointerUp(e: PointerEvent) {
  if (worksPointerId !== e.pointerId) return
  const t = e.currentTarget as HTMLElement
  worksDragging.value = false
  worksPointerId = null
  try {
    t.releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function onWorksMarqueePointerCancel(e: PointerEvent) {
  onWorksMarqueePointerUp(e)
}

function onWorksMarqueeLostPointerCapture(e: PointerEvent) {
  if (worksPointerId !== e.pointerId) return
  worksDragging.value = false
  worksPointerId = null
}

const scheduleCardVisible = reactive<Record<number, boolean>>({})
/** 指派後覆寫為由捲動順序決定；未定義時 {@link scheduleSlidesFromLeft} 會用場次別 i 推測位移方向 */
const scheduleEnterFromLeft = reactive<Record<number, boolean>>({})
let scheduleIntersectionObserver: IntersectionObserver | null = null
let scheduleRevealGen = 0
let scheduleScrollOrdinal = 0

function scheduleSlidesFromLeft(i: number): boolean {
  const v = scheduleEnterFromLeft[i]
  return typeof v === 'boolean' ? v : i % 2 === 0
}

function bindScheduleCard(el: Element | null, index: number) {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (el) {
      scheduleEnterFromLeft[index] = index % 2 === 0
      scheduleCardVisible[index] = true
    }
    return
  }
  if (!el) return
  if (!scheduleIntersectionObserver) {
    scheduleIntersectionObserver = new IntersectionObserver(
      (entries) => {
        if (!scheduleIntersectionObserver) return
        const incoming = entries
          .filter((e) => e.isIntersecting)
          .map((e) => ({
            target: e.target as HTMLElement,
            ix: Number((e.target as HTMLElement).dataset.scheduleIx),
            top: e.boundingClientRect.top,
          }))
          .filter((x) => Number.isFinite(x.ix))
          .sort((a, b) => (a.top !== b.top ? a.top - b.top : a.ix - b.ix))

        incoming.forEach((item, batchIndex) => {
          scheduleIntersectionObserver!.unobserve(item.target)
          scheduleEnterFromLeft[item.ix] = scheduleScrollOrdinal % 2 === 0
          scheduleScrollOrdinal += 1
          const delayMs = batchIndex * 72
          const gen = scheduleRevealGen
          if (delayMs === 0) {
            scheduleCardVisible[item.ix] = true
          } else {
            window.setTimeout(() => {
              if (gen !== scheduleRevealGen) return
              scheduleCardVisible[item.ix] = true
            }, delayMs)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -12% 0px' },
    )
  }
  const elHt = el as HTMLElement
  elHt.dataset.scheduleIx = String(index)
  scheduleIntersectionObserver.observe(elHt)
}

watch(lang, (l) => {
  document.documentElement.lang = l === 'zh' ? 'zh-Hant' : 'en'
  localStorage.setItem('usaf-lang', l)
  scheduleRevealGen += 1
  scheduleScrollOrdinal = 0
  for (const k of Object.keys(scheduleCardVisible)) {
    delete scheduleCardVisible[Number(k)]
  }
  for (const k of Object.keys(scheduleEnterFromLeft)) {
    delete scheduleEnterFromLeft[Number(k)]
  }
  admissionTab.value = 'notes'
  bindWorksMarqueeSizing()
})


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

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  menuOpen.value = false
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="header__inner">
        <a
          href="https://creativexpo.tw/zh-TW/posts"
          class="brand"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img class="brand__logo" src="/CET.png" width="520" height="120" :alt="txt.siteName" />
          <span class="brand__tag">{{ txt.siteTagline }}</span>
        </a>

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

        <nav id="site-nav" class="nav" :data-open="menuOpen">
          <ul class="nav__list">
            <li v-for="item in navAnchors" :key="item.id">
              <button type="button" class="nav__link" @click="scrollToSection(item.id)">
                {{ item.label }}
              </button>
            </li>
          </ul>
          <div class="lang" role="group" :aria-label="txt.langSwitch">
            <button
              type="button"
              class="lang__btn"
              :class="{ 'lang__btn--active': lang === 'zh' }"
              @click="setLang('zh')"
            >
              中
            </button>
            <button
              type="button"
              class="lang__btn"
              :class="{ 'lang__btn--active': lang === 'en' }"
              @click="setLang('en')"
            >
              EN
            </button>
          </div>
        </nav>
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
        <canvas
          id="hero-gradient-canvas"
          class="hero__canvas"
          data-transition-in
          aria-hidden="true"
        />
        <div class="hero__scrim" aria-hidden="true" />
        <div class="hero__backdrop" aria-hidden="true" />
        <div class="hero__wave" aria-hidden="true">
          <svg
            class="hero__wave-svg"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 64"
            preserveAspectRatio="none"
          >
            <path
              class="hero__wave-path"
              d="M0,34 C240,62 380,14 620,38 C760,54 940,22 1120,40 C1260,52 1380,18 1440,30 L1440,64 L0,64 Z"
            />
          </svg>
        </div>
        <div class="hero__inner">
          <p class="hero__kicker">{{ txt.hero.kicker }}</p>
          <h1 class="hero__title">
            {{ txt.hero.title }}
            <span class="hero__title-stack">{{ txt.hero.subtitle }}</span>
          </h1>
          <button type="button" class="btn btn--ghost" @click="scrollToSection('schedule')">
            {{ txt.hero.cta }}
          </button>
        </div>
      </section>

      <section id="about" class="section section--about-grad section--about-after-hero">
        <div class="section__inner">
          <div
            ref="aboutCardRef"
            class="about-card"
            :class="{ 'about-card--visible': aboutCardVisible }"
          >
            <div class="about-card__inner">
              <div class="about-card__head">
                <h2 class="section__title about-card__title">{{ txt.about.title }}</h2>
                <a
                  class="about-card__more"
                  :href="txt.about.officialAboutUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-label="txt.about.officialAboutAria"
                >
                  {{ txt.about.moreLabel }}
                </a>
              </div>
              <div class="prose about-card__prose">
                <p
                  v-for="(para, i) in txt.about.body.split('\n\n')"
                  :key="i"
                  class="about-card__para"
                >
                  {{ para }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="schedule" class="section section--schedule-grad">
        <div class="section__inner">
          <div class="section__head">
            <h2 class="section__title">{{ txt.schedule.title }}</h2>
            <p class="section__note">{{ txt.schedule.note }}</p>
          </div>
          <ul class="schedule-cards" role="list">
            <li
              v-for="(row, i) in txt.schedule.slots"
              :key="`${lang}-${i}`"
              class="schedule-card"
              :class="{
                'schedule-card--visible': scheduleCardVisible[i],
                'schedule-card--from-left': scheduleSlidesFromLeft(i),
                'schedule-card--from-right': !scheduleSlidesFromLeft(i),
              }"
              :ref="(el) => bindScheduleCard(el as Element | null, i)"
            >
              <div class="schedule-card__meta">
                <span class="schedule-card__day">{{ row.day }}</span>
                <span class="schedule-card__time">{{ row.time }}</span>
              </div>
              <p class="schedule-card__name">{{ row.name }}</p>
            </li>
          </ul>
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
                <li
                  v-for="(line, i) in txt.admission.ticketsItems"
                  :key="`adm-t-${i}`"
                  class="admission-panel__card"
                >
                  <span class="admission-panel__num" aria-hidden="true">{{
                    String(i + 1).padStart(2, '0')
                  }}</span>
                  <p>{{ line }}</p>
                </li>
              </ul>
            </div>
          </Transition>
        </div>
      </section>

      <section id="works" class="section section--works-board">
        <canvas
          id="works-gradient-canvas"
          class="works-board__canvas"
          data-transition-in
          aria-hidden="true"
        />
        <div class="works-board__scrim" aria-hidden="true" />
        <div class="works-board__backdrop" aria-hidden="true" />
        <div class="section__inner section__inner--works">
          <header class="works-board__heading">
            <h2 id="works-board-heading" class="works-board__title">{{ txt.works.title }}</h2>
            <button
              v-if="heroMotionOk"
              type="button"
              class="works-marquee-toggle"
              :aria-pressed="worksMarqueePaused"
              :aria-label="worksMarqueePaused ? txt.works.marqueePlayAria : txt.works.marqueePauseAria"
              @click="toggleWorksMarqueePause"
            >
              <span class="works-marquee-toggle__icon" aria-hidden="true">
                <svg
                  v-if="!worksMarqueePaused"
                  class="works-marquee-toggle__svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
                <svg
                  v-else
                  class="works-marquee-toggle__svg works-marquee-toggle__svg--play"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              </span>
              <span class="works-marquee-toggle__label">{{
                worksMarqueePaused ? txt.works.marqueePlayLabel : txt.works.marqueePauseLabel
              }}</span>
            </button>
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
              :class="{ 'works-marquee__track--dragging': worksDragging }"
              :style="{ transform: `translate3d(${worksOffsetPx}px,0,0)` }"
              @pointerdown="onWorksMarqueePointerDown"
              @pointermove="onWorksMarqueePointerMove"
              @pointerup="onWorksMarqueePointerUp"
              @pointercancel="onWorksMarqueePointerCancel"
              @lostpointercapture="onWorksMarqueeLostPointerCapture"
            >
              <div ref="worksSegmentRef" class="works-marquee__segment">
                <article
                  v-for="(card, i) in txt.works.cards"
                  :key="`w-a-${i}`"
                  class="work-card work-card--marquee"
                >
                  <div class="work-card__media">
                    <img
                      v-if="card.image"
                      :src="card.image"
                      :alt="card.title"
                      class="work-card__img"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div class="work-card__body">
                    <div class="work-card__toolbar">
                      <h3 class="work-card__name">{{ card.title }}</h3>
                      <span class="work-card__accent" aria-hidden="true">+</span>
                    </div>
                    <p class="work-card__text">{{ card.body }}</p>
                  </div>
                </article>
              </div>
              <div class="works-marquee__segment" aria-hidden="true">
                <article
                  v-for="(card, i) in txt.works.cards"
                  :key="`w-b-${i}`"
                  class="work-card work-card--marquee"
                >
                  <div class="work-card__media">
                    <img
                      v-if="card.image"
                      :src="card.image"
                      :alt="card.title"
                      class="work-card__img"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div class="work-card__body">
                    <div class="work-card__toolbar">
                      <h3 class="work-card__name">{{ card.title }}</h3>
                      <span class="work-card__accent" aria-hidden="true">+</span>
                    </div>
                    <p class="work-card__text">{{ card.body }}</p>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="map" class="section section--map-grad section--bottom">
        <div class="section__inner">
          <h2 class="section__title">{{ txt.map.title }}</h2>
          <p class="map__hint">{{ txt.map.hint }}</p>
          <div class="map-area" role="region" :aria-label="txt.map.title">
            <MapZoneAGoogle
              :legend-text="txt.map.legendA"
              :api-key="googleMapsApiKey"
              :lat="mapZoneALat"
              :lng="mapZoneALng"
              :zoom="mapZoneAZoom"
              :maps-language="lang === 'zh' ? 'zh-TW' : 'en'"
            />
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <canvas id="gradient-canvas" class="footer__canvas" data-transition-in aria-hidden="true" />
      <div class="footer__scrim" aria-hidden="true" />
      <div class="footer__inner">
        <p>{{ txt.footer.organizer }}</p>
        <p><a href="mailto:info@urban-spectrum.art">{{ txt.footer.contact }}</a></p>
        <p class="footer__copy">{{ txt.footer.copy }}</p>
      </div>
    </footer>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..600&family=Noto+Sans+TC:wght@400;500;700&family=Playfair+Display:ital,wght@0,400..800;1,400..600&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
}

:root {
  /** 關於我們外層：上淺橘 → 下白（上至下） */
  --about-grad-peach: #ffefe4;
  --about-grad-white: #ffffff;
  --ink: #14121a;
  --ink-soft: #2a2633;
  --paper: #f6f4ef;
  --paper-tint: #ebe6dc;
  /** 主區米色漸層（雙色：亮底 → 明顯深一階的沙棕） */
  --page-bg-from: #fcf9f5;
  --page-bg-to: #dac9b4;
  /** 淺色銜接色：場次底／地圖頂、作品區等 */
  --schedule-map-seam: #fffdf9;
  /** 地圖區 aboutus.jpeg 上方的淺色罩（數字愈小照片愈清楚） */
  --map-bg-scrim-alpha: 0.62;
  --accent: #b8860b;
  --accent-soft: rgba(184, 134, 11, 0.12);
  --line: rgba(20, 18, 26, 0.12);
  /** Stripe WebGL 四角色（首屏、footer、作品區 canvas 共用） */
  --stripe-gradient-color-1: #fff8e5;
  --stripe-gradient-color-2: #ffab1a;
  --stripe-gradient-color-3: #f0f4be;
  --stripe-gradient-color-4: #ffc88a;
  --font-display: 'Playfair Display', 'Noto Sans TC', serif;
  --font-body: 'Noto Sans TC', 'DM Sans', system-ui, sans-serif;
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
    158deg,
    var(--page-bg-from) 0%,
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
  color: var(--ink);
}

.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.footer__canvas#gradient-canvas {
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

.footer__scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: rgba(255, 255, 254, 0.78);
}

.footer__inner {
  position: relative;
  z-index: 2;
}

/* Header */
.header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: linear-gradient(
    158deg,
    rgba(252, 249, 245, 0.86),
    rgba(218, 201, 180, 0.86)
  );
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}

.header__inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0.85rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  text-decoration: none;
  color: inherit;
}

.brand:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
  border-radius: 4px;
}

.brand__logo {
  display: block;
  height: clamp(2rem, 5.2vw, 2.5rem);
  width: auto;
  max-width: min(260px, 52vw);
  object-fit: contain;
  object-position: left center;
}

.brand__tag {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--ink-soft);
  opacity: 0.85;
}

.nav-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  width: 44px;
  height: 44px;
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
  gap: 1.5rem;
}

.nav__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav__link {
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ink-soft);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.4rem 0.65rem;
  border-radius: 6px;
  transition: color 0.15s ease, background 0.15s ease;
}

.nav__link:hover {
  color: var(--ink);
  background: var(--accent-soft);
}

.nav__link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.lang {
  display: inline-flex;
  border: 1px solid var(--line);
  border-radius: 999px;
  overflow: hidden;
  background: #fff;
}

.lang__btn {
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.45rem 0.85rem;
  border: none;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.lang__btn:hover {
  color: var(--ink);
  background: var(--paper-tint);
}

.lang__btn--active {
  background: var(--ink);
  color: var(--paper);
}

.lang__btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  z-index: 1;
}

@media (max-width: 900px) {
  .nav-toggle {
    display: flex;
  }

  .nav {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 0.75rem 1.25rem 1.25rem;
    background: linear-gradient(
      158deg,
      rgba(252, 249, 245, 0.97),
      rgba(218, 201, 180, 0.97)
    );
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--line);
    display: none;
  }

  .nav[data-open='true'] {
    display: flex;
  }

  .nav__list {
    flex-direction: column;
    align-items: stretch;
  }

  .nav__link {
    width: 100%;
    text-align: left;
    padding: 0.65rem 0.5rem;
  }

  .lang {
    align-self: flex-start;
    margin-top: 0.5rem;
  }
}

/* Hero — Stripe WebGL 全幅動態底 + 底部波浪（遮罩下方較透以保留動態感） */
.hero {
  position: relative;
  isolation: isolate;
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
  background: #fafaf9;
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
  z-index: 1;
  pointer-events: none;
  /** 由上略罩、接近底部逐漸變淡，Stripe 動態在 Banner 中下段仍清楚可見 */
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 254, 0.8) 0%,
    rgba(255, 255, 254, 0.62) min(52%, calc(100% - 160px)),
    rgba(255, 255, 254, 0.28) 100%
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

/** 疊在首屏 Stripe 之上，頂側透明處仍可見 Banner 底 */
.hero__wave {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  line-height: 0;
  pointer-events: none;
}

.hero__wave-svg {
  display: block;
  width: 100%;
  height: clamp(52px, 10vw, 92px);
  vertical-align: top;
  opacity: 0.88;
}

.hero__wave-path {
  fill: var(--about-grad-peach);
}

.hero__inner {
  position: relative;
  z-index: 5;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: clamp(3.75rem, 10svh, 5.5rem) 1.25rem clamp(3.5rem, 8svh, 5rem);
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
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
  margin: 0 0 1.25rem;
  max-width: 12ch;
}

.hero .btn--ghost {
  position: relative;
  z-index: 1;
}

.hero__title-stack {
  display: block;
  font-size: 0.42em;
  font-weight: 400;
  letter-spacing: 0.06em;
  margin-top: 0.35em;
  color: var(--ink-soft);
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
  background: var(--ink);
  color: var(--paper);
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(20, 18, 26, 0.12);
}

.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

/* Sections */
.section {
  padding: 4rem 1.25rem;
}

/** 入場須知：白底黑字／分頁切換／外框內容區＋單條字卡 */
.section--admission-panel {
  position: relative;
  background-color: #ffffff;
}

.section--admission-panel > .section__inner {
  position: relative;
}

.admission-panel__title {
  margin: 0 0 1.35rem;
  font-family: var(--font-body);
  font-weight: 700;
  font-size: clamp(1.65rem, 4vw, 2.25rem);
  line-height: 1.18;
  color: var(--ink);
  padding-bottom: 0.42rem;
  border-bottom: 1px solid var(--ink);
  width: fit-content;
  max-width: 100%;
}

.admission-panel__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 0.75rem;
  margin-bottom: 1rem;
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
  color: var(--ink);
  background: transparent;
  border: none;
  border-radius: 4px;
  box-shadow: none;
  appearance: none;
  text-align: left;
  transition: background-color 0.18s ease;
}

.admission-panel__tab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.admission-panel__tab[aria-selected='true'] {
  background: var(--accent-soft);
}

.admission-panel__tab:hover {
  background: var(--about-grad-peach);
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
  /* border: 1px solid var(--ink); */
  border-radius: 14px;
  background:#ffedde;
  box-shadow: 0 1px 0 rgba(20, 18, 26, 0.04);
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
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow:
    0 1px 0 rgba(20, 18, 26, 0.04),
    0 6px 20px rgba(20, 18, 26, 0.05);
}

.admission-panel__num {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 600;
  color: #df8f8f;
  line-height: 1;
  padding-top: 0.06em;
  flex-shrink: 0;
}

.admission-panel__card p {
  margin: 0;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.65;
  color: var(--ink);
}

/** 關於我們：上淺橘至下白（垂直漸層，由上到下） */
.section--about-grad {
  background: linear-gradient(to bottom, var(--about-grad-peach), var(--about-grad-white));
}

/** Banner 結束無縫接續波浪底，略上押避免透出頁面色 */
.section--about-after-hero {
  margin-top: -4px;
}

.about-card {
  position: relative;
  border-radius: 16px;
  padding: 2px;
  background: transparent;
  box-shadow: none;
  perspective: 1100px;
}

/** 流光邊（僅在非 reduce 且已揭露時由 animation-play-state 驅動） */
.about-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 17px;
  z-index: 0;
  background: linear-gradient(
    120deg,
    var(--about-grad-peach),
    rgba(255, 174, 90, 0.65),
    var(--accent),
    var(--stripe-gradient-color-3),
    var(--about-grad-peach)
  );
  background-size: 320% 320%;
  opacity: 0;
  transition: opacity 0.95s cubic-bezier(0.22, 1, 0.36, 1);
}

.about-card--visible::before {
  opacity: 0.92;
}

@media (prefers-reduced-motion: no-preference) {
  .about-card--visible::before {
    animation: about-card-flow 14s linear infinite;
  }

  .about-card--visible:hover::before {
    animation-duration: 8s;
  }
}

@keyframes about-card-flow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.about-card__inner {
  position: relative;
  z-index: 1;
  background: #ffffff;
  border-radius: 13px;
  padding: clamp(1.65rem, 4.2vw, 2.5rem);
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow:
    0 1px 0 rgba(20, 18, 26, 0.04),
    0 10px 28px rgba(20, 18, 26, 0.06);
  opacity: 0;
  transform-origin: 50% 0%;
  transform: translateY(56px) scale(0.925) rotateX(7deg);
  transition:
    opacity 0.88s cubic-bezier(0.18, 1, 0.32, 1),
    transform 1.05s cubic-bezier(0.18, 1, 0.32, 1),
    box-shadow 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.about-card--visible .about-card__inner {
  opacity: 1;
  transform: translateY(0) scale(1) rotateX(0deg);
}

@media (prefers-reduced-motion: no-preference) {
  .about-card--visible:hover .about-card__inner {
    transform: translateY(-8px) scale(1) rotateX(0deg);
    box-shadow:
      0 4px 12px rgba(20, 18, 26, 0.08),
      0 20px 48px rgba(20, 18, 26, 0.12);
  }
}

.about-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  margin-bottom: 0.25rem;
}

.about-card__head .about-card__title {
  flex: 1;
  min-width: min(100%, 12rem);
  margin: 0 0 1rem;
}

.about-card__more {
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 0.2rem;
  padding: 0.2rem 0;
  font-family: var(--font-body);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--accent);
  text-decoration: none;
  border: none;
  background: none;
  box-shadow: none;
  cursor: pointer;
  white-space: nowrap;
  transition:
    opacity 0.72s cubic-bezier(0.18, 1, 0.32, 1),
    transform 0.72s cubic-bezier(0.18, 1, 0.32, 1),
    color 0.2s ease;
}

.about-card__more:hover {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.22em;
}

.about-card__more:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 3px;
}

.about-card__title,
.about-card__more,
.about-card__para {
  opacity: 0;
  transform: translateY(32px);
  transition:
    opacity 0.72s cubic-bezier(0.18, 1, 0.32, 1),
    transform 0.82s cubic-bezier(0.18, 1, 0.32, 1);
}

.about-card--visible .about-card__title,
.about-card--visible .about-card__more,
.about-card--visible .about-card__para {
  opacity: 1;
  transform: none;
}

.about-card--visible .about-card__title {
  transition-delay: 0.12s;
}

.about-card--visible .about-card__more {
  transition-delay: 0.18s;
}

.about-card--visible .about-card__para:nth-child(1) {
  transition-delay: 0.28s;
}
.about-card--visible .about-card__para:nth-child(2) {
  transition-delay: 0.44s;
}
.about-card--visible .about-card__para:nth-child(3) {
  transition-delay: 0.6s;
}
.about-card--visible .about-card__para:nth-child(4) {
  transition-delay: 0.76s;
}
.about-card--visible .about-card__para:nth-child(5) {
  transition-delay: 0.92s;
}
.about-card--visible .about-card__para:nth-child(6) {
  transition-delay: 1.08s;
}

@media (prefers-reduced-motion: reduce) {
  .about-card::before {
    animation: none !important;
    opacity: 0 !important;
    display: none;
  }

  .about-card {
    border: 1px solid var(--line);
    padding: 0;
    border-radius: 14px;
  }

  .about-card__inner {
    border-radius: 14px;
    border: none;
    opacity: 1 !important;
    transform: none !important;
    transition: none;
    box-shadow:
      0 1px 0 rgba(20, 18, 26, 0.04),
      0 10px 32px rgba(20, 18, 26, 0.06);
  }

  .about-card__title,
  .about-card__more,
  .about-card__para {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}

/** 場次表：純白底 */
.section--schedule-grad {
  background-color: #ffffff;
}

/** 地圖區：aboutus.jpeg 襯底＋淺色罩以利標題／內容可讀 */
.section--map-grad {
  position: relative;
  isolation: isolate;
  background-color: var(--schedule-map-seam);
}

.section--map-grad::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: url('/aboutus.jpeg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  pointer-events: none;
}

.section--map-grad::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: rgba(255, 253, 249, var(--map-bg-scrim-alpha));
}

.section--map-grad > .section__inner {
  position: relative;
  z-index: 2;
}

#map.section--map-grad {
  margin-top: -1px;
  padding-top: calc(4rem + 1px);
}

/** 作品介紹：動態 canvas 底＋半透明罩＋輯紋／三欄卡 */
.section--works-board {
  position: relative;
  isolation: isolate;
  background: #fafaf9;
  overflow: hidden;
  /**
   * hover 陰影最大層約 0 38px 88px blur，底部可見尾很長；供子層 .works-marquee-bleed 繼承。
   */
  --works-marquee-shadow-room-t: clamp(2.6rem, 6.5vmin, 4rem);
  --works-marquee-shadow-room-b: clamp(5rem, 18vmin, 9rem);
}

.works-board__canvas {
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

.works-board__scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: rgba(255, 255, 254, 0.78);
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

.section--works-board .section__inner--works {
  position: relative;
  z-index: 3;
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
  font-family: var(--font-body);
  font-weight: 700;
  font-size: clamp(1.85rem, 4.2vw, 2.5rem);
  letter-spacing: 0.02em;
  margin: 0;
  color: var(--ink);
}

.works-marquee-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 1rem 0.5rem;
  margin: 0;
  border-radius: 999px;
  border: 1px solid rgba(20, 18, 26, 0.18);
  background: rgba(255, 255, 254, 0.72);
  color: var(--ink);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.works-marquee-toggle:hover {
  border-color: rgba(20, 18, 26, 0.35);
  background: rgba(255, 255, 254, 0.95);
}

.works-marquee-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.works-marquee-toggle__icon {
  display: inline-flex;
  line-height: 0;
}

.works-marquee-toggle__svg {
  display: block;
}

.works-marquee-toggle__svg--play {
  margin-left: 2px;
}

.works-marquee-bleed {
  position: relative;
  z-index: 3;
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

.works-marquee {
  cursor: grab;
  touch-action: none;
}

.works-marquee:active {
  cursor: grabbing;
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

.works-marquee__track--dragging {
  cursor: grabbing;
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
}

.work-card.work-card--marquee:hover {
  transform: translateY(-4px) translateZ(0);
}

.work-card {
  position: relative;
  isolation: isolate;
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(20, 18, 26, 0.08);
  box-shadow: 0 1px 0 rgba(20, 18, 26, 0.04), 0 12px 40px rgba(20, 18, 26, 0.05);
  /** 陰影畫在圓角外；與 overflow:hidden 同層易在邊緣出現裁切橫線，改由子層裁圖 */
  overflow: visible;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.26s ease, transform 0.26s ease;
}

.work-card:hover {
  transform: translateY(-7px) translateZ(0);
  box-shadow:
    0 4px 12px rgba(20, 18, 26, 0.1),
    0 18px 40px rgba(20, 18, 26, 0.16),
    0 38px 88px rgba(20, 18, 26, 0.22);
}

.work-card__media {
  aspect-ratio: 3 / 2;
  min-height: 160px;
  background: linear-gradient(
    145deg,
    #f0ebe6 0%,
    #e4dcd4 100%
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

.work-card__body {
  border-radius: 0 0 11px 11px;
  background: #fff;
  padding: 1.15rem 1.25rem 1.35rem;
  text-align: left;
}

.work-card__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
}

.work-card__name {
  flex: 1;
  margin: 0;
  font-family: var(--font-body);
  font-size: clamp(1rem, 1.85vw, 1.125rem);
  font-weight: 700;
  line-height: 1.35;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink);
}

.work-card__accent {
  flex-shrink: 0;
  font-size: 1.45rem;
  font-weight: 300;
  line-height: 1;
  color: #d43232;
  transform: translateY(-1px);
}

.work-card__text {
  margin: 0;
  font-size: 0.905rem;
  line-height: 1.62;
  color: #58555f;
}

.section--bottom {
  padding-bottom: 5rem;
}

.section__inner {
  max-width: 880px;
  margin: 0 auto;
}

.section__title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(1.65rem, 4vw, 2.25rem);
  margin: 0 0 1.5rem;
  line-height: 1.15;
}

.section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem 1.5rem;
  margin-bottom: 2rem;
}

.section__head .section__title {
  margin: 0;
}

.section__note {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.prose p {
  margin: 0 0 1.1em;
}

.prose p:last-child {
  margin-bottom: 0;
}

.schedule-cards {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.schedule-card {
  display: grid;
  grid-template-columns: minmax(0, 220px) 1fr;
  gap: 1rem 1.75rem;
  align-items: center;
  padding: 1.2rem 1.35rem;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 1px 0 rgba(20, 18, 26, 0.04), 0 10px 32px rgba(20, 18, 26, 0.06);
  opacity: 0;
  transition:
    opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.2s ease;
}

.schedule-card--from-left:not(.schedule-card--visible) {
  transform: translateX(clamp(-3rem, -6vw, -1.5rem));
}

.schedule-card--from-right:not(.schedule-card--visible) {
  transform: translateX(clamp(1.5rem, 6vw, 3rem));
}

.schedule-card--from-left.schedule-card--visible,
.schedule-card--from-right.schedule-card--visible {
  opacity: 1;
  transform: translateX(0);
}

.schedule-card:hover {
  box-shadow: 0 1px 0 rgba(20, 18, 26, 0.05), 0 16px 40px rgba(20, 18, 26, 0.08);
}

.schedule-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.35rem 0.75rem;
  border-radius: 10px;
  background: var(--accent-soft);
  border: 1px solid rgba(184, 134, 11, 0.18);
}

.schedule-card__day {
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
}

.schedule-card__time {
  font-size: 0.82rem;
  color: var(--ink-soft);
}

.schedule-card__name {
  margin: 0;
  font-size: clamp(1rem, 2.2vw, 1.08rem);
  font-weight: 600;
  line-height: 1.45;
  color: var(--ink);
}

@media (max-width: 640px) {
  .schedule-card {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    align-items: start;
  }

  .schedule-card__meta {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .schedule-card {
    opacity: 1;
    transform: none;
    transition: box-shadow 0.2s ease;
  }

  .admission-panel-fade-enter-active,
  .admission-panel-fade-leave-active {
    transition-duration: 0.01ms;
    transition-delay: 0ms;
  }
}

.map__hint {
  margin: -0.5rem 0 1.25rem;
  font-size: 0.92rem;
  color: var(--ink-soft);
  max-width: 52ch;
}

.map-area {
  margin-bottom: 0;
  border-radius: 12px;
  overflow: hidden;
  min-height: 260px;
}

.footer {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: 2.25rem 1.25rem 2.75rem;
  text-align: center;
  font-size: 0.88rem;
  color: var(--ink-soft);
  border-top: 1px solid var(--line);
  margin-top: auto;
  background: transparent;
}

@media (prefers-reduced-motion: reduce) {
  .footer__canvas {
    display: none !important;
  }

  .footer__scrim {
    display: none !important;
  }

  .hero__canvas {
    display: none !important;
  }

  .hero__scrim {
    display: none !important;
  }

  .works-board__canvas {
    display: none !important;
  }

  .works-board__scrim {
    display: none !important;
  }

  .footer {
    background: #fff;
  }

  .work-card {
    transition: box-shadow 0.2s ease;
  }

  .work-card:hover {
    transform: none;
  }
}

.footer p {
  margin: 0.35rem 0;
}

.footer a {
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}

.footer__copy {
  opacity: 0.75;
  margin-top: 1rem !important;
  font-size: 0.8rem;
}
</style>
