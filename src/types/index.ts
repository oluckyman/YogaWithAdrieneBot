export interface Video {
  id: string
  year: number
  month: number
  day: number
  duration?: number // used in long practice, but not in reply today
}

export interface FWFGVideo {
  url: string
  thumbnailUrl: string
  title: string
  year: number
  month: number
  day: number
  duration: number
}
