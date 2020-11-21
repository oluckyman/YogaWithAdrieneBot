import _ from 'lodash'
import { Middleware } from 'telegraf'
import BotContext from './models/bot-context'
import { isAdmin } from './utils'

const chat: Middleware<BotContext> = (ctx, next) => {
  const replyTo = ctx.update.message?.reply_to_message
  if (!replyTo || !isAdmin(ctx)) {
    return next()
  }

  const textWithData = replyTo.text ?? ''
  const [, toChat, messageId] = textWithData.split(' ')
  const message = ctx.update.message?.text ?? ''

  return ctx.telegram.sendMessage(toChat, message, {
    reply_to_message_id: +messageId,
  })
}

export default chat
