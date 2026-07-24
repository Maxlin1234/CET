import { createRouter, createWebHistory } from 'vue-router'

/** 活動站根路徑（對應另一專案的 /festival/2026） */
export const APP_BASE_PATH = '/event/skyward'

export const SECTION_ROUTE_NAMES = [
  'about',
  'schedule',
  'admission',
  'works',
  'map',
] as const

export type SectionRouteName = (typeof SECTION_ROUTE_NAMES)[number]

export function isSectionRouteName(value: unknown): value is SectionRouteName {
  return (
    typeof value === 'string' &&
    (SECTION_ROUTE_NAMES as readonly string[]).includes(value)
  )
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      redirect: APP_BASE_PATH,
    },
    {
      path: '/event',
      name: 'event',
      redirect: APP_BASE_PATH,
    },
    {
      path: APP_BASE_PATH,
      name: 'home',
      component: () => import('@/App.vue'),
    },
    {
      path: `${APP_BASE_PATH}/:section(${SECTION_ROUTE_NAMES.join('|')})`,
      name: 'section',
      component: () => import('@/App.vue'),
    },
  ],
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.name === 'home') return { top: 0 }
    return false
  },
})

export default router
