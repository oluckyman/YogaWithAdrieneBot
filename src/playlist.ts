import { sql } from 'slonik'
import type { BotContext } from './models/bot'
import type { FWFGVideo, Video } from './types'

type PlaylistRow = {
  year: number
  month: number
  day: number
  video_id: string
  title: string
  duration: number
  fwfg_url: string
  fwfg_thumbnail_url: string
}

async function getVideosFromPlaylist(
  ctx: BotContext,
  year: string,
  month: string,
  day: number
): Promise<(Video | FWFGVideo)[]> {
  const playlistVideos: (Video | FWFGVideo)[] = await ctx.postgres
    .query(sql.unsafe`SELECT * from playlist where year = ${+year} and month = ${+month} and day = ${day}`)
    .then((res) => res.rows)
    .then((rows: PlaylistRow[]) =>
      rows.map((row) => ({
        // convert playlist row to Video or FWFGVideo
        ...(row.fwfg_url
          ? {
              url: row.fwfg_url,
              thumbnailUrl: row.fwfg_thumbnail_url,
            }
          : {
              id: row.video_id,
            }),
        title: row.title,
        duration: row.duration,
        year: row.year,
        month: row.month,
        day: row.day,
      }))
    )
    .catch((e) => {
      console.error('Failed to get videos from Database', e)
      return []
    })
  console.info('Got videos from Database', playlistVideos)
  return playlistVideos
}

// eslint-disable-next-line import/prefer-default-export
export { getVideosFromPlaylist }
