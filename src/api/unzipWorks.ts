import type { Lang } from '@/i18n'
import type { WorkArtist, WorkArtistBioSource, WorkCard } from '@/types/workCard'

type UnzipMedia = {
  url?: string
  attachment_id?: number | null
  storage_code?: string | null
  file_size?: number | null
  mimetype?: string | null
}

type UnzipPhoto = {
  sequence: number
  image_media?: UnzipMedia | null
}

type UnzipAuthor = {
  name?: string | null
  name_zh_tw?: string | null
  display_name?: string | null
  image_1920_media?: UnzipMedia | null
  introduction?: string | null
  introduction_zh_tw?: string | null
  biography?: string | null
  biography_zh_tw?: string | null
  description?: string | null
  description_zh_tw?: string | null
}

type UnzipCollective = UnzipAuthor & {
  id?: number
}

type UnzipContributor = UnzipAuthor & {
  id?: number
}

export type UnzipWork = {
  id: number
  title: string
  title_zh_tw?: string | null
  state?: string | null
  note?: string | null
  note_zh_tw?: string | null
  /** 部分作品介紹寫在 proposal，而非 note */
  proposal?: string | null
  proposal_zh_tw?: string | null
  featured_photo_media?: UnzipMedia | null
  image_1920_media?: UnzipMedia | null
  photos?: UnzipPhoto[] | null
  collectives?: UnzipCollective[] | null
  contributors?: UnzipContributor[] | null
}

type UnzipWorksResponse = {
  success?: boolean
  data?: UnzipWork[]
  meta?: {
    total?: number
    limit?: number
    offset?: number
    totalPages?: number
  }
}

const DEFAULT_WORKS_PATH = '/projects/119/works'
const DEFAULT_WORKS_URL = `https://unzip.clab.org.tw/api/v1${DEFAULT_WORKS_PATH}`
const WORKS_PAGE_SIZE = 100
const UNZIP_PROXY_PATH = '/.netlify/functions/unzip'

export type WorksApiMode = 'direct' | 'proxy'

export type WorksApiConfig = {
  mode: WorksApiMode
  /** direct 模式為完整 works URL；proxy 模式為 function 路徑 */
  url: string
  key: string
}

export function getWorksApiConfig(): WorksApiConfig {
  const key = String(import.meta.env.VITE_UNZIP_API_KEY ?? '').trim()
  const url = String(import.meta.env.VITE_UNZIP_WORKS_API_URL ?? DEFAULT_WORKS_URL).trim()

  /** 正式站優先走 Function 代理；若 build 時有 key，代理失敗可改直連 */
  if (import.meta.env.PROD) {
    return { mode: 'proxy', url, key }
  }
  return { mode: 'direct', url, key }
}

function worksPathFromConfigUrl(apiUrl: string): string {
  try {
    if (apiUrl.startsWith('http')) {
      const parsed = new URL(apiUrl)
      const path = parsed.pathname.replace(/^\/api\/v1/, '')
      return path.startsWith('/') ? path : `/${path}`
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_WORKS_PATH
}

async function fetchUnzipJson<T>(
  path: string,
  query: Record<string, string | number> = {},
  signal?: AbortSignal,
): Promise<T> {
  const config = getWorksApiConfig()
  const attempts: WorksApiMode[] =
    config.mode === 'proxy'
      ? config.key
        ? ['proxy', 'direct']
        : ['proxy']
      : ['direct']

  let lastError: Error | null = null

  for (const mode of attempts) {
    const { url, headers } =
      mode === 'proxy'
        ? buildUnzipRequest(path, query)
        : buildDirectRequest(path, query, config.key)

    try {
      // 只用 cache:'no-store'；勿加自訂 Cache-Control／Pragma（會觸發 CORS preflight）
      const res = await fetch(url, { signal, headers, cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`Unzip API failed (${mode}): ${res.status} ${res.statusText}`)
      }
      return (await res.json()) as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn('[works] fetch failed', { mode, path, error: lastError.message })
    }
  }

  throw lastError ?? new Error('Unzip API request failed')
}

function buildDirectRequest(
  path: string,
  query: Record<string, string | number>,
  apiKey: string,
): { url: string; headers: Record<string, string> } {
  const url = new URL(`https://unzip.clab.org.tw/api/v1${path}`)
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value))
  }
  return {
    url: url.toString(),
    headers: {
      Authorization: `Api-Key ${apiKey}`,
      Accept: 'application/json',
    },
  }
}

function buildUnzipRequest(
  path: string,
  query: Record<string, string | number> = {},
): { url: string; headers: Record<string, string> } {
  const params = new URLSearchParams()
  params.set('path', path)
  for (const [key, value] of Object.entries(query)) {
    params.set(key, String(value))
  }
  return {
    url: `${UNZIP_PROXY_PATH}?${params.toString()}`,
    headers: { Accept: 'application/json' },
  }
}

function hasWorkDescription(work: UnzipWork): boolean {
  return !!(
    work.note?.trim() ||
    work.note_zh_tw?.trim() ||
    work.proposal?.trim() ||
    work.proposal_zh_tw?.trim()
  )
}

async function fetchWorkDetail(
  workId: number,
  _apiKey: string,
  signal?: AbortSignal,
): Promise<Pick<UnzipWork, 'note' | 'note_zh_tw' | 'proposal' | 'proposal_zh_tw'> | null> {
  try {
    const json = await fetchUnzipJson<{
      data?: Pick<UnzipWork, 'note' | 'note_zh_tw' | 'proposal' | 'proposal_zh_tw'>
    }>(`/works/${workId}`, {}, signal)
    return json.data ?? null
  } catch {
    return null
  }
}

/** 開啟詳情時重抓單筆，讓作品嵌套的藝術家介紹跟著 CMS 更新 */
export async function fetchWorkById(
  workId: number,
  _apiKey: string,
  signal?: AbortSignal,
): Promise<UnzipWork | null> {
  try {
    const json = await fetchUnzipJson<{ data?: UnzipWork }>(`/works/${workId}`, {}, signal)
    return json.data ?? null
  } catch {
    return null
  }
}

/** 列表 API 可能沒有 note；缺介紹時改抓單筆詳情的 proposal / note */
async function enrichMissingWorkDescriptions(
  works: UnzipWork[],
  apiKey: string,
  signal?: AbortSignal,
): Promise<UnzipWork[]> {
  const pending = works.filter((work) => !hasWorkDescription(work))
  if (!pending.length) return works

  await Promise.all(
    pending.map(async (work) => {
      try {
        const detail = await fetchWorkDetail(work.id, apiKey, signal)
        if (!detail) return
        work.note = work.note?.trim() || detail.note || null
        work.note_zh_tw = work.note_zh_tw?.trim() || detail.note_zh_tw || null
        work.proposal = work.proposal?.trim() || detail.proposal || null
        work.proposal_zh_tw = work.proposal_zh_tw?.trim() || detail.proposal_zh_tw || null
      } catch {
        /* 單筆失敗不影響其餘作品 */
      }
    }),
  )

  return works
}

export async function fetchProjectWorks(
  apiUrl: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<UnzipWork[]> {
  const config = getWorksApiConfig()
  if (config.mode === 'direct' && !apiKey.trim()) {
    throw new Error('Works API key is missing')
  }

  const allWorks: UnzipWork[] = []
  let offset = 0
  let total: number | null = null

  while (true) {
    const json = await fetchUnzipJson<UnzipWorksResponse>(
      worksPathFromConfigUrl(apiUrl || config.url),
      { limit: WORKS_PAGE_SIZE, offset },
      signal,
    )

    if (!json.success || !Array.isArray(json.data)) {
      throw new Error('Works API returned an unexpected payload')
    }

    const batch = json.data.filter((work) => work.state !== 'inactive')
    allWorks.push(...batch)

    if (typeof json.meta?.total === 'number') {
      total = json.meta.total
    }

    if (batch.length === 0) break
    if (total != null && allWorks.length >= total) break
    if (batch.length < WORKS_PAGE_SIZE) break

    offset += batch.length
  }

  return enrichMissingWorkDescriptions(allWorks, apiKey, signal)
}

function pickLocalizedText(lang: Lang, zh?: string | null, en?: string | null): string {
  const zhText = zh?.trim() ?? ''
  const enText = en?.trim() ?? ''
  if (lang === 'zh') return zhText || enText
  return enText || zhText
}

/** 藝術家介紹不跨語言 fallback，避免英文版出現中文姓名／內文 */
function pickLocalizedTextStrict(lang: Lang, zh?: string | null, en?: string | null): string {
  const zhText = zh?.trim() ?? ''
  const enText = en?.trim() ?? ''
  return lang === 'zh' ? zhText : enText
}

function hasCjkScript(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(text)
}

/** 每次整頁載入產生一次，強制藝術家照片重新向 CDN 請求 */
const PAGE_MEDIA_CACHE_BUST = String(Date.now())

export function withMediaCacheBust(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  try {
    const parsed = new URL(trimmed)
    parsed.searchParams.set('_ts', PAGE_MEDIA_CACHE_BUST)
    return parsed.toString()
  } catch {
    const join = trimmed.includes('?') ? '&' : '?'
    return `${trimmed}${join}_ts=${PAGE_MEDIA_CACHE_BUST}`
  }
}

/** 過濾 Odoo 無圖時的 placeholder（/web/image/...、無 attachment） */
function resolveAuthorPhotoUrl(author: UnzipAuthor): string | undefined {
  const media = author.image_1920_media
  const url = media?.url?.trim()
  if (!url) return undefined
  if (media?.attachment_id == null && !media?.storage_code) return undefined
  if (/\/web\/image\//i.test(url) && !/\/cdn\//i.test(url)) return undefined
  if (typeof media?.file_size === 'number' && media.file_size > 0 && media.file_size < 12_000) {
    return undefined
  }
  return withMediaCacheBust(url)
}

function pickAuthorName(lang: Lang, author: UnzipAuthor): string | undefined {
  const zhTw = author.name_zh_tw?.trim() || ''
  const display = author.display_name?.trim() || ''
  const name = author.name?.trim() || ''

  if (lang === 'zh') {
    if (zhTw) return zhTw
    const cjk = [display, name].find((value) => value && hasCjkScript(value))
    return cjk || display || name || undefined
  }

  /** 英文版優先非中日韓姓名，避免 display_name／name 混入中文時顯示錯誤 */
  const latin = [name, display].find((value) => value && !hasCjkScript(value))
  if (latin) return latin
  return name || display || zhTw || undefined
}

function buildGallery(work: UnzipWork): string[] {
  const featured =
    work.featured_photo_media?.url?.trim() ||
    work.image_1920_media?.url?.trim() ||
    ''
  const photoUrls = [...(work.photos ?? [])]
    .sort((a, b) => a.sequence - b.sequence)
    .map((photo) => photo.image_media?.url?.trim())
    .filter((url): url is string => !!url)

  if (photoUrls.length > 0) return photoUrls
  return featured ? [featured] : []
}

function buildSubtitle(lang: Lang, work: UnzipWork, title: string): string | undefined {
  const zh = work.title_zh_tw?.trim() ?? ''
  const en = work.title?.trim() ?? ''
  if (!zh || !en || zh === en) return title
  return lang === 'zh' ? `${zh} ${en}` : `${en} ${zh}`
}

function buildIntro(lang: Lang, work: UnzipWork): string | undefined {
  const names = (work.collectives ?? [])
    .map((collective) => pickAuthorName(lang, collective))
    .filter((name): name is string => !!name)

  if (names.length === 0) return undefined
  return names.join(lang === 'zh' ? '、' : ', ')
}

/** 《虛迷山》：顯示個人照片、僅顯示團隊介紹，不顯示團體照 */
function isTeamBioOnlyWork(work: UnzipWork): boolean {
  const zh = work.title_zh_tw?.trim() ?? ''
  const en = work.title?.trim() ?? ''
  return zh === '虛迷山' || en === 'Mount Ecstasy'
}

function buildArtists(lang: Lang, work: UnzipWork): WorkArtist[] {
  const seen = new Set<string>()
  const artists: WorkArtist[] = []

  const pushAuthors = (
    authors: readonly (UnzipCollective | UnzipContributor)[],
    authorType: WorkArtist['authorType'],
  ) => {
    for (const author of authors) {
      const name = pickAuthorName(lang, author)
      if (!name) continue
      const id = author.id
      if (id == null) continue
      const key = `${authorType}-${id}`
      if (seen.has(key)) continue
      seen.add(key)
      const photoUrl = resolveAuthorPhotoUrl(author)
      artists.push({
        id,
        authorType,
        name,
        ...(photoUrl ? { photoUrl } : {}),
      })
    }
  }

  /**
   * 團隊與個人都列入介紹；照片有才帶上，無照片不顯示頭像。
   * 《虛迷山》不放團體照（僅個人照 + 團隊文字介紹）。
   */
  if (!isTeamBioOnlyWork(work)) {
    pushAuthors(work.collectives ?? [], 'collective')
  }
  pushAuthors(work.contributors ?? [], 'contributor')

  return artists
}

function buildArtistBioFallback(
  lang: Lang,
  work: UnzipWork,
): WorkArtistBioSource | undefined {
  if (isTeamBioOnlyWork(work)) {
    const collective = (work.collectives ?? []).find(
      (author) => author.id != null && !!pickAuthorName(lang, author),
    )
    if (collective?.id == null) return undefined
    const name = pickAuthorName(lang, collective)
    if (!name) return undefined
    return { id: collective.id, authorType: 'collective', name }
  }

  const contributorsHavePhotos = (work.contributors ?? []).some(
    (author) => !!resolveAuthorPhotoUrl(author),
  )
  const collectivesHavePhotos = (work.collectives ?? []).some(
    (author) => !!resolveAuthorPhotoUrl(author),
  )
  /** 團隊已列入藝術家清單時，不再用團體簡介作個人 fallback */
  if (!contributorsHavePhotos || collectivesHavePhotos) return undefined

  const collective = (work.collectives ?? []).find(
    (author) => author.id != null && !!pickAuthorName(lang, author),
  )
  if (collective?.id == null) return undefined

  const name = pickAuthorName(lang, collective)
  if (!name) return undefined
  return { id: collective.id, authorType: 'collective', name }
}

function stripHtmlText(html: string): string {
  const trimmed = html.trim()
  if (!trimmed) return ''
  const withLineBreaks = trimmed
    .replace(/<br\s*\/?>/gi, '\n')
    /** 標題 </p> 後緊接正文時不要斷成新段落（如「莊禾</p>作品介紹…」） */
    .replace(/<\/p>(?=\s*[^<\s])/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')

  if (typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.innerHTML = withLineBreaks
    const decoded = el.textContent ?? ''
    return decoded.replace(/\n{3,}/g, '\n\n').trim()
  }

  return withLineBreaks
    .replace(/<[^>]+>/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

type UnzipCollectiveDetail = {
  description?: string | null
  description_zh_tw?: string | null
}

type UnzipContributorDetail = {
  introduction?: string | null
  introduction_zh_tw?: string | null
  biography?: string | null
  biography_zh_tw?: string | null
}

export function artistBioCacheKey(artist: Pick<WorkArtist, 'id' | 'authorType'>): string {
  return `${artist.authorType}-${artist.id}`
}

/** 從作品列表 API 已帶的 collective / contributor 欄位擷取介紹（免額外請求） */
export function extractArtistBiosFromWork(
  work: UnzipWork,
  lang: Lang,
): Record<string, string> {
  const bios: Record<string, string> = {}

  const pushAuthor = (
    author: UnzipCollective | UnzipContributor,
    authorType: WorkArtist['authorType'],
  ) => {
    if (author.id == null) return
    const bio = stripHtmlText(pickAuthorBioText(lang, author, authorType))
    if (!bio) return
    bios[artistBioCacheKey({ id: author.id, authorType })] = bio
  }

  for (const collective of work.collectives ?? []) {
    pushAuthor(collective, 'collective')
  }
  for (const contributor of work.contributors ?? []) {
    pushAuthor(contributor, 'contributor')
  }

  return bios
}

function pickAuthorBioText(
  lang: Lang,
  author: UnzipAuthor,
  authorType: WorkArtist['authorType'],
): string {
  if (authorType === 'contributor') {
    const introduction = pickLocalizedTextStrict(
      lang,
      author.introduction_zh_tw,
      author.introduction,
    )
    const biography = pickLocalizedTextStrict(lang, author.biography_zh_tw, author.biography)
    // 兩欄都有時取較長者，避免舊短介紹擋下已更新的完整 biography
    if (introduction && biography) {
      return biography.length >= introduction.length ? biography : introduction
    }
    return introduction || biography
  }
  return pickLocalizedTextStrict(lang, author.description_zh_tw, author.description)
}

async function fetchArtistBioFromWorkDetail(
  workId: number,
  artist: Pick<WorkArtist, 'id' | 'authorType'>,
  lang: Lang,
  signal?: AbortSignal,
): Promise<string> {
  const json = await fetchUnzipJson<{ data?: UnzipWork }>(`/works/${workId}`, {}, signal)
  const work = json.data
  if (!work) return ''

  const authors =
    artist.authorType === 'contributor' ? work.contributors ?? [] : work.collectives ?? []
  const match = authors.find((author) => author.id === artist.id)
  if (!match) return ''

  return pickAuthorBioText(lang, match, artist.authorType)
}

export async function fetchArtistBio(
  artist: Pick<WorkArtist, 'id' | 'authorType'>,
  lang: Lang,
  _apiKey: string,
  signal?: AbortSignal,
  workId?: number,
  /** 已重抓的作品嵌套介紹，避免每名藝術家再打 /works/:id */
  fallbackBio?: string,
): Promise<string> {
  let authorRaw = ''
  const path =
    artist.authorType === 'collective'
      ? `/collectives/${artist.id}`
      : `/contributors/${artist.id}`

  try {
    const json = await fetchUnzipJson<{ data?: UnzipCollectiveDetail & UnzipContributorDetail }>(
      path,
      {},
      signal,
    )
    if (json.data) {
      authorRaw = pickAuthorBioText(lang, json.data, artist.authorType)
    }
  } catch {
    /* 部分 contributor 為 draft，/contributors/:id 會 404 */
  }

  let workRaw = fallbackBio?.trim() || ''
  if (!workRaw && !authorRaw.trim() && workId != null) {
    try {
      workRaw = await fetchArtistBioFromWorkDetail(workId, artist, lang, signal)
    } catch {
      /* 單筆失敗不影響其餘藝術家 */
    }
  }

  const author = authorRaw.trim()
  const nested = workRaw.trim()
  // 兩邊都有時取較長者，避免舊文擋下剛更新的完整介紹
  const raw =
    author && nested
      ? nested.length > author.length
        ? nested
        : author
      : author || nested
  return stripHtmlText(raw)
}

export function mapUnzipWorkToCard(work: UnzipWork, lang: Lang): WorkCard {
  const title = pickLocalizedText(lang, work.title_zh_tw, work.title)
  const body = stripHtmlText(
    pickLocalizedText(lang, work.note_zh_tw, work.note) ||
      pickLocalizedText(lang, work.proposal_zh_tw, work.proposal),
  )
  const gallery = buildGallery(work)
  const image = gallery[0] ?? ''
  const artists = buildArtists(lang, work)
  const artistBioFallback = buildArtistBioFallback(lang, work)
  const teamBioOnly = isTeamBioOnlyWork(work)

  return {
    id: work.id,
    title,
    image,
    gallery,
    intro: buildIntro(lang, work),
    subtitle: buildSubtitle(lang, work, title),
    body,
    ...(artists.length > 0 ? { artists } : {}),
    ...(artistBioFallback ? { artistBioFallback } : {}),
    ...(teamBioOnly ? { teamBioOnly: true } : {}),
  }
}
