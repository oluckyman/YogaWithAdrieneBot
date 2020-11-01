import _ from 'lodash'
// @ts-expect-error waiting for https://github.com/telegraf/telegraf/issues/1074
import Extra from 'telegraf/extra'

function pauseForA(sec: any) {
  return new Promise((r) => setTimeout(r, sec * 1000)) // eslint-disable-line no-promise-executor-return
}

const isAdmin = (ctx: any) =>
  [
    _.get(ctx.update, 'message.from.id'),
    _.get(ctx.update, 'callback_query.from.id'),
    // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
  ].includes(+process.env.ADMIN_ID)

// TODO: need a bullet-proof get-user method
const getUser = (ctx: any) => (ctx.update.message ? ctx.update.message.from : ctx.update.callback_query.from)

async function reportError({ ctx, error, where, silent = false }: any) {
  const toChat = process.env.LOG_CHAT_ID
  const errorMessage = `🐞${error}\n👉${where}\n🤖${JSON.stringify(ctx.update, null, 2)}`
  await ctx.telegram.sendMessage(toChat, errorMessage)
  if (silent) {
    return
  }

  await ctx.reply('Oops… sorry, something went wrong 😬')
  await pauseForA(1)
  await ctx.replyWithMarkdown(
    'Don’t hesitate to ping [the author](t.me/oluckyman) to get it fixed',
    Extra.webPreview(false)
  )
  await pauseForA(2)
  await ctx.replyWithMarkdown('Meantime try the */calendar*…')
  await pauseForA(0.7)
  // eslint-disable-next-line consistent-return
  return ctx.replyWithMarkdown('_…if it’s working 😅_')
}

module.exports = {
  pauseForA,
  reportError,
  getUser,
  isAdmin,
}
