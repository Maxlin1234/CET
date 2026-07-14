import type { Lang } from '@/i18n'
import type { WorkArtist, WorkCard } from '@/types/workCard'

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
  featured_photo_media?: UnzipMedia | null
  image_1920_media?: UnzipMedia | null
  photos?: UnzipPhoto[] | null
  collectives?: UnzipCollective[] | null
  contributors?: UnzipContributor[] | null
}

type UnzipWorksResponse = {
  success?: boolean
  data?: UnzipWork[]
}

const DEFAULT_WORKS_URL = 'https://unzip.clab.org.tw/api/v1/projects/21/works'

export async function fetchProjectWorks(
  apiUrl: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<UnzipWork[]> {
  const res = await fetch(apiUrl, {
    signal,
    headers: {
      Authorization: `Api-Key ${apiKey}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Works API failed: ${res.status} ${res.statusText}`)
  }

  const json = (await res.json()) as UnzipWorksResponse
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error('Works API returned an unexpected payload')
  }

  return json.data.filter((work) => work.state !== 'inactive')
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
  const authors: UnzipAuthor[] = hasContributorPhotos ? contributors : collectives
  const seen = new Set<string>()
  const artists: WorkArtist[] = []

  for (const author of authors) {
    const photoUrl = author.image_1920_media?.url?.trim()
    if (!photoUrl) continue
    const name = pickAuthorName(lang, author)
    if (!name) continue
    const key = `${name}|${photoUrl}`
    if (seen.has(key)) continue
    seen.add(key)
    artists.push({ name, photoUrl })
  }

  return artists
}

export function mapUnzipWorkToCard(work: UnzipWork, lang: Lang): WorkCard {
  const title = pickLocalizedText(lang, work.title_zh_tw, work.title)
  const body = pickLocalizedText(lang, work.note_zh_tw, work.note)
  const gallery = buildGallery(work)
  const image = gallery[0] ?? ''
  const artists = buildArtists(lang, work)

  return {
    title,
    image,
    gallery,
    intro: buildIntro(lang, work),
    subtitle: buildSubtitle(lang, work, title),
    body,
    ...(artists.length > 0 ? { artists } : {}),
  }
}

export function getWorksApiConfig(): { url: string; key: string } {
  return {
    url: String(import.meta.env.VITE_UNZIP_WORKS_API_URL ?? DEFAULT_WORKS_URL).trim(),
    key: String(import.meta.env.VITE_UNZIP_API_KEY ?? '').trim(),
  }
}
