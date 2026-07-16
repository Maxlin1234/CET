export type WorkArtistAuthorType = 'collective' | 'contributor'

export type WorkArtist = {
  id: number
  authorType: WorkArtistAuthorType
  name: string
  photoUrl: string
  bio?: string
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
}
