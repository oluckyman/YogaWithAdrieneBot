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
]
const letter = `
Dear Elias,
 
The breath is a dear friend that you can drop into conversation with anytime, anywhere. 
 
The quality of that conversation will change from moment to moment, day to day, week to week, year to year.
 
The awareness of this ongoing conversation might change your life. 
 
It did mine. 
 
With a strong theme to help you **drop into a more conscious conversation with the breath**, this session also invites you to drop expectations of what you think yoga is, or should be.
 
We begin to explore today’s theme at the start of practice with a breath technique that may feel difficult, as this may be a brand new way of breathing for you.
--
Gently dropping your ties to the exterior and taking time for yourself is not selfish. 
 
**When you arrive on the mat remember you are there to experience your body, and your breath. You are there to snuggle up to your truth, what feels like home, what feels honest.**
 
You may work today to release stress or worries, allowing yourself to be present in this process for the short time we are on our mat. This is our shortest session yet, at 18 minutes.
 
Take the time to drop in. 
 
YOU ARE DOING GREAT!
 
Yours, 
Adriene
 
 
_I will follow my instincts, be myself for good or ill, and see what will be the upshot._
_As long as I live, I'll hear waterfalls and birds and winds sing. I'll acquaint myself with the glaciers and wild gardens, and get as near the heart of the world as I can._
_JOHN MUIR_
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
