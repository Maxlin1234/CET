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
  creator?: string
  duration?: string
  region?: string
  /** 點開後才顯示的子節目（如「節目一」） */
  items?: readonly ScheduleProgram[]
}

export type ScheduleCopy = {
  title: string
  note: string
  emptyDay: string
  weekdays: readonly string[]
  /** 有節目的日期（YYYY-MM-DD），用於日曆標記 */
  eventDates: readonly string[]
  slots: readonly ScheduleSlot[]
}
