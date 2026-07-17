/** 單元強調色：一橘、二藍、三紫、四黃 */
export type ScheduleAccent = 'orange' | 'blue' | 'purple' | 'yellow'

export type ScheduleProgram = {
  name: string
  creator?: string
  duration?: string
  region?: string
}

export type ScheduleSlot = {
  /** ISO 日期 YYYY-MM-DD */
  date: string
  /** 放映時段（選填） */
  time?: string
  name: string
  /** 展開群組後顯示於頂部的單元簡介 */
  groupIntro?: string
  /** 單元強調色（單元一橘／二藍／三紫） */
  accent?: ScheduleAccent
  creator?: string
  duration?: string
  region?: string
  /** 點開後才顯示的子節目（如「單元一」） */
  items?: readonly ScheduleProgram[]
}

export type ScheduleCopy = {
  title: string
  /** 標題下方入場資訊（每行一句） */
  infoLines?: readonly string[]
  emptyDay: string
  weekdays: readonly string[]
  /** 有節目的日期（YYYY-MM-DD），用於日曆標記 */
  eventDates: readonly string[]
  slots: readonly ScheduleSlot[]
}
