export interface Video {
  id: string
  year: number
  month: number
  day: number
  // duration: number // is not used anywhere
}

export interface FWFGVideo {
  url: string
  thumbnailUrl: string
  title: string
  year: number
  month: number
  day: number
}
