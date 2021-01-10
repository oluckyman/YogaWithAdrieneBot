import { google } from 'googleapis'

export interface Video {
  id: string
  year: number
  month: number
  day: number
  // duration: number // is not used anywhere
}

export async function getLiveJourneyVideos(now: Date): Promise<Video[]> {
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const youtubeApiKey = process.env.YOUTUBE_API_KEY
  const channelId = 'UCFKE7WVJfvaHW5q283SxchA'
  const youtube = google.youtube({ version: 'v3', auth: youtubeApiKey })
  const liveJourneyVideos = await youtube.search
    .list({
      channelId,
      part: 'snippet',
      maxResults: 31,
      order: 'date',
      publishedAfter: '2021-01-02T00:00:00Z',
    })
    .then(({ data }) => data.items ?? [])
    .then((items) =>
      items
        .map((i) => ({
          id: i.id?.videoId,
          month,
          year,
          day: i.snippet?.title?.replace(/Day (\d+).*/, '$1'),
          title: i.snippet?.title,
        }))
        .filter((i) => i.id)
        .filter((i) => i.day)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .map((i) => ({ ...i, id: i.id!, day: +i.day! }))
    )

  return liveJourneyVideos
}
