const _ = require('lodash')
const dotenv = require('dotenv')
const Telegraf = require('telegraf')

dotenv.config()
const bot = new Telegraf(process.env.BOT_TOKEN)


bot.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log('---------')
  if (_.get(ctx.update, 'message.from.username') !== 'oluckyman') {
    console.info(ctx.update)
  } else { console.log('just me') }
  console.log('Response time: %sms', ms)
})

const greetings = [
  [0.0, '⏳ _Coming soon…_'],
  [2.2, '⌛ _Really soon, in a week or so._'],
  [3.5, 'Meantime, pick some video from the playlist:\nhttps://www.youtube.com/playlist?list=PLui6Eyny-Uzy9eeFCGMO7dJNX4TZuQ1VM'],
]

bot.command('/start', ctx => {
  const sendGreeting = i => {
    if (i >= greetings.length) return
    const message = greetings[i][1]
    const delaySec = _.get(greetings, [i + 1, 0])
    ctx.replyWithMarkdown(message).then(() => {
      if (delaySec !== undefined) {
        setTimeout(() => sendGreeting(i + 1), delaySec * 1000)
      }
    })
  }
  sendGreeting(0)
});

bot.command('/help', ctx => {
  ctx.replyWithHTML(`
<b>Yoga With Adriene</b> bot helps you get to yoga videos without friction and distractions.

Commands:
/today - Get today's video from <a href="https://yogawithadriene.com/calendar/">the calendar</a>
/help - This message🙊

👋 <i>Say hi to <a href="t.me/oluckyman">the author</a></i>
`, { disable_web_page_preview: true })
})


bot.on('text', (ctx) => ctx.replyWithMarkdown('_Coming soon👨‍💻_'))


const { PORT = 5000, HOST, WEBHOOK_SECRET, NODE_ENV = 'production' } = process.env

if (NODE_ENV === 'production') {
  bot.launch({
    webhook: {
      domain: `https://${HOST}/${WEBHOOK_SECRET}`,
      port: PORT
    }
  })
  console.info("Launch webhook 🚀")
} else {
  bot.launch()
  console.info("Launch polling 🚀")
}
