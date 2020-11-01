// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable '_'.
const _ = require('lodash')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'isAdmin'.
const { isAdmin } = require('./utils')

// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'chat'.
async function chat(ctx: any, next: any) {
  const replyTo = _.get(ctx.update, 'message.reply_to_message')
  if (!replyTo || !isAdmin(ctx)) {
    return next()
  }

  const textWithData = replyTo.text
  const [, toChat, messageId] = textWithData.split(' ')
  const message = ctx.update.message.text

  return ctx.telegram.sendMessage(toChat, message, {
    reply_to_message_id: messageId,
  })
}

module.exports = chat
