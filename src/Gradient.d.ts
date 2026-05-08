/** 與 `Gradient.js` 並存，供 vue-tsc／路徑別名 `@/Gradient.js` 對應型別 */
export class Gradient {
  constructor(...args: unknown[]);
  timeScale: number;
  el?: HTMLElement | undefined
  disconnect(): void
  initGradient(selector: string): Gradient
  connect(): Promise<void>
  pause(): void
  play(): void
}
