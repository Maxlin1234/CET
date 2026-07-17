import type { Lang } from '@/i18n'
import type { WorkArtist, WorkArtistBioSource, WorkCard } from '@/types/workCard'

type UnzipMedia = {
  url?: string
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

  /** 本地有 key 時直連；正式站無 key 時改走 Netlify Function 代理 */
  if (key) {
    return { mode: 'direct', url, key }
  }
  if (import.meta.env.PROD) {
    /** url 仍保留完整 works endpoint，供代理解析 path */
    return { mode: 'proxy', url, key: '' }
  }
  return { mode: 'direct', url, key: '' }
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

function buildUnzipRequest(
  path: string,
  query: Record<string, string | number> = {},
): { url: string; headers: Record<string, string> } {
  const config = getWorksApiConfig()
  if (config.mode === 'proxy') {
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

  const url = new URL(`https://unzip.clab.org.tw/api/v1${path}`)
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value))
  }
  return {
    url: url.toString(),
    headers: {
      Authorization: `Api-Key ${config.key}`,
      Accept: 'application/json',
    },
  }
}

function buildPaginatedWorksUrl(apiUrl: string, offset: number, limit = WORKS_PAGE_SIZE): {
  url: string
  headers: Record<string, string>
} {
  const config = getWorksApiConfig()
  if (config.mode === 'proxy') {
    return buildUnzipRequest(worksPathFromConfigUrl(apiUrl), { limit, offset })
  }

  const url = new URL(apiUrl)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('offset', String(offset))
  return {
    url: url.toString(),
    headers: {
      Authorization: `Api-Key ${config.key}`,
      Accept: 'application/json',
    },
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
  const { url, headers } = buildUnzipRequest(`/works/${workId}`)
  const res = await fetch(url, { signal, headers })

  if (!res.ok) return null

  const json = (await res.json()) as {
    data?: Pick<UnzipWork, 'note' | 'note_zh_tw' | 'proposal' | 'proposal_zh_tw'>
  }
  return json.data ?? null
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
    const { url, headers } = buildPaginatedWorksUrl(apiUrl || config.url, offset)
    const res = await fetch(url, { signal, headers })

    if (!res.ok) {
      throw new Error(`Works API failed: ${res.status} ${res.statusText}`)
    }

    const json = (await res.json()) as UnzipWorksResponse
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

function pickAuthorName(lang: Lang, author: UnzipAuthor): string | undefined {
  const name =
    lang === 'zh'
      ? author.name_zh_tw?.trim() || author.display_name?.trim() || author.name?.trim()
      : author.display_name?.trim() || author.name?.trim() || author.name_zh_tw?.trim()
  return name || undefined
}

function buildArtists(lang: Lang, work: UnzipWork): WorkArtist[] {
  const contributors = work.contributors ?? []
  const collectives = work.collectives ?? []
  /** 有個別創作者照片時優先顯示個人，避免團體與個人重複 */
  const hasContributorPhotos = contributors.some((c) => !!c.image_1920_media?.url?.trim())
  const authorType: WorkArtist['authorType'] = hasContributorPhotos ? 'contributor' : 'collective'
  const authors = hasContributorPhotos ? contributors : collectives
  const seen = new Set<string>()
  const artists: WorkArtist[] = []

  for (const author of authors) {
    const photoUrl = author.image_1920_media?.url?.trim()
    if (!photoUrl) continue
    const name = pickAuthorName(lang, author)
    if (!name) continue
    const id = author.id
    if (id == null) continue
    const key = `${authorType}-${id}`
    if (seen.has(key)) continue
    seen.add(key)
    artists.push({ id, authorType, name, photoUrl })
  }

  return artists
}

function buildArtistBioFallback(
  lang: Lang,
  work: UnzipWork,
): WorkArtistBioSource | undefined {
  const contributorsHavePhotos = (work.contributors ?? []).some(
    (author) => !!author.image_1920_media?.url?.trim(),
  )
  if (!contributorsHavePhotos) return undefined

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

export async function fetchArtistBio(
  artist: Pick<WorkArtist, 'id' | 'authorType'>,
  lang: Lang,
  _apiKey: string,
  signal?: AbortSignal,
): Promise<string> {
  const path =
    artist.authorType === 'collective'
      ? `/collectives/${artist.id}`
      : `/contributors/${artist.id}`
  const { url, headers } = buildUnzipRequest(path)

  const res = await fetch(url, { signal, headers })

  if (!res.ok) {
    throw new Error(`Artist API failed: ${res.status} ${res.statusText}`)
  }

  const json = (await res.json()) as { data?: UnzipCollectiveDetail & UnzipContributorDetail }
  const data = json.data
  if (!data) return ''

  let raw = ''
  if (artist.authorType === 'contributor') {
    raw =
      pickLocalizedText(lang, data.introduction_zh_tw, data.introduction) ||
      pickLocalizedText(lang, data.biography_zh_tw, data.biography)
  } else {
    raw = pickLocalizedText(lang, data.description_zh_tw, data.description)
  }

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
  }
}
