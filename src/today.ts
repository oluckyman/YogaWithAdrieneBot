import _ from 'lodash'
import { timeFormat } from 'd3-time-format'
import { Extra } from 'telegraf'
import { promises as fs } from 'fs'
import { sql } from 'slonik'
import path from 'path'
import writtenNumber from 'written-number'
import { toEmoji } from 'number-to-emoji'
import { google } from 'googleapis'
import { ExtraPhoto } from 'telegraf/typings/telegram-types.d'
import type { Bot, BotContext } from './models/bot'
import { MENU, getDaysInMonth, pauseForA, isAdmin, oneOf } from './utils'
import getNowWatching, { nowWatchingMessage } from './nowWatching'

export interface Video {
  id: string
  year: number
  month: number
  day: number
  // duration: number // is not used anywhere
}

interface FWFGVideo {
  url: string
  thumbnailUrl: string
  title: string
  year: number
  month: number
  day: number
}

const youtubeApiKey = process.env.YOUTUBE_API_KEY
const channelId = 'UCFKE7WVJfvaHW5q283SxchA'

export default function today(bot: Bot): void {
  bot.hears(MENU.today, replyToday)
  bot.command('/today', replyToday)
  bot.action(/cb:today(?:_(?<day>\d+)_(?<part>\d+))?/, (ctx) => {
    ctx.state.day = +(ctx.match?.groups?.day || 0)
    ctx.answerCbQuery('Getting the video for you…')
    return replyToday(ctx)
  })

  // Understand when people ask for today's yoga by typing in the chat
  const todayMessage = /^\s*today/iu
  bot.hears(todayMessage, replyToday)

  // Understand number as a day in the month
  const dayNumberMessage = /(^\d+)|(^day \d+)/i
  bot.hears(dayNumberMessage, (ctx) => {
    const daysInMonth = getDaysInMonth(ctx.now) - ctx.state.journeyDayShift
    const desiredDay = +(ctx.update.message?.text?.match(/.*?(?<day>\d+)/)?.groups?.day || 0)
    if (desiredDay && desiredDay <= daysInMonth) {
      ctx.state.day = desiredDay
      return replyToday(ctx)
    }
    const msg = `Type a number from \`1\` to \`${daysInMonth}\` to get a day from the */calendar*`
    return ctx.replyWithMarkdown(msg, Extra.notifications(false) as any).then(() => {
      ctx.state.success = true
    })
  })
}

async function replyToday(ctx: BotContext) {
  // I use it in announcement middleware to react only on today commands
  ctx.state.command = 'today'

  const year = timeFormat('%Y')(ctx.now)
  const month = timeFormat('%m')(ctx.now)
  const day = ctx.state.day || ctx.now.getUTCDate() - ctx.state.journeyDayShift
  const part = _.get(ctx, 'match.groups.part')
  console.info('replyToday', { month, day, part })

  const videos = await getVideosFromPlaylist(ctx, year, month, day)
  const isFWFGDay = _.some(videos, isFWFG)

  if (videos.filter((v) => !isFWFG(v)).length === 0) {
    // Check the latest video on the channel
    console.info('no videos in JSON, checkig in YouTube channel')
    const requestedDay = new Date(Date.UTC(+year, +month - 1, day + ctx.state.journeyDayShift))
    const newVideo = await getVideoPublishedAt(requestedDay)
    if (newVideo) {
      console.info('got one', newVideo)
      videos.push(newVideo)
    } else {
      const message =
        `Here should be a link to the video, but there isn’t 🤷\n` +
        `Check out the */calendar*. If the video is in the playlist it will appear here soon.`
      return ctx.replyWithMarkdown(message).then(() => {
        ctx.state.success = true
      })
    }

    /* Keep it for the next year */
    // // Load current journey videos from YouTube channel
    // console.info("getting the today's video in YouTube channel")
    // const currentJourneyVideos = await getLiveJourneyVideos(ctx.now)
    // const year = ctx.now.getFullYear()
    // const todaysVideo = currentJourneyVideos.find((v) => v.day === day && v.month === +month && v.year === year)
    // console.info('got', { todaysVideo })
    // if (todaysVideo) {
    //   videos.push(todaysVideo)
    // } else {
    //   const message =
    //     `Here should be a link to the video, but there isn’t 🤷\n` +
    //     `Check out the */calendar*. If the video is in the playlist it will appear here soon.`
    //   return ctx.replyWithMarkdown(message).then(() => {
    //     ctx.state.success = true
    //   })
    // }
  }

  if (!part && videos.length > 1) {
    // TODO: refactor types to handle title, duration and url optional params
    // When there are many videos, we are sure they go from JSON, so extend the Video type
    const videosFromJson = videos as Array<Video & { title: string; duration: number }>
    // Ask which one to show now
    let videosList
    let message
    let buttons: any
    if (isFWFGDay) {
      videosList = videosFromJson
        .map((v) => `${isFWFG(v) ? '🖤 <b>FWFG</b> membership\n' : '❤️ <b>YouTube</b> alternative\n'}${v.title}`)
        .join('\n')
      message = videosList
      buttons = (m: any) =>
        videosFromJson.map((v, i) => m.callbackButton(isFWFG(v) ? '🖤 FWFG' : '❤️ YouTube', `cb:today_${day}_${i}`))
    } else {
      videosList = videosFromJson.map((v, i) => `${getPart(i)} ${v.title}`).join('\n')
      message = `${_.capitalize(writtenNumber(videosFromJson.length))} videos today\n${videosList}`
      buttons = (m: any) =>
        videosFromJson.map((v, i) => m.callbackButton(`${getPart(i)} ${v.duration} min.`, `cb:today_${day}_${i}`))
    }
    console.info(message)
    return ctx
      .replyWithHTML(
        message,
        Extra.notifications(false).markup((m: any) => m.inlineKeyboard(buttons(m)))
      )
      .then(() => {
        ctx.state.success = true
      })
  }
  // Send the video and pre-video message
  const video = _.filter(videos, (v, i) => !part || i === +part)[0]
  const nowWatching = isFWFG(video) ? 0 : await getNowWatching(ctx.firestore, video as Video)
  let message
  if (nowWatching) {
    message = nowWatchingMessage(nowWatching)
  } else {
    message = preVideoMessage()
  }
  try {
    await Promise.all([
      ctx.replyWithMarkdown(message, Extra.notifications(false) as any),
      pauseForA(2), // give some time to read the message
    ])
    // show how the message looks in botlog
    if (!isAdmin(ctx)) {
      // eslint-disable-next-line require-atomic-updates
      ctx.state.logQueue = [...(ctx.state.logQueue || []), message]
    }
    console.info(message)
  } catch (e) {
    console.error(`Error with pre-video message "${message}"`, e)
    await reportError({
      ctx,
      where: '/today: pre-video message',
      error: e,
      silent: true,
    })
  }

  try {
    message = 'oops 🐩' // so it can be used in catch (e) block
    let partSymbol
    if (isFWFGDay) {
      partSymbol = isFWFG(video) ? '🖤' : '❤️'
    } else {
      partSymbol = part ? getPart(+part) : ''
    }
    if (isFWFG(video)) {
      const fwfgVideo = video as FWFGVideo
      const utm = new URLSearchParams({
        utm_source: 'YogaWithAdrieneBot',
        utm_medium: 'telegram',
        utm_campaign: 'calendar',
      }).toString()
      const videoUrl = `${fwfgVideo.url}?${utm}`
      message = `${toEmoji(day)}${partSymbol} ${videoUrl}`
      console.info(message)
      return ctx
        .replyWithPhoto(
          `${fwfgVideo.thumbnailUrl}?rnd=${Math.random()}`,
          Extra.caption(`${toEmoji(day)}${partSymbol} <b><a href="${videoUrl}">${fwfgVideo.title}</a></b>`)
            .notifications(false)
            .HTML()
            .markup(menuKeboard) as unknown as ExtraPhoto
        )
        .then(() => {
          ctx.state.success = true
        })
    }
    const ytVideo = video as Video
    const videoUrl = shortUrl(ytVideo.id)
    message = `${toEmoji(day)}${partSymbol} ${videoUrl}`
    console.info(message)
    return ctx.replyWithHTML(message, Extra.notifications(false).markup(menuKeboard)).then(() => {
      ctx.state.success = true
    })
  } catch (e) {
    console.error(`Error with video link: ${message}`, e)
    return reportError({ ctx, where: '/today: the video link', error: e })
  }
}

async function getVideoPublishedAt(date: Date): Promise<Video | undefined> {
  const publishedAfter = date.toISOString().substring(0, 10)
  const publishedBefore = (() => {
    const tom = new Date(date)
    tom.setDate(date.getDate() + 1)
    return tom
  })()
    .toISOString()
    .substring(0, 10)
  const youtube = google.youtube({ version: 'v3', auth: youtubeApiKey })
  console.info(`Now: ${date.toISOString()}`)
  console.info(`Looking what's published between ${publishedAfter}T00:00:00Z and ${publishedBefore}T00:00:00Z`)
  const latestVideos = await youtube.search
    .list({
      channelId,
      part: 'snippet',
      maxResults: 1,
      order: 'date',
      publishedAfter: `${publishedAfter}T00:00:00Z`,
      publishedBefore: `${publishedBefore}T00:00:00Z`,
    })
    .then(({ data }) => data.items ?? [])
    .then((items) =>
      items.map((i) => ({
        id: i.id?.videoId as string,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        day: date.getDate(),
        title: i.snippet?.title,
      }))
    )
  return latestVideos[0]
}

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

  if (playlistVideos.length > 0) {
    console.info('Got videos from Database', playlistVideos)
    return playlistVideos
  }

  // Fallback to JSON
  //
  const jsonVideos = await fs
    .readFile(path.join(process.cwd(), 'calendars', `${year}-${month}.json`), 'utf8')
    .then((txt) => JSON.parse(txt))
    .then((json) =>
      _.filter(json, { day })
        // filter out dummy entries without id and url
        .filter((v) => (v.id || v.url)?.length > 0)
        .map((v) => ({
          ...v,
          month,
        }))
    )
    .catch((e) => {
      console.error('Failed to get videos from JSON', e)
      return []
    })
  return jsonVideos
}

// export async function getLiveJourneyVideos(now: Date): Promise<Video[]> {
//   const year = now.getFullYear()
//   const month = now.getMonth() + 1

//   const youtube = google.youtube({ version: 'v3', auth: youtubeApiKey })
//   const liveJourneyVideos = await youtube.search
//     .list({
//       channelId,
//       part: 'snippet',
//       maxResults: 31,
//       order: 'date',
//       publishedAfter: '2021-01-02T00:00:00Z',
//     })
//     .then(({ data }) => data.items ?? [])
//     .then((items) =>
//       items
//         .map((i) => ({
//           id: i.id?.videoId,
//           month,
//           year,
//           day: i.snippet?.title?.replace(/Day (\d+).*/, '$1'),
//           title: i.snippet?.title,
//         }))
//         .filter((i) => i.id)
//         .filter((i) => i.day)
//         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//         .map((i) => ({ ...i, id: i.id!, day: +i.day! }))
//     )

//   return liveJourneyVideos
// }

// Consider videos without id as FWFG videos
function isFWFG(v: Video | FWFGVideo) {
  return !('id' in v)
}

// Returns a part symbol
function getPart(i: number) {
  const partSymbols = ['🅰️', '🅱️', '❤️', '🧡', '💛', '💚', '💙', '💜']
  return i < partSymbols.length ? partSymbols[i] : `*[${i + 1}]*`
}

function preVideoMessage() {
  const messages = [
    ['💬 Spend time _practicing_ yoga rather than _scrolling it_'],
    ['💬 Give time to _YourSelf_ rather than to _YouTube_'],
    ['💬 _Let us postpone nothing. Let us balance life’s account every day_'],
    ['😌 _Find what feels good_'],
    ['🐍 _Long healthy neck_'],
    ['🙃 _A downward dog a day, keeps the doctor away_'],
    ['✅ _Checking in is the hardest part_'],
    ['🧘‍♀️ _Sukhasana_ – easy pose'],
    [...'🐌🐢'].map((e) => `${e} _One yoga at a time_`),
    [...'❤️'].map((e) => `${e} _One day at a time_`),
    [...'🐌🐢'].map((e) => `${e} _Little goes a long way_`),
  ]
  return oneOf(messages)
}

function shortUrl(id: string) {
  return `youtu.be/${id}`
}

function menuKeboard(m: any): any {
  return m.resize().keyboard([MENU.today, MENU.calendar, MENU.help])
}
