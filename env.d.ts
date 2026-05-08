/// <reference types="vite/client" />
/// <reference types="google.maps" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  readonly VITE_GOOGLE_MAP_A_LAT?: string
  readonly VITE_GOOGLE_MAP_A_LNG?: string
  readonly VITE_GOOGLE_MAP_A_ZOOM?: string
}

export {}
