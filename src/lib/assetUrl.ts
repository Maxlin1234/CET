/** public 資產 URL（站點根目錄） */
export function assetUrl(path: string): string {
  return `/${path.replace(/^\//, '')}`
}
