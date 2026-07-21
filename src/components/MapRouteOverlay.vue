<script setup lang="ts">
/** 1280×720 底圖座標；對齊 map-1.jpeg 場域→穹頂動線 */
const SLANT_DEG = -10

const routePoints = [
  { x: 240, y: 212 },
  { x: 452, y: 212 },
  {
    x: 452 + Math.round((448 - 212) * Math.tan((SLANT_DEG * Math.PI) / 180)),
    y: 448,
  },
  { x: 640, y: 448 },
  { x: 640, y: 566 },
  { x: 745, y: 566 },
] as const

const routePath = routePoints
  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
  .join(' ')

const ANIM_DURATION = 18
const CHEVRON_COUNT = 20

/** 等距錯開起點，讓箭頭沿路徑均勻分布 */
const chevronMotionStarts = Array.from({ length: CHEVRON_COUNT }, (_, i) =>
  i === 0 ? '0s' : `-${(ANIM_DURATION / CHEVRON_COUNT) * i}s`,
)
</script>

<template>
  <div class="map-route-overlay" aria-hidden="true">
    <svg
      class="map-route-overlay__svg"
      viewBox="0 0 1280 720"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <path
          id="map-route-motion-path"
          :d="routePath"
        />
      </defs>

      <g
        v-for="(begin, index) in chevronMotionStarts"
        :key="`map-chevron-${index}`"
        class="map-route-overlay__chevron"
        transform="translate(-8, -12)"
      >
        <path
          class="map-route-overlay__chevron-shape"
          d="M 2 2 L 14 12 L 2 22"
        />
        <animateMotion
          :dur="`${ANIM_DURATION}s`"
          repeatCount="indefinite"
          rotate="auto"
          :begin="begin"
          calcMode="linear"
        >
          <mpath href="#map-route-motion-path" />
        </animateMotion>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.map-route-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.map-route-overlay__svg {
  display: block;
  width: 100%;
  height: 100%;
  color: #fff;
  overflow: visible;
}

.map-route-overlay__chevron-shape {
  fill: none;
  stroke: currentColor;
  stroke-width: 9;
  stroke-linecap: butt;
  stroke-linejoin: miter;
  stroke-miterlimit: 2;
  filter: drop-shadow(0 0 2px rgb(0 0 0 / 0.65))
    drop-shadow(0 0 5px rgb(255 255 255 / 0.55));
}
</style>
