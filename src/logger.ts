import _ from 'lodash'
import YAML from 'json-to-pretty-yaml'
import { Middleware } from 'telegraf'
import type { Firestore } from '@google-cloud/firestore'
import { Update } from 'telegraf/typings/telegram-types'
import Context from './models/context'
import { isAdmin, reportError } from './utils'

const logEvent = (firestore: Firestore) => (update: Update) => {
  return firestore.collection('logs').add({ json: JSON.stringify(update), date: new Date() })
}

const logger: Middleware<Context> = async (ctx, next) => {
  const start = new Date()

  if (!isAdmin(ctx)) {
    console.info('👉 New Request ---')
    console.info(ctx.update)
  } else {
    console.info('👨‍💻 me working…')
  }

  await next()
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
    return reportError({ ctx, where: 'logging middleware', error: e, silent: true })
  }
}

export default logger
