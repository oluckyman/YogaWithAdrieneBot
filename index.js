const dotenv = require('dotenv')
const Telegraf = require('telegraf')

dotenv.config()
const bot = new Telegraf(process.env.BOT_TOKEN)


bot.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log('---------')
  console.log(ctx.update)
  console.log('Response time: %sms', ms)
})

bot.on('text', (ctx) => ctx.reply(
'Coming soon… Really soon, in a week or so.\nMeantime pick one from the April\'s playlist: https://www.youtube.com/playlist?list=PLui6Eyny-Uzy9eeFCGMO7dJNX4TZuQ1VM'
))


const { PORT = 5000, HOST, WEBHOOK_SECRET } = process.env

bot.telegram.setWebhook(`https://${HOST}/${WEBHOOK_SECRET}`)
bot.startWebhook(`/${WEBHOOK_SECRET}`, null, PORT)


