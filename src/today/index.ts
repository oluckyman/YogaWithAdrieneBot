import _ from 'lodash'
import { timeFormat } from 'd3-time-format'
import { Extra } from 'telegraf'
import writtenNumber from 'written-number'
import { toEmoji } from 'number-to-emoji'
import { google } from 'googleapis'
import { ExtraPhoto } from 'telegraf/typings/telegram-types.d'
import { MENU, getDaysInMonth, pauseForA, isAdmin, oneOf, commandHandler } from '../utils'
import getNowWatching, { nowWatchingMessage } from './nowWatching'
import { getVideosFromPlaylist } from './playlist'
import type { Bot, BotContext } from '../models/bot'
import type { FWFGVideo, Video } from '../types'

const youtubeApiKey = process.env.YOUTUBE_API_KEY
const channelId = 'UCFKE7WVJfvaHW5q283SxchA'

export default function today(bot: Bot): void {
  const command = commandHandler('today')

  // Today command
  //
  bot.hears(MENU.today, command(replyToday))
  bot.command('/today', command(replyToday))

  // Today's part
  //
  bot.action(
    /cb:today(?:_(?<day>\d+)_(?<part>\d+))?/,
    command((ctx) => {
      ctx.state.day = +(ctx.match?.groups?.day || 0)
      ctx.answerCbQuery('Getting the video for you…')
      return replyToday(ctx)
    })
  )

  // Understand when people ask for today's yoga by typing in the chat
  //
  const todayMessage = /^\s*today/iu
  bot.hears(todayMessage, command(replyToday))

  // Understand number as a day in the month
  //
  const dayNumberMessage = /(^\d+)|(^day \d+)/i
  bot.hears(
    dayNumberMessage,
    command((ctx) => {
      const daysInMonth = getDaysInMonth(ctx.now) - ctx.state.journeyDayShift
      const desiredDay = +(ctx.update.message?.text?.match(/.*?(?<day>\d+)/)?.groups?.day || 0)
      if (desiredDay && desiredDay <= daysInMonth) {
        ctx.state.day = desiredDay
        return replyToday(ctx)
      }
      const msg = `Type a number from \`1\` to \`${daysInMonth}\` to get a day from the */calendar*`
      return ctx.replyWithMarkdown(msg, Extra.notifications(false) as any)
    })
  )
}

async function replyToday(ctx: BotContext) {
  const year = timeFormat('%Y')(ctx.now)
  const month = timeFormat('%m')(ctx.now)
  const day = ctx.state.day || ctx.now.getUTCDate() - ctx.state.journeyDayShift
  const part = _.get(ctx, 'match.groups.part')
  console.info('===> replyToday', { month, day, part })

  const videos = await getVideosFromPlaylist(ctx, year, month, day)
  const isFWFGDay = _.some(videos, isFWFG)

  if (videos.filter((v) => !isFWFG(v)).length === 0) {
    // Check the latest video on the channel
    console.info('No videos in the playlist, checkig in YouTube channel')
    const requestedDay = new Date(Date.UTC(+year, +month - 1, day + ctx.state.journeyDayShift))
    const newVideo = await getVideoPublishedAt(requestedDay)
    if (newVideo) {
      console.info('got one', newVideo)
      videos.push(newVideo)
    } else {
      const message =
        `Here should be a link to the video, but there isn’t 🤷\n` +
        `Check out the */calendar*. If the video is in the playlist it will appear here soon.`
      return ctx.replyWithMarkdown(message)
    }
  }

  if (!part && videos.length > 1) {
    // TODO: refactor types to handle title, duration and url optional params
    // When there are many videos, we are sure they go from JSON, so extend the Video type
    const videosFromJson = videos as Array<Video & { title: string; duration: number }>
    // Ask which one to show now
    let videosList: string
    let message: string
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
    return ctx.replyWithHTML(
      message,
      Extra.notifications(false).markup((m: any) => m.inlineKeyboard(buttons(m)))
    )
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
      return ctx.replyWithPhoto(
        `${fwfgVideo.thumbnailUrl}?rnd=${Math.random()}`,
        Extra.caption(`${toEmoji(day)}${partSymbol} <b><a href="${videoUrl}">${fwfgVideo.title}</a></b>`)
          .notifications(false)
          .HTML()
          .markup(menuKeboard) as unknown as ExtraPhoto
      )
    }
    const ytVideo = video as Video
    const videoUrl = shortUrl(ytVideo.id)
    message = `${toEmoji(day)}${partSymbol} ${videoUrl}`
    console.info(message)
    return ctx.replyWithHTML(message, Extra.notifications(false).markup(menuKeboard))
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
    ['💬 Spend time _practicing_ yoga rather than _scrolling through it_'],
    ['💬 Give time to _YourSelf_ rather than to _YouTube_'],
    ['💬 _Let us postpone nothing. Let us balance life’s account every day_'],
    ['😌 _Find what feels good_'],
    ['🐍 _Long healthy neck_'],
    ['🙃 _A downward dog a day, keeps the doctor away_'],
    ['✅ _Checking in is the hardest part_'],
    ['🙏 You will say _namaste_ to yourself'],
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
