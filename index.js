const _ = require('lodash')
const YAML = require('json-to-pretty-yaml')
const dotenv = require('dotenv')
const Telegraf = require('telegraf')
const fs = require('fs').promises

dotenv.config()
const bot = new Telegraf(process.env.BOT_TOKEN)

const calendarImageUrl = 'https://yogawithadriene.com/wp-content/uploads/2020/03/Apr.-2020-Yoga-Calendar.png'
const calendarYWAUrl = 'https://yogawithadriene.com/calendar/'
const calendarYouTubeUrl = 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzy9eeFCGMO7dJNX4TZuQ1VM'

bot.catch((err, ctx) => {
  console.error(`⚠️ ${ctx.updateType}`, err)
})

bot.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  if (_.get(ctx.update, 'message.from.id') != process.env.ADMIN_ID) {
    console.log('------------------')
    console.info(ctx.update)
    // Log the message
    const toChat = process.env.LOG_CHAT_ID
    if (ctx.update.message) {
      const fromChat = ctx.update.message.chat.id
      const messageId = ctx.update.message.message_id
      ctx
        .forwardMessage(toChat, fromChat, messageId, { disable_notification: true })
        .then(res => {
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
          ctx.telegram.sendMessage(toChat, `<b>@${username || first_name}: ${text}</b>\n${html}`, { disable_notification: true, parse_mode: 'html' })
        })
    } else {
      const html = YAML.stringify(ctx.update)
      ctx.telegram.sendMessage(toChat, `It's not a message🤔\n${html}`, { disable_notification: true })
    }
    console.log('Response time: %sms', ms)
  } else { console.log('👨‍💻 me working…') }
})


bot.command('/start', ctx => {
  const greetings = [
    [0.0, '👋 _Hello my darling friend!_'],
    [2.2, 'This bot is designed to */help* you maintain your *daily* yoga practice.'],
    [3.5, 'It gives you */today*’s video from *YWA /calendar*.'],
    [4.0, 'No distractions. No paradox of choice.'],
    [3.0, '_Less_ is _more_.'],
    [3.0, 'With _less_ friction the are _more_ chances your healthy habit will *thrive*.'],
    [4.0, 'So, _hope on something comfy and let’s get started!_'],
    [3.0, 'Send */today* command to get the video.'],
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


// @BotFather: help - See what this bot can do for you
bot.command('/help', ctx => {
  ctx.replyWithHTML(`
<b>Yoga With Adriene</b> bot helps you get yoga videos without friction and distractions.

<b>Commands</b>
• <b>/today</b>’s video from the calendar ▶️
• <b>/calendar</b> of the month and YouTube playlist 🗓
• <b>/help</b> — <i>shows this message</i>📍

👋 <i>Say hi to <a href="t.me/oluckyman">the author</a></i>
`, { disable_web_page_preview: true })
// • <b>/about</b> this bot and Yoga With Adriene 🤔
})


// @BotFather: today - Get today’s video from the yoga calendar
bot.command('/today', async ctx => {
  const messages = [
    'Spend your time _practicing_ yoga rather than _choosing_ it',
    'Give your time to _YourSelf_ rather than to _YouTube_',
    '_Find what feels good_',
  ];
  const day = new Date().getDate()
  ctx.replyWithMarkdown(_.sample(messages))
    .then(() => fs.readFile('calendar.json', 'utf8'))
    .then(txt => JSON.parse(txt))
    .then(json => {
      const url = json[day - 1].videoUrl
      ctx.replyWithMarkdown(`▶️ *Day ${day}* ${url}`)
    })
})


// @BotFather: calendar - Review the month’s calendar
bot.command('/calendar', ctx => {
  const day = new Date().getDate()
  ctx.replyWithPhoto(calendarImageUrl, { caption: `*/today* is *Day ${day}*\n • [YWA calendar](${calendarYWAUrl})\n • [YouTube playlist](${calendarYouTubeUrl})`, parse_mode: 'markdown' })
})

bot.telegram.setMyCommands([{
  command: 'today', description: 'Get today’s video from the yoga calendar'
}, {
  command: 'calendar', description: 'Review the month’s calendar'
}, {
  command: 'help', description: 'See what this bot can do for you'
}])

// bot.on('text', (ctx) => ctx.replyWithMarkdown('Hmm… Not sure what do you mean 🤔\nTry */today* or check out */help*'))
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
