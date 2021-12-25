import _ from 'lodash'
import YAML from 'json-to-pretty-yaml'
import type { Firestore } from '@google-cloud/firestore'
import { Update } from 'telegraf/typings/telegram-types'
import dashbotFactory, {
  DashbotIntentCalendar,
  DashbotIntentHelp,
  DashbotIntentNotHandled,
  DashbotIntentSmallTalk,
  DashbotIntentStart,
  DashbotIntentToday,
  MessageForDashbot
} from 'dashbot'
import type { BotContext, BotMiddleware } from './models/bot'
import { isAdmin, reportError, getUser } from './utils'


const dashbot = dashbotFactory(process.env.DASHBOT_API_KEY, { debug: true }).universal;

function logIncomingDashbot(ctx: BotContext) {
  const userId = `${getUser(ctx)?.id ?? -1}`
  const text = ctx.update.message?.text ?? ''
  const {command} = ctx.state

  const message: MessageForDashbot = {
    text,
    userId,
    platformJson: ctx.update
  }

  switch (command) {
    case 'start': {
      const ref = text.replace(/^\/start\s*/, '') || ''
      const intent: DashbotIntentStart = {
        name: 'start',
        inputs: [{ name: 'ref', value: ref }]
      }
      message.intent = intent
      break
    }
    case 'today': {
      const intent: DashbotIntentToday = {
        name: 'today',
        inputs: [{ name: 'day', value: `${ctx.state.day ?? 'today'}` }]
      }
      message.intent = intent
      break
    }
    case 'calendar':
      message.intent = { name: 'calendar' } as DashbotIntentCalendar
      break
    case 'help':
      message.intent = { name: 'help' } as DashbotIntentHelp
      break
    case 'smallTalk':
      message.intent = { name: 'smallTalk' } as DashbotIntentSmallTalk
      break
    default:
      message.intent = { name: 'NotHandled' } as DashbotIntentNotHandled
  }

  try {
    dashbot.logIncoming(message)
  } catch (e) {
    console.error('🐛 Error dashbot logging', e)
    return reportError({ ctx, where: 'logging middleware', error: `${e}`, silent: true })
  }
}


const logEvent = (firestore: Firestore) => (update: Update) => {
  return firestore.collection('logs').add({ json: JSON.stringify(update), date: new Date() })
}

const logger: BotMiddleware = async (ctx, next) => {
  const start = new Date()

  if (!isAdmin(ctx)) {
    console.info('👉 New Request ---')
    console.info(ctx.update)
  } else {
    console.info('👨‍💻 me working…')
  }

  await next()

  //
  // Dashbot
  //
  logIncomingDashbot(ctx)

  //
  // Telegram channel log
  //
  const ms = +new Date() - +start
  try {
    if (!isAdmin(ctx)) {
      // Log the message
      const toChat = process.env.LOG_CHAT_ID
      const isNewUser = ctx.state.command === 'start'
      if (ctx.update.message) {
        const fromChat = ctx.update.message.chat.id
        const messageId = ctx.update.message.message_id
        await ctx.telegram.forwardMessage(toChat, fromChat, messageId, { disable_notification: true })
        if (isNewUser) {
          const { username, first_name } = ctx.update.message?.from ?? {}
          const { text } = ctx.update.message
          const payload = _.omit(ctx.update.message, [
            'from.username',
            'date',
            'text',
            ctx.update.message?.from?.id === ctx.update.message?.chat.id ? 'chat' : '',
            _.get(ctx.update.message, 'entities.type') === 'bot_command' ? 'entities' : '',
          ])
          const html = YAML.stringify(payload)
          const name = username ? `@${username}` : first_name
          return ctx.telegram.sendMessage(toChat, `<b>${name}: ${text}</b>\n${html}`, {
            disable_notification: true,
            parse_mode: 'HTML',
          })
        }
        if (!ctx.state.command) {
          // User said something which is not a command,
          // log the user id and message id, so I can answer
          return ctx.telegram.sendMessage(toChat, `💬 ${fromChat} ${messageId}`, { disable_notification: true })
        }
      } else if (ctx.update.callback_query) {
        const { username, first_name } = ctx.update.callback_query.from
        const text = ctx.update.callback_query.data
        await ctx.telegram.sendMessage(toChat, `<b>@${username || first_name}: ${text}</b>`, {
          disable_notification: true,
          parse_mode: 'HTML',
        })
      } else {
        const html = YAML.stringify(ctx.update)
        await ctx.telegram.sendMessage(toChat, `It's not a message🤔\n${html}`, { disable_notification: true })
      }
      const otherLogs = (ctx.state.logQueue || []).join('\n')
      if (otherLogs) ctx.telegram.sendMessage(toChat, otherLogs, { disable_notification: true })
      await logEvent(ctx.firestore)(ctx.update)
      console.info('Response time: %sms', ms)
    }
  } catch (e) {
    console.error('🐛 Error logging', e)
    return reportError({ ctx, where: 'logging middleware', error: `${e}`, silent: true })
  }
}

export default logger
