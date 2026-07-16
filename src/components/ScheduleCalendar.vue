<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Lang } from '@/i18n'
import type { ScheduleCopy, ScheduleProgram } from '@/types/schedule'

const props = defineProps<{
  lang: Lang
  schedule: ScheduleCopy
  /** 可開啟作品詳情的標題關鍵字（通常來自 worksCards） */
  openableWorkTitles?: readonly string[]
}>()

const emit = defineEmits<{
  selectProgram: [program: ScheduleProgram]
}>()

const CALENDAR_START_YEAR = 2026
const CALENDAR_START_MONTH = 7 // August (0-indexed)

const viewYear = ref(CALENDAR_START_YEAR)
const viewMonth = ref(CALENDAR_START_MONTH)
const selectedDate = ref('')

const slotsByDate = computed(() => {
  const map = new Map<string, ScheduleCopy['slots'][number][]>()
  for (const slot of props.schedule.slots) {
    const list = map.get(slot.date) ?? []
    list.push(slot)
    map.set(slot.date, list)
  }
  return map
})

const eventDates = computed(() => {
  const set = new Set<string>(props.schedule.eventDates)
  for (const date of slotsByDate.value.keys()) set.add(date)
  return set
})

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthIndex(year: number, month: number) {
  return year * 12 + month
}

const minMonthIndex = monthIndex(CALENDAR_START_YEAR, CALENDAR_START_MONTH)

const canGoPrev = computed(
  () => monthIndex(viewYear.value, viewMonth.value) > minMonthIndex,
)

const monthLabel = computed(() => {
  const locale = props.lang === 'zh' ? 'zh-TW' : 'en-US'
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(
    new Date(viewYear.value, viewMonth.value, 1),
  )
})

type CalendarCell = {
  key: string
  day: number
  date: string
  inMonth: boolean
  hasEvents: boolean
  isSelected: boolean
  isToday: boolean
}

const calendarCells = computed((): CalendarCell[] => {
  const year = viewYear.value
  const month = viewMonth.value
  const first = new Date(year, month, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const todayIso = isoDate(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  )

  const cells: CalendarCell[] = []

  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const m = month - 1
    const y = m < 0 ? year - 1 : year
    const mo = (m + 12) % 12
    const date = isoDate(y, mo, day)
    cells.push({
      key: `p-${date}`,
      day,
      date,
      inMonth: false,
      hasEvents: eventDates.value.has(date),
      isSelected: date === selectedDate.value,
      isToday: date === todayIso,
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = isoDate(year, month, day)
    cells.push({
      key: `c-${date}`,
      day,
      date,
      inMonth: true,
      hasEvents: eventDates.value.has(date),
      isSelected: date === selectedDate.value,
      isToday: date === todayIso,
    })
  }

  const trailing = (7 - (cells.length % 7)) % 7
  for (let day = 1; day <= trailing; day++) {
    const m = month + 1
    const y = m > 11 ? year + 1 : year
    const mo = m % 12
    const date = isoDate(y, mo, day)
    cells.push({
      key: `n-${date}`,
      day,
      date,
      inMonth: false,
      hasEvents: eventDates.value.has(date),
      isSelected: date === selectedDate.value,
      isToday: date === todayIso,
    })
  }

  return cells
})

const selectedSlots = computed(() => slotsByDate.value.get(selectedDate.value) ?? [])

/** 已展開的群組場次 index（如「節目一」） */
const expandedSlotKeys = ref<Set<string>>(new Set())

function slotKey(row: ScheduleCopy['slots'][number], index: number) {
  return `${row.date}-${index}-${row.name}`
}

function isGroupSlot(row: ScheduleCopy['slots'][number]) {
  return Array.isArray(row.items) && row.items.length > 0
}

function isExpanded(row: ScheduleCopy['slots'][number], index: number) {
  return expandedSlotKeys.value.has(slotKey(row, index))
}

function toggleGroupSlot(row: ScheduleCopy['slots'][number], index: number) {
  if (!isGroupSlot(row)) return
  const key = slotKey(row, index)
  const next = new Set(expandedSlotKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedSlotKeys.value = next
}

watch(selectedDate, () => {
  expandedSlotKeys.value = new Set()
})

function normalizeProgramTitle(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\s　]/g, '')
    .replace(/[：:－—–\-_/\\|《》〈〉「」『』【】\[\]()（）]/g, '')
    .toLowerCase()
}

function isProgramOpenable(item: ScheduleProgram) {
  const titles = props.openableWorkTitles
  if (!titles?.length) return false
  const needle = normalizeProgramTitle(item.name)
  if (!needle) return false
  return titles.some((title) => {
    const hay = normalizeProgramTitle(title)
    if (!hay) return false
    return hay === needle || hay.includes(needle) || needle.includes(hay)
  })
}

function onProgramItemClick(item: ScheduleProgram) {
  if (!isProgramOpenable(item)) return
  emit('selectProgram', item)
}

function parseIsoParts(iso: string) {
  const [ys, ms, ds] = iso.split('-')
  const y = Number(ys)
  const m = Number(ms)
  const d = Number(ds)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  return { y, m, d }
}

const selectedDayLabel = computed(() => {
  if (!selectedDate.value) return ''
  const parts = parseIsoParts(selectedDate.value)
  if (!parts) return ''
  const locale = props.lang === 'zh' ? 'zh-TW' : 'en-US'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(parts.y, parts.m - 1, parts.d))
})

function pickDefaultDate() {
  const inView = [...eventDates.value].filter((date) => {
    const parts = parseIsoParts(date)
    if (!parts) return false
    return parts.y === viewYear.value && parts.m - 1 === viewMonth.value
  })
  if (inView.length > 0) {
    selectedDate.value = inView.sort()[0]!
    return
  }
  if (eventDates.value.size > 0) {
    selectedDate.value = [...eventDates.value].sort()[0]!
    const parts = parseIsoParts(selectedDate.value)
    if (parts) {
      viewYear.value = parts.y
      viewMonth.value = parts.m - 1
    }
    return
  }
  selectedDate.value = isoDate(viewYear.value, viewMonth.value, 1)
}

function selectDate(date: string) {
  selectedDate.value = date
  const parts = parseIsoParts(date)
  if (parts && (parts.y !== viewYear.value || parts.m - 1 !== viewMonth.value)) {
    viewYear.value = parts.y
    viewMonth.value = parts.m - 1
  }
}

function goPrevMonth() {
  if (!canGoPrev.value) return
  if (viewMonth.value === 0) {
    viewYear.value -= 1
    viewMonth.value = 11
  } else {
    viewMonth.value -= 1
  }
}

function goNextMonth() {
  if (viewMonth.value === 11) {
    viewYear.value += 1
    viewMonth.value = 0
  } else {
    viewMonth.value += 1
  }
}

watch(
  () => props.schedule.slots,
  () => pickDefaultDate(),
  { immediate: true },
)

watch([viewYear, viewMonth], () => {
  const prefix = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}`
  if (selectedDate.value.startsWith(prefix)) return
  const inMonth = [...eventDates.value]
    .filter((d) => d.startsWith(prefix))
    .sort()
  selectedDate.value = inMonth[0] ?? isoDate(viewYear.value, viewMonth.value, 1)
})
</script>

<template>
  <div class="schedule-calendar">
    <div class="schedule-calendar__panel schedule-calendar__panel--cal">
      <div class="schedule-calendar__month-bar">
        <button
          type="button"
          class="schedule-calendar__nav"
          :disabled="!canGoPrev"
          :aria-label="lang === 'zh' ? '上一個月' : 'Previous month'"
          @click="goPrevMonth"
        >
          ‹
        </button>
        <h3 class="schedule-calendar__month">{{ monthLabel }}</h3>
        <button
          type="button"
          class="schedule-calendar__nav"
          :aria-label="lang === 'zh' ? '下一個月' : 'Next month'"
          @click="goNextMonth"
        >
          ›
        </button>
      </div>

      <div class="schedule-calendar__weekdays" aria-hidden="true">
        <span v-for="(wd, i) in schedule.weekdays" :key="i" class="schedule-calendar__weekday">
          {{ wd }}
        </span>
      </div>

      <div
        class="schedule-calendar__grid"
        role="grid"
        :aria-label="lang === 'zh' ? '活動日曆' : 'Event calendar'"
      >
        <button
          v-for="cell in calendarCells"
          :key="cell.key"
          type="button"
          class="schedule-calendar__day"
          :class="{
            'schedule-calendar__day--outside': !cell.inMonth,
            'schedule-calendar__day--has-event': cell.hasEvents,
            'schedule-calendar__day--selected': cell.isSelected,
            'schedule-calendar__day--today': cell.isToday,
          }"
          role="gridcell"
          :aria-pressed="cell.isSelected"
          :aria-label="cell.date"
          @click="selectDate(cell.date)"
        >
          <span class="schedule-calendar__day-num">{{ cell.day }}</span>
          <span v-if="cell.hasEvents" class="schedule-calendar__dot" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="schedule-calendar__panel schedule-calendar__panel--list">
      <h3 class="schedule-calendar__list-title">{{ selectedDayLabel }}</h3>
      <ul v-if="selectedSlots.length" class="schedule-cards" role="list">
        <li
          v-for="(row, i) in selectedSlots"
          :key="`${row.date}-${i}`"
          class="schedule-card"
          :class="{
            'schedule-card--group': isGroupSlot(row),
            'schedule-card--expanded': isGroupSlot(row) && isExpanded(row, i),
          }"
        >
          <template v-if="isGroupSlot(row)">
            <button
              type="button"
              class="schedule-card__group-toggle"
              :aria-expanded="isExpanded(row, i)"
              @click="toggleGroupSlot(row, i)"
            >
              <span class="schedule-card__name">{{ row.name }}</span>
              <span class="schedule-card__chevron" aria-hidden="true" />
            </button>
            <div
              v-if="isExpanded(row, i) && row.groupIntro"
              class="schedule-card__group-intro"
            >
              <p class="schedule-card__group-intro-text">{{ row.groupIntro }}</p>
            </div>
            <ul
              v-if="isExpanded(row, i)"
              class="schedule-card__items"
              role="list"
            >
              <li
                v-for="(item, j) in row.items"
                :key="`${row.date}-${i}-item-${j}`"
                class="schedule-card__item"
                :class="{ 'schedule-card__item--openable': isProgramOpenable(item) }"
              >
                <button
                  v-if="isProgramOpenable(item)"
                  type="button"
                  class="schedule-card__item-btn"
                  @click="onProgramItemClick(item)"
                >
                  <div class="schedule-card__program">
                    <p class="schedule-card__name">{{ item.name }}</p>
                    <p v-if="item.creator" class="schedule-card__creator">{{ item.creator }}</p>
                    <div v-if="item.duration || item.region" class="schedule-card__facts">
                      <span v-if="item.duration" class="schedule-card__duration">{{ item.duration }}</span>
                      <span
                        v-if="item.duration && item.region"
                        class="schedule-card__sep"
                        aria-hidden="true"
                      >·</span>
                      <span v-if="item.region" class="schedule-card__region">{{ item.region }}</span>
                    </div>
                  </div>
                </button>
                <div v-else class="schedule-card__program">
                  <p class="schedule-card__name">{{ item.name }}</p>
                  <p v-if="item.creator" class="schedule-card__creator">{{ item.creator }}</p>
                  <div v-if="item.duration || item.region" class="schedule-card__facts">
                    <span v-if="item.duration" class="schedule-card__duration">{{ item.duration }}</span>
                    <span
                      v-if="item.duration && item.region"
                      class="schedule-card__sep"
                      aria-hidden="true"
                    >·</span>
                    <span v-if="item.region" class="schedule-card__region">{{ item.region }}</span>
                  </div>
                </div>
              </li>
            </ul>
          </template>
          <template v-else-if="row.creator || row.duration || row.region">
            <div class="schedule-card__program">
              <p class="schedule-card__name">{{ row.name }}</p>
              <p class="schedule-card__creator">{{ row.creator }}</p>
              <div class="schedule-card__facts">
                <span v-if="row.duration" class="schedule-card__duration">{{ row.duration }}</span>
                <span v-if="row.duration && row.region" class="schedule-card__sep" aria-hidden="true">·</span>
                <span v-if="row.region" class="schedule-card__region">{{ row.region }}</span>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="schedule-card__meta">
              <span v-if="row.time" class="schedule-card__time">{{ row.time }}</span>
            </div>
            <p class="schedule-card__name">{{ row.name }}</p>
          </template>
        </li>
      </ul>
      <p v-else class="schedule-calendar__empty">{{ schedule.emptyDay }}</p>
    </div>
  </div>
</template>

<style scoped>
.schedule-calendar {
  display: grid;
  grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
  gap: clamp(1.25rem, 3vw, 2rem);
  align-items: start;
}

.schedule-calendar__panel {
  border-radius: 16px;
  border: 1px solid rgb(var(--blue-rgb) / 0.2);
  background: var(--card-info-surface);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.92) inset,
    0 8px 28px rgb(var(--blue-rgb) / 0.12);
}

.schedule-calendar__panel--cal {
  padding: 1.1rem 1rem 1.25rem;
}

.schedule-calendar__panel--list {
  padding: 1.25rem 1.35rem 1.35rem;
  min-height: 280px;
}

.schedule-calendar__month-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}

.schedule-calendar__month {
  margin: 0;
  font-family: var(--font-title);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text-on-light);
}

.schedule-calendar__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  margin: 0;
  padding: 0;
  border: 1px solid rgb(var(--blue-rgb) / 0.22);
  border-radius: 8px;
  background: #fff;
  color: var(--palette-blue);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.schedule-calendar__nav:hover:not(:disabled) {
  background: var(--card-info-surface-hover);
  border-color: rgb(var(--blue-rgb) / 0.38);
}

.schedule-calendar__nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.schedule-calendar__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.2rem;
  margin-bottom: 0.35rem;
}

.schedule-calendar__weekday {
  text-align: center;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgb(var(--blue-rgb) / 0.65);
}

.schedule-calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
}

.schedule-calendar__day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  min-height: 2.65rem;
  margin: 0;
  padding: 0.2rem 0;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-on-light);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.schedule-calendar__day:hover {
  background: rgb(var(--blue-rgb) / 0.06);
  border-color: rgb(var(--blue-rgb) / 0.14);
}

.schedule-calendar__day--outside {
  color: rgb(var(--blue-rgb) / 0.38);
}

.schedule-calendar__day--has-event:not(.schedule-calendar__day--selected) {
  background: #c1adff;
  border-color: rgb(153 120 255 / 0.45);
}

.schedule-calendar__day--has-event:not(.schedule-calendar__day--selected):hover {
  background: #b49aff;
  border-color: rgb(153 120 255 / 0.62);
}

.schedule-calendar__day--has-event .schedule-calendar__day-num {
  color: var(--palette-blue);
}

.schedule-calendar__day--outside.schedule-calendar__day--has-event:not(.schedule-calendar__day--selected) {
  background: rgb(193 173 255 / 0.45);
}

.schedule-calendar__day--selected {
  background: var(--palette-blue);
  border-color: var(--palette-blue);
  color: #fff;
}

.schedule-calendar__day--selected .schedule-calendar__day-num {
  color: #fff;
}

.schedule-calendar__day--selected .schedule-calendar__dot {
  background: #fff;
}

.schedule-calendar__day--today:not(.schedule-calendar__day--selected) {
  border-color: rgb(var(--orange-rgb) / 0.45);
}

.schedule-calendar__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--palette-blue);
}

.schedule-calendar__list-title {
  margin: 0 0 1rem;
  font-family: var(--font-title);
  font-size: clamp(1rem, 2.2vw, 1.2rem);
  font-weight: 700;
  line-height: 1.4;
  color: var(--text-on-light);
}

.schedule-calendar__empty {
  margin: 0;
  padding: 2rem 0.5rem;
  text-align: center;
  color: rgb(var(--blue-rgb) / 0.55);
  font-size: 0.95rem;
}

.schedule-cards {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.schedule-card {
  display: grid;
  grid-template-columns: minmax(0, 140px) 1fr;
  gap: 0.75rem 1.25rem;
  align-items: center;
  padding: 1rem 1.1rem;
  border-radius: 12px;
  border: 1px solid rgb(var(--blue-rgb) / 0.2);
  background: #fff;
  color: var(--on-accent);
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.schedule-card:has(.schedule-card__program),
.schedule-card--group {
  display: block;
}

.schedule-card--group {
  padding: 0;
  overflow: hidden;
}

.schedule-card__group-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0;
  padding: 1rem 1.1rem;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.schedule-card__group-toggle:hover .schedule-card__name {
  color: var(--palette-blue);
}

.schedule-card__group-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.schedule-card__chevron {
  flex-shrink: 0;
  width: 0.55rem;
  height: 0.55rem;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.2s ease;
  opacity: 0.7;
}

.schedule-card--expanded .schedule-card__chevron {
  transform: rotate(225deg);
}

.schedule-card__group-intro {
  margin: 0;
  padding: 0.95rem 1.1rem 0.15rem;
  border-top: 1px solid rgb(var(--blue-rgb) / 0.12);
  background: linear-gradient(
    180deg,
    rgb(var(--blue-rgb) / 0.05) 0%,
    transparent 100%
  );
}

.schedule-card__group-intro-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.65;
  color: rgb(var(--blue-rgb) / 0.82);
}

.schedule-card__items {
  list-style: none;
  margin: 0;
  padding: 0.75rem 1.1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.schedule-card__item {
  padding: 0.75rem 0 0;
}

.schedule-card__item + .schedule-card__item {
  border-top: 1px dashed rgb(var(--blue-rgb) / 0.12);
}

.schedule-card__item-btn {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.schedule-card__item-btn:hover {
  background: rgb(var(--blue-rgb) / 0.06);
}

.schedule-card__item-btn:hover .schedule-card__name {
  color: var(--palette-blue);
}

.schedule-card__item-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.schedule-card__program {
  display: grid;
  gap: 0.2rem;
}

.schedule-card__creator {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: rgb(var(--blue-rgb) / 0.78);
}

.schedule-card__facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.15rem;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--palette-blue);
}

.schedule-card__sep {
  opacity: 0.55;
}

.schedule-card:hover {
  border-color: rgb(var(--orange-rgb) / 0.42);
  box-shadow: 0 8px 24px rgb(var(--blue-rgb) / 0.14);
  transform: translateY(-2px);
}

.schedule-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.schedule-card__time {
  font-weight: 700;
  font-size: 0.88rem;
  letter-spacing: 0.03em;
  color: var(--palette-blue);
}

.schedule-card__name {
  margin: 0;
  font-size: 0.98rem;
  line-height: 1.5;
  font-weight: 600;
}

@media (max-width: 860px) {
  .schedule-calendar {
    grid-template-columns: 1fr;
  }

  .schedule-card {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }
}
</style>
