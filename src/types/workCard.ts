export type WorkArtist = {
  name: string
  photoUrl: string
}

export type WorkCard = {
  title: string
  image: string
  gallery?: readonly string[]
  intro?: string
  subtitle?: string
  body: string
  artists?: readonly WorkArtist[]
}
