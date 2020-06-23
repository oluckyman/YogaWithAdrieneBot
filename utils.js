const Extra = require('telegraf/extra')

function pauseForA(sec) {
  return new Promise(r => setTimeout(r, sec * 1000)) // eslint-disable-line no-promise-executor-return
}

async function reportError({ ctx, error, where, silent = false }) {
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
}
