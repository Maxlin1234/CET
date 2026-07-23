<script setup lang="ts">
/** 1280×720 底圖座標；對齊 map-1.jpeg 動線 */

type RoutePoint = { x: number; y: number }

type RouteDef = {
  id: string
  points: readonly RoutePoint[]
  color: string
  glow: string
}

/**
 * 原動線（白）：左上入口 → 西側廊道 → 中央橫向 → 南下 → 右拐至鋪面
 * 尾端對齊標註白箭頭（鋪面，非草地）
 */
const whiteRoutePoints = [
  { x: 300, y: 220 },
  { x: 450, y: 220 },
  { x: 415, y: 432 },
  { x: 670, y: 448 },
  { x: 665, y: 600 },
  { x: 740, y: 618 },
] as const

/**
 * 第二條動線（鵝黃色）：右側入口 → 東側廊道下行 → 底部略向左
 */
const yellowRoutePoints = [
  { x: 975, y: 228 },
  { x: 825, y: 228 },
  { x: 835, y: 320 },
  { x: 860, y: 450 },
  { x: 890, y: 560 },
  { x: 900, y: 608 },
  { x: 820, y: 620 },
] as const

const routes: readonly RouteDef[] = [
  {
    id: 'white',
    points: whiteRoutePoints,
    color: '#fff',
    glow: 'drop-shadow(0 0 2px rgb(0 0 0 / 0.65)) drop-shadow(0 0 5px rgb(255 255 255 / 0.55))',
  },
  {
    id: 'yellow',
    points: yellowRoutePoints,
    color: '#f0e0a0',
    glow: 'drop-shadow(0 0 2px rgb(0 0 0 / 0.45)) drop-shadow(0 0 5px rgb(240 224 160 / 0.5))',
  },
]

function pointsToPath(points: readonly RoutePoint[]) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

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
          v-for="route in routes"
          :id="`map-route-motion-path-${route.id}`"
          :key="`path-${route.id}`"
          :d="pointsToPath(route.points)"
        />
      </defs>

      <g
        v-for="route in routes"
        :key="`route-${route.id}`"
        class="map-route-overlay__route"
        :style="{ '--route-color': route.color, '--route-glow': route.glow }"
      >
        <g
          v-for="(begin, index) in chevronMotionStarts"
          :key="`map-chevron-${route.id}-${index}`"
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
            <mpath :href="`#map-route-motion-path-${route.id}`" />
          </animateMotion>
        </g>
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
  overflow: visible;
}

.map-route-overlay__chevron-shape {
  fill: none;
  stroke: var(--route-color, #fff);
  stroke-width: 9;
  stroke-linecap: butt;
  stroke-linejoin: miter;
  stroke-miterlimit: 2;
  filter: var(--route-glow);
}
</style>
