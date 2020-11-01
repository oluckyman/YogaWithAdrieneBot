// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable '_'.
const _ = require('lodash')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'Extra'.
const Extra = require('telegraf/extra')

// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'pauseForA'... Remove this comment to see the full error message
function pauseForA(sec: any) {
  return new Promise(r => setTimeout(r, sec * 1000)) // eslint-disable-line no-promise-executor-return
}


// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'isAdmin'.
const isAdmin = (ctx: any) => [
  _.get(ctx.update, 'message.from.id'),
  _.get(ctx.update, 'callback_query.from.id'),
// @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
].includes(+process.env.ADMIN_ID)


// TODO: need a bullet-proof get-user method
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'getUser'.
const getUser = (ctx: any) => ctx.update.message ? ctx.update.message.from : ctx.update.callback_query.from


// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'reportErro... Remove this comment to see the full error message
async function reportError({
  ctx,
  error,
  where,
  silent = false
}: any) {
  const toChat = process.env.LOG_CHAT_ID
  const errorMessage = `🐞${error}\n👉${where}\n🤖${JSON.stringify(ctx.update, null, 2)}`
  await ctx.telegram.sendMessage(toChat, errorMessage)
  if (silent) { return }

  await ctx.reply('Oops… sorry, something went wrong 😬')
  await pauseForA(1)
  await ctx.replyWithMarkdown('Don’t hesitate to ping [the author](t.me/oluckyman) to get it fixed', Extra.webPreview(false))
  await pauseForA(2)
  await ctx.replyWithMarkdown('Meantime try the */calendar*…')
  await pauseForA(.7)
  return ctx.replyWithMarkdown('_…if it’s working 😅_')
}


module.exports = {
  pauseForA,
  reportError,
  getUser,
  isAdmin,
}
