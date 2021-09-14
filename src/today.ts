import _ from 'lodash'
import { timeFormat } from 'd3-time-format'
import { Extra } from 'telegraf'
import { promises as fs } from 'fs'
import writtenNumber from 'written-number'
import { toEmoji } from 'number-to-emoji'
import { google } from 'googleapis'
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
const youtubeApiKey = process.env.YOUTUBE_API_KEY
const channelId = 'UCFKE7WVJfvaHW5q283SxchA'

export default (bot: Bot): void => {
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
  const dayNumberMessage = /^\d+/
  bot.hears(dayNumberMessage, (ctx) => {
    const daysInMonth = getDaysInMonth(ctx.now) - ctx.state.journeyDayShift
    const desiredDay = +(ctx.update.message?.text || 0)
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

  const month = timeFormat('%m')(ctx.now)
  const day = ctx.state.day || ctx.now.getDate() - ctx.state.journeyDayShift
  const part = _.get(ctx, 'match.groups.part')
  // const [month, day] = ['05', 22]
  console.info('replyToday', { month, day, part })

  const videos: Video[] = await fs
    .readFile(`calendars/${month}.json`, 'utf8')
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
      console.error('Failed to get videos', e)
      return []
    })
  const isFWFGDay = _.some(videos, isFWFG)

  if (videos.length === 0) {
    // Check the latest video on the channel
    console.info('no videos in JSON, checkig in YouTube channel')
    const newVideo = await getVideoPublishedAt(ctx.now)
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
        .map((v) => `${isFWFG(v) ? '🖤 *FWFG* membership\n' : '❤️ *YouTube* alternative\n'}${v.title}`)
        .join('\n')
      message = `FWFG video today\n${videosList}`
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
      .replyWithMarkdown(
        message,
        Extra.notifications(false).markup((m: any) => m.inlineKeyboard(buttons(m)))
      )
      .then(() => {
        ctx.state.success = true
      })
  }
  // Send the video and pre-video message
  const video = _.filter(videos, (v, i) => !part || i === +part)[0]
  const nowWatching = isFWFG(video) ? 0 : await getNowWatching(ctx.firestore, video)
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
    const utm = new URLSearchParams({
      utm_source: 'YogaWithAdrieneBot',
      utm_medium: 'telegram',
      utm_campaign: 'calendar'
    }).toString()
    const videoUrl = (v: Video & { url?: string }) => (v.url ? `<b><a href="${v.url}?${utm}">Watch on FWFG</a></b>` : shortUrl(v.id))
    message = `${toEmoji(day)}${partSymbol} ${videoUrl(video)}`
    console.info(message)
    return ctx.replyWithHTML(message, Extra.notifications(false).markup(menuKeboard)).then(() => {
      ctx.state.success = true
    })
  } catch (e) {
    console.error(`Error with video link: ${message}`, e)
    return reportError({ ctx, where: '/today: the video link', error: e })
  }
}

async function getVideoPublishedAt(now: Date): Promise<Video | undefined> {
  const publishedAfter = now.toISOString().substr(0, 10)
  const publishedBefore = (() => {
    const tom = new Date(now)
    tom.setDate(now.getDate() + 1)
    return tom
  })()
    .toISOString()
    .substr(0, 10)
  const youtube = google.youtube({ version: 'v3', auth: youtubeApiKey })
  // console.log(`Now is ${now.toISOString()}`)
  // console.log(`Looking what's published between ${publishedAfter}T00:00:00Z and ${publishedBefore}T00:00:00Z`)
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
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        day: now.getDate(),
        title: i.snippet?.title,
      }))
    )
  return latestVideos[0]
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
function isFWFG(v: { id: string }) {
  return !v.id
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
