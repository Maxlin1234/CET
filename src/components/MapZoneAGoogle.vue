<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef } from 'vue'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

const props = defineProps<{
  /** 角標次要說明（可選）；主標題為 legendText／座標名稱 */
  zoneLabel?: string
  legendText: string
  apiKey: string
  lat: number
  lng: number
  zoom: number
  /** Maps JS 介面語言，例：zh-TW、en */
  mapsLanguage?: string
}>()

const mapEl = shallowRef<HTMLElement | null>(null)
const loadError = ref(false)
const mapDisplayed = ref(false)

const hasKey = computed(() => !!(props.apiKey?.trim()))

/** 採用 Google 官方嵌入用網址（不需 Maps JavaScript API 金鑰；由 Google 提供一般網頁嵌入） */
const iframeSrc = computed(() => {
  const z = Math.min(21, Math.max(1, Math.round(props.zoom)))
  const hl = encodeURIComponent(props.mapsLanguage ?? 'zh-TW')
  return `https://www.google.com/maps?q=${props.lat},${props.lng}&z=${z}&output=embed&hl=${hl}`
})

/** 無金鑰，或 JS API 載入失敗時，改顯示免費 iframe */
const showIframe = computed(() => !hasKey.value || loadError.value)

/** 有金鑰且尚未失敗時才初始化 JS 地圖 */
const mapEmbedActive = computed(() => hasKey.value && !loadError.value)

const surfaceActive = computed(
  () => showIframe.value || mapEmbedActive.value || (hasKey.value && !loadError.value && !mapDisplayed.value),
)

const showJsMap = computed(() => hasKey.value && mapDisplayed.value && !loadError.value)

const showCorner = computed(() => showIframe.value || showJsMap.value)

let mapObj: google.maps.Map | undefined

async function bootMap(el: HTMLElement) {
  loadError.value = false
  mapDisplayed.value = false
  mapObj = undefined
  try {
    setOptions({
      key: props.apiKey.trim(),
      language: props.mapsLanguage ?? 'zh-TW',
      v: 'weekly',
    })

    const mapsLib = (await importLibrary('maps')) as google.maps.MapsLibrary
    const { Marker } = (await importLibrary('marker')) as google.maps.MarkerLibrary

    mapObj = new mapsLib.Map(el, {
      center: { lat: props.lat, lng: props.lng },
      zoom: props.zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: 'cooperative',
    })
    new Marker({
      position: { lat: props.lat, lng: props.lng },
      map: mapObj,
      title: props.legendText,
    })
    mapDisplayed.value = true
    google.maps.event.addListenerOnce(mapObj, 'idle', () => {
      google.maps.event.trigger(mapObj!, 'resize')
    })
  } catch (e) {
    if (import.meta.env.DEV) console.error('[MapZoneAGoogle] JS API failed, using embed iframe', e)
    loadError.value = true
    mapObj = undefined
    mapDisplayed.value = false
  }
}

onMounted(async () => {
  if (!hasKey.value) return
  await nextTick()
  const el = mapEl.value
  if (el) await bootMap(el)
})
</script>

<template>
  <div class="map-zone-a" :class="{ 'map-zone-a--embed': surfaceActive }">
    <!-- 免費嵌入：無金鑰，或 JS API 失敗 -->
    <iframe
      v-if="showIframe"
      class="map-zone-a__iframe"
      :src="iframeSrc"
      :title="legendText"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      allowfullscreen
    />

    <!-- 有金鑰且載入成功前／後：JS 地圖容器 -->
    <div
      v-if="mapEmbedActive"
      ref="mapEl"
      class="map-zone-a__gmap"
      aria-hidden="true"
    />

    <div v-if="showCorner" class="map-zone-a__corner-overlay">
      <span class="map-zone-a__corner-title">{{ legendText }}</span>
      <small v-if="zoneLabel">{{ zoneLabel }}</small>
    </div>
  </div>
</template>

<style scoped>
.map-zone-a {
  overflow: hidden;
  border-radius: 12px;
}

.map-zone-a--embed {
  padding: 0;
  position: relative;
  min-height: 280px;
  align-self: stretch;
  background: var(--paper-tint, #ebe6dc);
}

.map-zone-a__iframe {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  min-height: 240px;
  border: 0;
  border-radius: inherit;
}

.map-zone-a__gmap {
  width: 100%;
  height: 100%;
  min-height: 200px;
  position: absolute;
  inset: 0;
  z-index: 0;
}

.map-zone-a__corner-overlay {
  position: absolute;
  inset: auto auto 10px 10px;
  z-index: 2;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.15rem;
  color: var(--paper, #fff);
  text-shadow:
    0 0 6px rgba(0, 0, 0, 0.85),
    0 1px 2px rgba(0, 0, 0, 0.7);
}

.map-zone-a__corner-overlay .map-zone-a__corner-title {
  font-family:
    var(--font-display),
    'Playfair Display',
    'Noto Sans TC',
    serif;
  font-size: clamp(1.05rem, 3.8vw, 1.85rem);
  line-height: 1.18;
  font-weight: 700;
}

.map-zone-a__corner-overlay small {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.92;
}
</style>
