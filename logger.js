const _ = require('lodash')
const YAML = require('json-to-pretty-yaml')
const { isAdmin, reportError } = require('./utils')

const logEvent = firestore => update => {
  return firestore.collection('logs').add({ json: JSON.stringify(update), date: new Date() })
}

async function logger(ctx, next) {
  const start = new Date()

  if (!isAdmin(ctx)) {
    console.log('👉 New Request ---')
    console.info(ctx.update)
  } else { console.log('👨‍💻 me working…') }

  await next()
  const ms = new Date() - start
  try {
    if (!isAdmin(ctx)) {
      // Log the message
      const toChat = process.env.LOG_CHAT_ID
      if (ctx.update.message) {
        const fromChat = ctx.update.message.chat.id
        const messageId = ctx.update.message.message_id
        ctx
          .forwardMessage(toChat, fromChat, messageId, { disable_notification: true })
          .then(() => {
            const { username, first_name } = ctx.update.message.from
            const text = ctx.update.message.text
            const payload = _.omit(ctx.update.message, [
              'from.username',
              'date',
              'text',
              ctx.update.message.from.id === ctx.update.message.chat.id ? 'chat' : '',
              _.get(ctx.update.message, 'entities.type') === 'bot_command' ? 'entities' : '',
            ])
            const html = YAML.stringify(payload)
            const name = username ? `@${username}` : first_name
            return ctx.telegram.sendMessage(toChat, `<b>${name}: ${text}</b>\n${html}`, { disable_notification: true, parse_mode: 'html' })
          })
      } else if (ctx.update.callback_query) {
        const { username, first_name } = ctx.update.callback_query.from
        const payload = _.omit(ctx.update.callback_query, [
          'from.username',
          'message',
          'chat_instance',
          'data',
        ])
        const text = ctx.update.callback_query.data
        const html = YAML.stringify(payload)
        ctx.telegram.sendMessage(toChat, `<b>@${username || first_name}: ${text}</b>\n${html}`, { disable_notification: true, parse_mode: 'html' })
      } else {
        const html = YAML.stringify(ctx.update)
        ctx.telegram.sendMessage(toChat, `It's not a message🤔\n${html}`, { disable_notification: true })
      }
      await logEvent(ctx.firestore)(ctx.update)
      console.log('Response time: %sms', ms)
    }
  } catch (e) {
    console.error('🐛 Error logging', e)
    return reportError({ ctx, where: 'logging middleware', error: e, silent: true })
  }
}

module.exports = logger
