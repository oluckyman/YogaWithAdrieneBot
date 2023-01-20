import dotenv from 'dotenv'
import Telegraf from 'telegraf'
import Firestore from '@google-cloud/firestore'
import { createPool } from 'slonik'
import logger from './logger'
import antispam from './antispam'
import chat from './chat'
import useAnnouncments from './announcments'
import longPractice from './longPractice'
import replyStart from './start'
import replyCalendar from './calendar'
import useToday from './today'
import replyHelp from './help'
import { replySmallTalk, smallTalkMessage } from './smallTalk'
import { MENU, reportError, convertTZ } from './utils'
import type { Bot, BotContext } from './models/bot'

dotenv.config()

const firestore = new Firestore.Firestore({
  projectId: process.env.GOOGLE_APP_PROJECT_ID,
  credentials: {
    private_key: process.env.GOOGLE_APP_PRIVATE_KEY.split('\\n').join('\n'),
    client_email: process.env.GOOGLE_APP_CLIENT_EMAIL,
  },
})

const bot: Bot = new Telegraf(process.env.BOT_TOKEN)

bot.catch(async (err: string, ctx: BotContext) => {
  // do not show error message to user if the main action was successful
  const silent = ctx.state.success
  console.error(`⚠️ ${ctx.updateType}`, err)
  return reportError({ ctx, where: 'Unhandled', error: err, silent })
})

bot.use(async (ctx, next) => {
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
  ctx.postgres = await createPool(process.env.DATABASE_URL)

  ctx.now = new Date()
  // ctx.now = new Date('2023-01-03 06:56')
  // ctx.now = new Date('2022-12-31 07:01')

  console.info('Server', ctx.now)

  // Use Texas Central timezone: this is the official YWA time
  ctx.now = convertTZ(ctx.now, 'America/Chicago')
  console.info('Austin', ctx.now)

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

// Tomorrow’s long practice notice
//
bot.use(longPractice)

// Annoncements
//
useAnnouncments(bot)

// /strat
//
bot.command('/start', replyStart)

// /help
//
bot.hears(MENU.help, replyHelp)
bot.command('/help', replyHelp)

// /feedback
//
bot.command('/feedback', (ctx: BotContext) => {
  ctx.state.command = 'feedback'
  return ctx
    .replyWithMarkdown(
      `
Write _or tell or show_ what’s on your mind, and I’ll consider it as feedback. You can do it anytime here in the chat.
`
    )
    .then(() => {
      ctx.state.success = true
    })
})

// Today
//
useToday(bot)

// Calendar
//
bot.command('/calendar', replyCalendar)
bot.hears(MENU.calendar, replyCalendar)

// Small talk
//
bot.hears(smallTalkMessage, replySmallTalk)

// Set commands
//
bot.telegram.setMyCommands([
  {
    command: 'today',
    description: 'Get today’s video from the yoga calendar',
  },
  {
    command: 'calendar',
    description: 'Review the month’s calendar',
  },
  {
    command: 'help',
    description: 'See what this bot can do for you',
  },
])

export default bot
