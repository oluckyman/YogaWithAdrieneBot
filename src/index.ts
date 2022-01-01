import _ from 'lodash'
import dotenv from 'dotenv'
import Telegraf, { Extra } from 'telegraf'
import Firestore from '@google-cloud/firestore'
import type { Bot, BotContext } from './models/bot'
import logger from './logger'
import antispam from './antispam'
import chat from './chat'
import useAnnouncments from './announcments'
import longPractice from './longPractice'
import replyCalendar from './calendar'
// import { setupJourneys } from './journeys'
import { MENU, pauseForA, reportError, isAdmin, oneOf } from './utils'
import useToday from './today'

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

const bot: Bot = new Telegraf(process.env.BOT_TOKEN)

bot.catch(async (err: string, ctx: BotContext) => {
  // do not show error message to user if the main action was successful
  const silent = ctx.state.success
  console.error(`⚠️ ${ctx.updateType}`, err)
  return reportError({ ctx, where: 'Unhandled', error: err, silent })
})

function convertTZ(date: Date, tzString: string) {
  return new Date(date.toLocaleString('en-US', { timeZone: tzString }))
}

bot.use((ctx, next) => {
  // TODO: figure out how to put database into bot context properly
  // For now just injecting it here
  /* from https://telegraf.js.org/#/?id=extending-context
  The recommended way to extend bot context:
  const bot = new Telegraf(process.env.BOT_TOKEN)
  bot.context.db = {
    getScores: () => { return 42 }
  }
  */
  ctx.firestore = firestore

  ctx.now = new Date()
  // ctx.now = new Date('2022-01-01 08:01')

  // Use Texas Central timezone: this is the official YWA time
  ctx.now = convertTZ(ctx.now, 'America/Chicago')

  // FYI: The videos will be released every day in January at 5 AM EST (11 AM in Spain)
  // During the January journey Jan 1st is the Day 0
  ctx.state.journeyDayShift = ctx.now.getMonth() === 0 ? 1 : 0

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

// Annoncements
//
// bot.use(announcments)
useAnnouncments(bot)

bot.use(longPractice)

// /strat
//
bot.command('/start', async (ctx: BotContext) => {
  // I use it in the logger to do verbose log for new users
  ctx.state.command = 'start'

  // TODO: consider use these words (seen in an Adriene's letter):
  // It's free and easy to follow. It takes out all the guess work
  // and welcomes you to make practice a priority.
  const greetings: [number, string][] = [
    [0.0, '👋 _Hello my darling friend!_'],
    [
      1.2,
      'This bot is designed to */help* you maintain your *daily* yoga practice and feel a sense of unity with others.',
    ],
    [
      1.5,
      'It gives you */today*’s yoga video from the */calendar* and shows how many people have started this video right now.',
    ],
    // [2.0, 'No distractions. No paradox of choice.'],
    // [1.0, '_Less_ is _more_.'],
    // [1.0, 'With _less_ friction there are _more_ chances your healthy habit will *thrive*.'],
    // [2.0, 'And there is always someone on the planet practicing with you.'],
    // [2.0, 'You will see.'],
    // [1.0, '*You’re not alone*.'],
    // [2.0, '_So, hop into something comfy, and let’s get started!_'],
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
      ).notifications(false)
    )
    if (delaySec !== undefined) {
      await ctx.replyWithChatAction('typing')
      await pauseForA(delaySec)
      await sendGreeting(i + 1)
    }
  }
  await ctx.replyWithChatAction('typing')
  await pauseForA(0.5)
  await sendGreeting(0)
  // TODO: rewrite it to `await` chain and set `state.success` at the end
  return setFirstContact({
    user: _.get(ctx.update, 'message.from'),
  })
})

const replyHelp = (ctx: BotContext) =>
  ctx
    .replyWithHTML(
      `
<b>Yoga With Adriene</b> bot helps you get yoga videos without friction and distractions.

<b>Commands</b>
• <b>/today</b>’s video from the calendar ▶️
• <b>/calendar</b> of the month and YouTube playlist 🗓
• <b>/feedback</b> is always welcome 💬
• <b>/help</b> — <i>this message</i>📍

If the bot doesn’t work, it means I dropped the daily yoga, <a href="t.me/oluckyman">cheer me up 👋</a>.
`,
      Extra.notifications(false).webPreview(false) as any
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

bot.command('/feedback', (ctx: BotContext) => {
  ctx.state.command = 'feedback'
  return ctx
    .replyWithMarkdown(
      `
Write _or tell or show_ what’s on your mind in the chat, and I’ll consider it as feedback. You can do it anytime.
`
    )
    .then(() => {
      ctx.state.success = true
    })
})

useToday(bot)

bot.command('/calendar', replyCalendar)
bot.hears(MENU.calendar, replyCalendar)

// setupJourneys(bot)

const praiseRegExp = '(?<praise>[🙌🙏❤️🧡💛💚💙💜👍❤️😍🥰😘💖]|thank|thanx)'
const greetRegExp = '(?<greet>^hi|hello|hey|hola|привет|ciao)'
// eslint-disable-next-line no-misleading-character-class
const smallTalkMessage = new RegExp(`${praiseRegExp}|${greetRegExp}`, 'iu')
const thanksMessages = [
  [...'😌☺️😉'], // smiles
  [...'🥰💚🤗'], // love
  [...'🙏'], // gestures
]
const greetMessages = [[...'👋']]
async function replySmallTalk(ctx: BotContext) {
  ctx.state.command = 'smallTalk'
  await pauseForA(1)
  await ctx.replyWithChatAction('typing')
  await pauseForA(1)
  let messagesToReply = thanksMessages
  if (ctx.match?.groups?.greet) {
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
