export type WorkArtistAuthorType = 'collective' | 'contributor'

export type WorkArtist = {
  id: number
  authorType: WorkArtistAuthorType
  name: string
  /** 無照片時不顯示頭像區塊 */
  photoUrl?: string
  bio?: string
}

export type WorkArtistBioSource = {
  id: number
  authorType: WorkArtistAuthorType
  name: string
}

export type WorkCard = {
  id?: number
  title: string
  image: string
  gallery?: readonly string[]
  intro?: string
  subtitle?: string
  body: string
  artists?: readonly WorkArtist[]
  /** 個別藝術家無簡介時使用的團體簡介來源 */
  artistBioFallback?: WorkArtistBioSource
  /** 藝術家分頁：顯示個人照片，但僅顯示團隊文字介紹（如《虛迷山》） */
  teamBioOnly?: boolean
}
