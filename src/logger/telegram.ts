import _ from 'lodash'
import YAML from 'json-to-pretty-yaml'
import type { Firestore } from '@google-cloud/firestore'
import { Update } from 'telegraf/typings/telegram-types.d'
import { isAdmin, reportError } from '../utils'
import type { BotContext } from '../models/bot'

const logFirestore = (firestore: Firestore) => (update: Update) =>
  firestore.collection('logs').add({ json: JSON.stringify(update), date: new Date() })

async function logEvent(ctx: BotContext): Promise<void> {
  // TODO consider tracking response time by storing initial time in the context
  // and track it in amplitude, not only in the console
  // const ms = +new Date() - +start
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
            ctx.update.message?.entities?.[0].type === 'bot_command' ? 'entities' : '',
          ])
          const html = YAML.stringify(payload)
          const name = username ? `@${username}` : first_name
          await ctx.telegram.sendMessage(toChat, `<b>${name}: ${text}</b>\n${html}`, {
            disable_notification: true,
            parse_mode: 'HTML',
          })
        } else if (!ctx.state.command) {
          // User said something which is not a command,
          // log the user id and message id, so I can answer
          await ctx.telegram.sendMessage(toChat, `💬 ${fromChat} ${messageId}`, { disable_notification: true })
        }
      } else if (ctx.update.callback_query) {
        const { username, first_name } = ctx.update.callback_query.from
        const text = ctx.update.callback_query.data
        await ctx.telegram.sendMessage(toChat, `<b>@${username || first_name}: ${text}</b>`, {
          disable_notification: true,
          parse_mode: 'HTML',
        })
      } else if ((ctx.update as any).my_chat_member?.new_chat_member) {
        // `my_chat_member` is new API. TODO: need to migrate to Telegraf 4
        const updateAny = ctx.update as any
        const oldStatus = updateAny.my_chat_member.old_chat_member.status
        const newStatus = updateAny.my_chat_member.new_chat_member.status
        const status =
          // eslint-disable-next-line no-nested-ternary
          oldStatus === 'member' && newStatus === 'kicked'
            ? 'stopped ✋'
            : oldStatus === 'kicked' && newStatus === 'member'
            ? 'restarted 🤗'
            : `${oldStatus} → ${newStatus}`
        const { username, first_name } = updateAny.my_chat_member.from
        await ctx.telegram.sendMessage(toChat, `<b>@${username || first_name}</b> ${status}`, {
          disable_notification: true,
          parse_mode: 'HTML',
        })
      } else {
        const html = YAML.stringify(ctx.update)
        await ctx.telegram.sendMessage(toChat, `It's not a message🤔\n${html}`, { disable_notification: true })
      }
      const otherLogs = (ctx.state.logQueue || []).join('\n')
      if (otherLogs) ctx.telegram.sendMessage(toChat, otherLogs, { disable_notification: true })
      // console.info('Response time: %sms', ms)
    }
    await logFirestore(ctx.firestore)(ctx.update)
  } catch (e) {
    console.error('🐛 Error logging', e)
    await reportError({ ctx, where: 'logging middleware', error: `${e}`, silent: true })
  }
}

export default logEvent
