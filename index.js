const _ = require('lodash')
const YAML = require('json-to-pretty-yaml')
const dotenv = require('dotenv')
const Telegraf = require('telegraf')
const Markup = require('telegraf/markup')
const Extra = require('telegraf/extra')
const { timeFormat } = require('d3-time-format')

const fs = require('fs').promises
dotenv.config()

const Firestore = require('@google-cloud/firestore')
const firestore = new Firestore({
  projectId: process.env.GOOGLE_APP_PROJECT_ID,
  credentials: {
    private_key: process.env.GOOGLE_APP_PRIVATE_KEY.split('\\n').join('\n'),
    client_email: process.env.GOOGLE_APP_CLIENT_EMAIL,
  }
})

const setFirstContact = ({ user }) => {
  const userDoc = firestore.collection('users').doc(`id${user.id}`)
  userDoc.get().then(doc => {
    if (!doc.exists) {
      userDoc.set({
        ...user,
        first_contact_at: new Date()
      })
    }
  })
}

const logEvent = update => {
  return firestore.collection('logs').add(update)
}

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
  const isAdmin = [
      _.get(ctx.update, 'message.from.id'),
      _.get(ctx.update, 'callback_query.from.id'),
    ].includes(+process.env.ADMIN_ID)
  if (!isAdmin) {
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
    await logEvent(ctx.update)
    console.log('Response time: %sms', ms)
  } else { console.log('👨‍💻 me working…') }
})


bot.command('/start', async ctx => {
  const greetings = [
    [0.0, '👋 _Hello my darling friend!_'],
    [2.2, 'This bot is designed to */help* you maintain your *daily* yoga practice.'],
    [3.5, 'It gives you */today*’s yoga video from *YWA /calendar*.'],
    [4.0, 'No distractions. No paradox of choice.'],
    [3.0, '_Less_ is _more_.'],
    [3.0, 'With _less_ friction the are _more_ chances your healthy habit will *thrive*.'],
    [4.0, 'So, _hope on something comfy and let’s get started!_'],
    // [3.0, 'Send */today* command to get the video or just push the button'],
  ]
  const sendGreeting = i => {
    if (i >= greetings.length) return
    const message = greetings[i][1]
    const delaySec = _.get(greetings, [i + 1, 0])
    const isLastMessage = i === greetings.length - 1
    ctx
      .reply(message, Extra.markdown()
        .markup(m => isLastMessage ?
          m.inlineKeyboard([m.callbackButton('▶️ Get today’s yoga video', 'cb:today')]) : m
        )
      )
      .then(() => {
        if (delaySec !== undefined) {
          setTimeout(() => sendGreeting(i + 1), delaySec * 1000)
        }
      })
  }
  sendGreeting(0)
  setFirstContact({
    user: _.get(ctx.update, 'message.from'),
  })
});


const menu = {
  today: '▶️ Today’s yoga video',
  calendar: '🗓 Calendar',
  help: '💁 Help',
}

const replyHelp = ctx => ctx.replyWithHTML(`
<b>Yoga With Adriene</b> bot helps you get yoga videos without friction and distractions.

<b>Commands</b>
• <b>/today</b>’s video from the calendar ▶️
• <b>/calendar</b> of the month and YouTube playlist 🗓
• <b>/help</b> — <i>shows this message</i>📍

👋 <i>Say hi to <a href="t.me/oluckyman">the author</a></i>
`, Extra.webPreview(false))
// • <b>/about</b> this bot and Yoga With Adriene 🤔
bot.hears(menu.help, replyHelp)
bot.command('/help', replyHelp)



const oneOf = messages => _.sample(_.sample(messages))

async function replyToday(ctx) {
  const messages = [
    ['💬 Spend time _practicing_ yoga rather than _picking_ it'],
    ['💬 Give time to _YourSelf_ rather than to _YouTube_'],
    ['💬 _Let us postpone nothing. Let us balance life’s account every day_'],
    ['😌 _Find what feels good_'],
    ['🐍 _Long healthy neck_'],
    ['🧘‍♀️ _Sukhasana_ – easy pose'],
    [...'🐌🐢'].map(e => `${e} _One yoga at a time_`),
    [...'🐌🐢'].map(e => `${e} _Little goes a long way_`),
  ];
  const [msg] = await Promise.all([
    ctx.replyWithMarkdown(oneOf(messages)),
    pauseForA(2) // give some time to read the message
  ])
  const month = timeFormat('%m')(new Date())
  const day = new Date().getDate()
  const url = await fs.readFile(`calendars/${month}.json`, 'utf8')
    .then(txt => JSON.parse(txt))
    .then(json => json[day - 1].videoUrl)
  ctx.replyWithMarkdown(`▶️ *Day ${day}* [${url}](${url})`, Extra.markup(menuKeboard))
}
bot.command('/today', replyToday)
bot.hears(menu.today, replyToday)
bot.action(/cb:today/, ctx => {
  ctx.answerCbQuery('Looking for today’s video…')
  // ctx.editMessageReplyMarkup() // remove the button
  replyToday(ctx)
})



const replyCalendar = ctx => ctx.replyWithPhoto(calendarImageUrl, Extra
  .caption(`*/today* is *Day ${new Date().getDate()}*`)
  .markdown()
  .markup(m => m.inlineKeyboard([
    m.urlButton('YWA Calendar', calendarYWAUrl),
    m.urlButton('YouTube playlist', calendarYouTubeUrl),
  ], { columns: 1 }))
)
bot.command('/calendar', replyCalendar)
bot.hears(menu.calendar, replyCalendar)



const praise = new RegExp('[👍❤️]')
const thanksMessages = [
  [...'😌😛'], // smiles
  [...'🥰💚🤗'], // love
  [...'🙏👌'], // gestures
]
async function replyThankYou(ctx) {
  await pauseForA(2)
  return ctx.replyWithMarkdown(oneOf(thanksMessages))
}
bot.hears(praise, replyThankYou)



// bot.on('text', (ctx) => ctx
//   .replyWithMarkdown('Hmm… Not sure what do you mean 🤔\nTry */today* or check out */help*', {
//     reply_markup: Markup
//       .keyboard(['/today'])
//       .resize()
//   }))



function menuKeboard(m) {
  return m.resize().keyboard([menu.today, menu.calendar, menu.help])
}

function pauseForA(sec) {
  return new Promise(r => setTimeout(r, sec * 1000))
}



bot.telegram.setMyCommands([{
  command: 'today', description: 'Get today’s video from the yoga calendar'
}, {
  command: 'calendar', description: 'Review the month’s calendar'
}, {
  command: 'help', description: 'See what this bot can do for you'
}])



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
