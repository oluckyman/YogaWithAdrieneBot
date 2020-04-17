const _ = require('lodash')
const YAML = require('json-to-pretty-yaml')
const dotenv = require('dotenv')
const Telegraf = require('telegraf')
const fs = require('fs').promises

dotenv.config()
const bot = new Telegraf(process.env.BOT_TOKEN)


bot.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  if (_.get(ctx.update, 'message.from.id') != process.env.ADMIN_ID) {
    console.log('------------------')
    console.info(ctx.update)
    // Log the message
    if (ctx.update.message) {
      const toChat = process.env.LOG_CHAT_ID
      const fromChat = ctx.update.message.chat.id
      const messageId = ctx.update.message.message_id
      ctx
        .forwardMessage(toChat, fromChat, messageId, { disable_notification: true })
        .then(res => {
          const username = ctx.update.message.from.username
          const html = YAML.stringify(ctx.update.message)
          ctx.telegram.sendMessage(toChat, `@${username}\n${html}`, { disable_notification: true })
        })
    }
    console.log('Response time: %sms', ms)
  } else { console.log('👨‍💻 me working…') }
})


bot.command('/start', ctx => {
  const greetings = [
    [0.0, '👋 _Hello my darling friend!_'],
    [2.2, 'This bot is designed to */help* you maintain your *daily* yoga practice.'],
    [3.5, 'It gives you */today’s* video directly from *YWA /calendar*.'],
    [4.0, 'No distractions. No paradox of choice.'],
    [3.0, '_Less_ is _more_.'],
    [3.0, 'With _less_ friction the are _more_ chances your healty habit will *thrive*.'],
    [4.0, 'So, _hope on something comfy and let’s get started!_'],
    [3.0, 'Send */today* command to get the video.'],
    // [3.5, 'Meantime, pick some video from the playlist:\nhttps://www.youtube.com/playlist?list=PLui6Eyny-Uzy9eeFCGMO7dJNX4TZuQ1VM'],
  ]
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

<b>Commands</b>
<b>/today</b> Today’s video from <a href="https://yogawithadriene.com/calendar/">the calendar 📅</a>
<b>/help</b> This message🙊

👋 <i>Say hi to <a href="t.me/oluckyman">the author</a></i>
`, { disable_web_page_preview: true })
})


bot.command('/today', async ctx => {
  const day = new Date().getDate()
  ctx.replyWithMarkdown(`Looking the video for *Day ${day}*`)
    .then(() => fs.readFile('calendar.json', 'utf8'))
    .then(txt => JSON.parse(txt))
    .then(json => {
      const url = json[day - 1].videoUrl
      ctx.reply(`▶️ ${url}`)
    })
})


bot.command('/calendar', ctx => {
  ctx.replyWithMarkdown(`⏳ _Coming soon…_`)
})


bot.on('text', (ctx) => ctx.replyWithMarkdown('Hmm… Not sure what do you mean 🤔\nTry */today* or check out */help*'))
// Or just keep writing whatever on your mind. I'll consider it as feedback.
// Got it. • Ok • Roger that • ...


const { PORT = 5000, HOST, WEBHOOK_SECRET, NODE_ENV = 'production' } = process.env

if (NODE_ENV === 'production') {
  bot.launch({
    webhook: {
      domain: `https://${HOST}/${WEBHOOK_SECRET}`,
      port: PORT
    }
  })
  console.info("Launch webhook 🚀")

  // Prevent app from sleeping
  const request = require('request');
  const ping = () => request(`https://${HOST}/ping`, (error, response, body) => {
      error && console.log('error:', error);
      body && console.log('body:', body);
      setTimeout(ping, 1000 * 60 * 25)
  });
  console.log('Ping myself 👈')
  ping()
} else {
  bot.launch()
  console.info("Launch polling 🚀")
}
