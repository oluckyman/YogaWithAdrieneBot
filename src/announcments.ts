import { Extra } from 'telegraf'
import { Timestamp, DocumentReference } from '@google-cloud/firestore'
import type { Bot, BotMiddleware } from './models/bot'
import { getUser } from './utils'

const titles = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  'Learn the process of centering yourself', // 9
  'Ready to go to the next level?', // 10
  'A new layer of sensory experience on the mat', // 11
  'Awareness of this conversation can be life changing', // 12
  'The most important aspect to focus on', // 13
]
const letter = `
Dear Elias,

The most important aspect to focus on when it comes to the home yoga practice in particular, is not that of perfect timing, ideal energy levels, or fancy gear.

**It is that you are taking the time to check in each day to connect to your self and your source.**

**To me, this is a beautiful, complete, and highly productive act of self love and self care.**

Each day is going to look and feel a little different.

Keep this in mind as we continue to progress on this journey.

What matters most is that you keep showing up, keep checking in, and keep dropping into conscious conversation with your breath.

Building on yesterday, we keep our discipline but explore how we may “drop the doing” and _Find What Feels Good_.

When we feel good in our bodies, when we feel good about ourselves on the mat, the way we experience our life off the mat and with others can shift drastically.

Lucky Day 13 invites you to let go of any quest for mastery or your desire to _get it right_, and instead focus on what it feels like in your body and on your soul’s journey as you breathe and move through your practice today.
--
While we want to continue to be mindful and disciplined about our alignment and action - **when we begin to allow ourselves to make intuitive decisions based on how we feel** - our experience on the mat can really feel like one that serves and supports the real you.

You may begin to observe this practice show up off the mat too.

Perhaps you may notice less interest in adhering to others’ ideas of what you could, or should, be doing - grounded in listening to and embodying what feels like yourself, what feels good.

_You feeling it?_

I am so honored and happy to be on this journey with you. Thank you so much for sharing your practice with me.

Sincerely,
Adriene


PS: I am following along with the hashtag #ywaBreath and  [living for your comments on YouTube](https://www.youtube.com/c/yogawithadriene/videos) . So inspiring and so beautiful. Thank you!
`
const announcments: BotMiddleware = async (ctx, next) => {
  await next()
  // 0. if it was one of today commands
  if (ctx.state.command !== 'today') {
    return
  }
  const day = ctx.now.getDate() - 1
  const title = titles[day]
  if (title) {
    return ctx.replyWithMarkdown(
      `💌 Day ${day}: *${title}*`,
      Extra.notifications(false)
        .markdown()
        .markup((m: any) => m.inlineKeyboard([m.callbackButton(`Show the letter`, 'cb:the_letter')]))
    )
  }
  return ctx.replyWithMarkdown(`💌 Remember to read the letter`)
}

const theLetterShow: BotMiddleware = async (ctx) => {
  const user = getUser(ctx)
  type UserData = { id: number; first_name: string }
  const userDoc = ctx.firestore.collection('users').doc(`id${user?.id}`) as DocumentReference<UserData>
  const day = ctx.now.getDate() - 1
  const title = titles[day]
  return userDoc.get().then(async (doc) => {
    if (!doc.exists) {
      console.info(`dunno this user ${user?.id}`)
      return
    }
    const { first_name = 'Friend' } = doc.data() ?? {}
    const message = `💌 Day ${day}: *${title}*\n${letter.replace(/Elias/g, first_name)}`
    ctx.answerCbQuery()
    return ctx.editMessageText(
      message,
      Extra.markdown().markup((m: any) => m.inlineKeyboard([m.callbackButton('Hide', 'cb:the_letter_hide')]))
    )
  })
}

const theLetterHide: BotMiddleware = async (ctx) => {
  ctx.answerCbQuery()
  const day = ctx.now.getDate() - 1
  const title = titles[day]
  const message = `💌 Day ${day}: *${title}*`
  return ctx.editMessageText(
    message,
    Extra.markdown().markup((m: any) => m.inlineKeyboard([m.callbackButton('Show', 'cb:the_letter')]))
  )
}

const useAnnouncments = (bot: Bot): void => {
  bot.use(announcments)
  bot.action('cb:the_letter', theLetterShow)
  bot.action('cb:the_letter_hide', theLetterHide)
}

// const announcments_May_Monthly_Calendar: BotMiddleware = async (ctx, next) => {
//   await next()
//   try {
//     // 0. if it was one of today commands
//     if (ctx.state.command !== 'today') {
//       return
//     }
//     console.info(`Checking if I should send a link to chart to user?`)

//     // TODO: need a bullet-proof get-user method
//     const user = getUser(ctx)

//     // 1. get user doc by user.id
//     type UserData = {
//       id: number
//       yogi: string
//       message_sent_at: Timestamp
//       first_name: string
//     }
//     const userDoc = ctx.firestore.collection('users').doc(`id${user?.id}`) as DocumentReference<UserData>
//     await userDoc.get().then(async (doc) => {
//       if (!doc.exists) {
//         console.info(`dunno this user ${user?.id}`)
//         return // TODO: what async and what not?
//       }
//       const { yogi, message_sent_at, first_name } = doc.data() ?? {}

//       // 2. see if the doc has yogi field and message was not sent
//       if (!yogi) {
//         console.info(`${first_name} not a regular user in May`)
//         return
//       }
//       if (message_sent_at) {
//         console.info(`${first_name} already received the message at`, message_sent_at.toDate())
//         return
//       }

//       // 3. Send the link
//       let linkSeen = false
//       try {
//         await pauseForA(2)
//         await ctx.reply(`👋 Hey, ${first_name}! One more thing…`)
//         await pauseForA(2)
//         await ctx.reply(`You might be interested to see what the last month looked like from the bot’s perspective.`)
//         await pauseForA(3)
//         await ctx.replyWithMarkdown(
// eslint-disable-next-line no-irregular-whitespace
//           `Check out the [Yoga Calendar Effect](https://yoga-calendar-effect.now.sh/?yogi=${yogi}) chart.\nYou’re part of it too!`
//         )
//         linkSeen = true

//         // 4. save message sent date
//         await userDoc.update({
//           message_sent_at: new Date(),
//         })

//         console.info(`link sent to ${first_name} (yogi=${yogi})`)
//         const linkSentMessage = `${first_name} have received https://ywa-calendar-may-2020.now.sh/?yogi=${yogi}`
//         await ctx.telegram.sendMessage(process.env.LOG_CHAT_ID, linkSentMessage)
//       } catch (e) {
//         await reportError({
//           ctx,
//           where: `yogi message, linkSeen: ${linkSeen}, yogi: ${yogi}`,
//           error: e,
//           silent: true,
//         })
//       }
//     })
//     return Promise.resolve()
//   } catch (e) {
//     console.error('🐛 In announcement logic', e)
//     return reportError({
//       ctx,
//       where: 'announcement middleware',
//       error: e,
//       silent: true,
//     })
//   }
// }

export default useAnnouncments
