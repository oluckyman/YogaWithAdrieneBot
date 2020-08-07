const _ = require('lodash')
const { isAdmin } = require('./utils')

async function chat(ctx, next) {
  const replyTo = _.get(ctx.update, 'message.reply_to_message')
  if (!replyTo || !isAdmin(ctx)) {
    return next()
  }

  const textWithData = replyTo.text
  const [, toChat, messageId] = textWithData.split(' ')
  const message = ctx.update.message.text

  return ctx.telegram.sendMessage(toChat, message, {
    reply_to_message_id: messageId
  })
}

module.exports = chat
