import dashbotFactory, {
  DashbotIntentCalendar,
  DashbotIntentHelp,
  DashbotIntentNotHandled,
  DashbotIntentSmallTalk,
  DashbotIntentStart,
  DashbotIntentToday,
  MessageForDashbot
} from 'dashbot'
import type { BotContext } from '../models/bot'
import { getUser } from '../utils'

const dashbot = dashbotFactory(process.env.DASHBOT_API_KEY, { debug: true }).universal;

function logEvent(ctx: BotContext): void {
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

export default logEvent