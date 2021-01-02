import _ from 'lodash'
import dotenv from 'dotenv'
import Telegraf, { Extra } from 'telegraf'
import { timeFormat } from 'd3-time-format'
import Promise from 'bluebird'
import { toEmoji } from 'number-to-emoji'
import writtenNumber from 'written-number'
import Firestore, { DocumentReference, Timestamp } from '@google-cloud/firestore'
import { promises as fs } from 'fs'
import type { Bot, BotContext } from './models/bot'
import logger from './logger'
import antispam from './antispam'
import chat from './chat'
import getNowWatching from './nowWatching'
import longPractice from './longPractice'
import replyCalendar from './calendar'
// import { setupJourneys } from './journeys'
import { pauseForA, reportError, getUser, isAdmin } from './utils'

dotenv.config()
const firestore = new Firestore.Firestore({
  projectId: process.env.GOOGLE_APP_PROJECT_ID,
  credentials: {
    private_key: process.env.GOOGLE_APP_PRIVATE_KEY.split('\\n').join('\n'),
    client_email: process.env.GOOGLE_APP_CLIENT_EMAIL,
  },
})

const setFirstContact = ({ user }: any) => {
  const userDoc = firestore.collection('users').doc(`id${user.id}`)
  return userDoc.get().then((doc: any) => {
    if (!doc.exists) {
      return userDoc.set({
        ...user,
        first_contact_at: new Date(),
      })
    }
  })
}

const MENU = {
  today: '▶️ Today’s yoga',
  calendar: '🗓 Calendar',
  help: '💁 Help',
}
const bot: Bot = new Telegraf(process.env.BOT_TOKEN)

bot.catch(async (err: string, ctx: BotContext) => {
  // do not show error message to user if the main action was successful
  const silent = ctx.state.success
  console.error(`⚠️ ${ctx.updateType}`, err)
  return reportError({ ctx, where: 'Unhandled', error: err, silent })
})

bot.use((ctx, next) => {
  // TODO: figure out how to put database into bot context properly
  // For now just injecting it here
  ctx.firestore = firestore

  ctx.now = new Date()
  // ctx.now = new Date('2021-01-03')
  return next()
})

// Spam filter
//
bot.use(antispam)

// Logger
//
bot.use(logger)

// Chat
//
bot.use(chat)

// Annoncement
//
bot.use(async (ctx, next) => {
  await next()
  try {
    // 0. if it was one of today commands
    if (ctx.state.command !== 'today') {
      return
    }
    console.info(`Checking if I should send a link to chart to user?`)

    // TODO: need a bullet-proof get-user method
    const user = getUser(ctx)

    // 1. get user doc by user.id
    type UserData = {
      id: number
      yogi: string
      message_sent_at: Timestamp
      first_name: string
    }
    const userDoc = ctx.firestore.collection('users').doc(`id${user?.id}`) as DocumentReference<UserData>
    await userDoc.get().then(async (doc) => {
      if (!doc.exists) {
        console.info(`dunno this user ${user?.id}`)
        return // TODO: what async and what not?
      }
      const { yogi, message_sent_at, first_name } = doc.data() ?? {}

      // 2. see if the doc has yogi field and message was not sent
      if (!yogi) {
        console.info(`${first_name} not a regular user in May`)
        return
      }
      if (message_sent_at) {
        console.info(`${first_name} already received the message at`, message_sent_at.toDate())
        return
      }

      // 3. Send the link
      let linkSeen = false
      try {
        await pauseForA(2)
        await ctx.reply(`👋 Hey, ${first_name}! One more thing…`)
        await pauseForA(2)
        await ctx.reply(`You might be interested to see what the last month looked like from the bot’s perspective.`)
        await pauseForA(3)
        await ctx.replyWithMarkdown(
          // eslint-disable-next-line no-irregular-whitespace
          `Check out the [Yoga Calendar Effect](https://yoga-calendar-effect.now.sh/?yogi=${yogi}) chart.\nYou’re part of it too!`
        )
        linkSeen = true

        // 4. save message sent date
        await userDoc.update({
          message_sent_at: new Date(),
        })

        console.info(`link sent to ${first_name} (yogi=${yogi})`)
        const linkSentMessage = `${first_name} have received https://ywa-calendar-may-2020.now.sh/?yogi=${yogi}`
        await ctx.telegram.sendMessage(process.env.LOG_CHAT_ID, linkSentMessage)
      } catch (e) {
        await reportError({
          ctx,
          where: `yogi message, linkSeen: ${linkSeen}, yogi: ${yogi}`,
          error: e,
          silent: true,
        })
      }
    })
    return Promise.resolve()
  } catch (e) {
    console.error('🐛 In announcement logic', e)
    return reportError({
      ctx,
      where: 'announcement middleware',
      error: e,
      silent: true,
    })
  }
})

bot.use(longPractice)

// /strat
//
bot.command('/start', async (ctx: any) => {
  // I use it in the logger to do verbose log for new users
  ctx.state.command = 'start'

  const greetings: [number, string][] = [
    [0.0, '👋 _Hello my darling friend!_'],
    [
      2.2,
      'This bot is designed to */help* you maintain your *daily* yoga practice and feel a sense of unity with others.',
    ],
    [
      3.5,
      'It gives you */today*’s yoga video from the */calendar* and shows how many people have started this video right now.',
    ],
    [4.0, 'No distractions. No paradox of choice.'],
    [3.0, '_Less_ is _more_.'],
    [3.0, 'With _less_ friction there are _more_ chances your healthy habit will *thrive*.'],
    [4.0, 'And there is always someone on the planet practicing with you.'],
    [4.0, 'You will see.'],
    [2.0, '*You’re not alone*.'],
    [4.0, '_So, hop into something comfy, and let’s get started!_'],
    // [3.0, 'Send */today* command to get the video or just push the button'],
  ]
  const sendGreeting = async (i: any) => {
    if (i >= greetings.length) return
    const message = greetings[i][1]
    const delaySec = _.get(greetings, [i + 1, 0])
    const isLastMessage = i === greetings.length - 1
    await ctx.reply(
      message,
      Extra.markdown().markup((m: any) =>
        isLastMessage ? m.inlineKeyboard([m.callbackButton('▶️ Get today’s yoga video', 'cb:today')]) : m
      )
    )
    if (delaySec !== undefined) {
      await ctx.replyWithChatAction('typing')
      await pauseForA(delaySec)
      await sendGreeting(i + 1)
    }
  }
  await ctx.replyWithChatAction('typing')
  await pauseForA(1)
  await sendGreeting(0)
  // TODO: rewrite it to `await` chain and set `state.success` at the end
  return setFirstContact({
    user: _.get(ctx.update, 'message.from'),
  })
})

const replyHelp = (ctx: any) =>
  ctx
    .replyWithHTML(
      `
<b>Yoga With Adriene</b> bot helps you get yoga videos without friction and distractions.

<b>Commands</b>
• <b>/today</b>’s video from the calendar ▶️
• <b>/calendar</b> of the month and YouTube playlist 🗓
• <b>/feedback</b> is always welcome 💬
• <b>/help</b> — <i>this message</i>📍

👋 <i>Say hi to <a href="t.me/oluckyman">the author</a></i>
`,
      Extra.webPreview(false)
    )
    .then(() => {
      ctx.state.success = true
    })
    .then(() => {
      ctx.state.command = 'help'
    })
// • <b>/about</b> this bot and Yoga With Adriene 🤔
bot.hears(MENU.help, replyHelp)
bot.command('/help', replyHelp)

bot.command('/feedback', (ctx: any) =>
  ctx
    .replyWithMarkdown(
      `
Write _or tell or show_ what’s on your mind in the chat, and I’ll consider it as feedback. You can do it anytime.
`
    )
    .then(() => {
      ctx.state.success = true
    })
)

const oneOf = (messages: any) => _.sample(_.sample(messages))

// Consider videos without id as FWFG videos
const isFWFG = (v: any) => !v.id

const getPart = (i: any) => {
  const partSymbols = ['🅰️', '🅱️', '❤️', '🧡', '💛', '💚', '💙', '💜']
  return i < partSymbols.length ? partSymbols[i] : `*[${i + 1}]*`
}

async function replyToday(ctx: BotContext) {
  // I use it in announcement middleware to react only on today commands
  ctx.state.command = 'today'

  const month = timeFormat('%m')(ctx.now)
  const day = ctx.state.day || ctx.now.getDate() - 1 // XXX: journey day shift!
  const part = _.get(ctx, 'match.groups.part')
  // const [month, day] = ['05', 22]
  console.info('replyToday', { month, day, part })

  const videos: any[] = await fs
    .readFile(`calendars/${month}.json`, 'utf8')
    .then((txt: any) => JSON.parse(txt))
    .then((json: any) =>
      _.filter(json, { day }).map((v: any) => ({
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
    const message =
      `Here should be a link to the video, but there isn’t 🤷\n` +
      `Check out the */calendar*. If the video is in the playlist it will appear here soon.`
    return ctx.replyWithMarkdown(message).then(() => {
      ctx.state.success = true
    })
  }

  if (!part && videos.length > 1) {
    // Ask which one to show now
    let videosList
    let message
    let buttons: any
    if (isFWFGDay) {
      videosList = videos
        .map((v: any) => `${isFWFG(v) ? '🖤 *FWFG* membership\n' : '❤️ *YouTube* alternative\n'}${v.title}`)
        .join('\n')
      message = `FWFG video today\n${videosList}`
      buttons = (m: any) =>
        videos.map((v: any, i: any) => m.callbackButton(isFWFG(v) ? '🖤 FWFG' : '❤️ YouTube', `cb:today_${day}_${i}`))
    } else {
      videosList = videos.map((v: any, i: any) => `${getPart(i)} ${v.title}`).join('\n')
      message = `${_.capitalize(writtenNumber(videos.length))} videos today\n${videosList}`
      buttons = (m: any) =>
        videos.map((v: any, i: any) => m.callbackButton(`${getPart(i)} ${v.duration} min.`, `cb:today_${day}_${i}`))
    }
    console.info(message)
    return ctx
      .replyWithMarkdown(
        message,
        Extra.markup((m: any) => m.inlineKeyboard(buttons(m)))
      )
      .then(() => {
        ctx.state.success = true
      })
  }
  // Send the video and pre-video message
  // TODO: define video type here!
  const video = _.filter(videos, (v: any, i: any) => !part || i === +part)[0]
  const nowWatching = isFWFG(video) ? 0 : await getNowWatching(firestore, video)
  let message
  if (nowWatching) {
    message = nowWatchingMessage(nowWatching)
  } else {
    message = preVideoMessage()
  }
  try {
    await Promise.all([
      ctx.replyWithMarkdown(message),
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

    const videoUrl = video.url ? `${video.url}?from=YogaWithAdrieneBot` : shortUrl(video.id)
    message = `${toEmoji(day)}${partSymbol} ${videoUrl}`
    console.info(message)
    return ctx.reply(message, Extra.markup(menuKeboard)).then(() => {
      ctx.state.success = true
    })
  } catch (e) {
    console.error(`Error with video link: ${message}`, e)
    return reportError({ ctx, where: '/today: the video link', error: e })
  }
}
bot.hears('▶️ Today’s yoga video', replyToday) // for old buttons, remove later
bot.hears(MENU.today, replyToday)
bot.command('/today', (ctx: any) => {
  const { text } = ctx.update.message
  ctx.state.day = +_.get(text.match(/\/today +(?<day>\d+)/), 'groups.day', 0)
  return replyToday(ctx)
})
bot.action(/cb:today(?:_(?<day>\d+)_(?<part>\d+))?/, (ctx: any) => {
  const { part } = ctx.match.groups
  ctx.state.day = +_.get(ctx, 'match.groups.day', 0)
  if (part !== undefined) {
    ctx.answerCbQuery('Getting the video for you…')
  } else {
    ctx.answerCbQuery('Looking for today’s video…')
  }
  // ctx.editMessageReplyMarkup() // remove the button
  return replyToday(ctx)
})

function shortUrl(id: any) {
  return `youtu.be/${id}`
}

// Show who's practicing right now
//
function nowWatchingMessage(nowWatching: any) {
  const yogi1 = [...'😝🤪😑😑😅😅🙃🙃🙃🙃🙃🙃🙃🙃😇😌😌😌😌😌😌😊😊😊😊😊😊😬😴']
  const rare = [...'🦄', ...'🎅🤶⛄']
  // const yogi2 = [...'🤪😝😞🥵😑🙃😅😇☺️😊😌😡🥶😬🙄😴🥴🤢💩🤖👨🦄👽']
  const yogi = [...yogi1, ...rare]
  const emojisArr = _.range(nowWatching).map(() => _.sample(yogi))
  // keep only one instance of rare emoji
  rare.forEach((emoji) => {
    const indexes = emojisArr.map((e, i) => (e === emoji ? i : -1)).filter((i) => i !== -1)
    const toReplace = _.sampleSize(indexes, indexes.length - 1)
    toReplace.forEach((index) => {
      emojisArr[index] = _.sample(yogi1)
    })
  })
  const emojis = emojisArr.join('')
  const number = nowWatching <= 10 ? writtenNumber(nowWatching) : nowWatching
  const messages =
    // eslint-disable-next-line no-nested-ternary
    nowWatching > 925
      ? [
          `*${number} people* started this video within the last minute`,
          `*${number} folks* started this video within the last minute`,
          `Practice in sync with *${number} people*`,
          `Join *${number} brave souls*, they’ve just started`,
        ]
      : // eslint-disable-next-line no-nested-ternary
      nowWatching > 2
      ? [
          `*${_.capitalize(number)} folks* started this video within the last minute\n${emojis}`,
          `Practice in sync with *${number} people*\n${emojis}`,
          `Join *${number} brave souls*, they’ve just started\n${emojis}`,
        ]
      : nowWatching === 2
      ? [`Make a trio with these *two*, they started within the last minute: ${emojis}`]
      : [
          '*One person* hit play within the last minute, make a duo!',
          'Someone on the planet just started this video, keep them company!',
        ]
  return _.sample(messages)
}

function preVideoMessage() {
  const messages = [
    ['💬 Spend time _practicing_ yoga rather than _scrolling it'],
    ['💬 Give time to _YourSelf_ rather than to _YouTube_'],
    ['💬 _Let us postpone nothing. Let us balance life’s account every day_'],
    ['😌 _Find what feels good_'],
    ['🐍 _Long healthy neck_'],
    ['🧘‍♀️ _Sukhasana_ – easy pose'],
    [...'🐌🐢'].map((e) => `${e} _One yoga at a time_`),
    [...'🐌🐢'].map((e) => `${e} _Little goes a long way_`),
  ]
  return oneOf(messages)
}

bot.command('/calendar', replyCalendar)
bot.hears(MENU.calendar, replyCalendar)

// setupJourneys(bot)

const praiseRegExp = '(?<praise>[🙏❤️🧡💛💚💙💜👍❤️😍🥰😘]|thank)'
const greetRegExp = '(?<greet>^hi|hello|hey|hola|привет)'
// eslint-disable-next-line no-misleading-character-class
const smallTalkMessage = new RegExp(`${praiseRegExp}|${greetRegExp}`, 'iu')
const thanksMessages = [
  [...'😌☺️😉'], // smiles
  [...'🥰💚🤗'], // love
  [...'🙏'], // gestures
]
const greetMessages = [[...'👋']]
async function replySmallTalk(ctx: any) {
  ctx.state.command = 'smallTalk'
  await pauseForA(1)
  await ctx.replyWithChatAction('typing')
  await pauseForA(1)
  let messagesToReply = thanksMessages
  if (ctx.match.groups.greet) {
    messagesToReply = greetMessages
  }
  const reply = oneOf(messagesToReply)
  // show how the message looks in botlog
  if (!isAdmin(ctx)) {
    // eslint-disable-next-line require-atomic-updates
    ctx.state.logQueue = [...(ctx.state.logQueue || []), reply]
    console.info(reply)
  }
  return ctx.replyWithMarkdown(reply).then(() => {
    ctx.state.success = true
  })
}
bot.hears(smallTalkMessage, replySmallTalk)

function menuKeboard(m: any) {
  return m.resize().keyboard([MENU.today, MENU.calendar, MENU.help])
}

bot.telegram.setMyCommands([
  {
    command: 'today',
    description: 'Get today’s video from the yoga calendar',
  },
  {
    command: 'calendar',
    description: 'Review the month’s calendar',
    // }, {
    //   command: 'feedback', description: 'Ask a question or share an idea'
  },
  {
    command: 'help',
    description: 'See what this bot can do for you',
  },
])

const { PORT = 5000, HOST, WEBHOOK_SECRET, NODE_ENV = 'production' } = process.env

if (NODE_ENV === 'production') {
  bot.launch({
    webhook: {
      domain: `https://${HOST}/${WEBHOOK_SECRET}`,
      port: +PORT,
    },
  })
  console.info('Launch webhook 🚀')

  // Prevent app from sleeping
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const request = require('request')
  const ping = () =>
    request(`https://${HOST}/ping`, (error: any, response: any, body: any) => {
      if (error) console.info('error:', error)
      if (body) console.info('body:', body)
      setTimeout(ping, 1000 * 60 * 25)
    })
  console.info('Ping myself 👈')
  ping()
} else {
  bot.launch()
  console.info('Launch polling 🚀')
}
