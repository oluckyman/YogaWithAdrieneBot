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
]
const letter = `
Dear Elias,
 
Connecting to your breath is a real love connection for me.
 
It can be as simple as tuning in to listen to the sound of the breath, to anchor a busy mind. 
 
It can be about getting still and noticing the quality of your breath in the moment. 
 
It can also be an opportunity to connect to something bigger, much larger than your brain or body, but perhaps a reflection of an energy, or a greater spirit.
 
Whatever it may be like for you today, know that it may be different for your tomorrow. 
 
Or the way in which you may connect to the breath at the beginning of a practice, may feel different by the end.
 
May you enjoy connecting the dots of each present moment today in practice… via your breath.

--

Taking the elements of Sthira (steadiness) and Sukha (ease) - we move from awareness of breath into the second stage of this journey. 
 
Ready to go to the next level?
 
I believe you are!
 
Remember this is time for you to get to know yourself better, stay curious about your truth.
 
**It is uniquely yours.**
 
21 minutes today to connect. 
 
I think you will really like today’s practice.
 
Because while the journey can be challenging,
 
Connection can feel _really good._
 
Let’s go.
 
 
Yours, 
Adriene 
 
 
PS:  [Boot Scootin’ Boogie for your reference.](https://www.youtube.com/watch?v=OyWTyVaF5Uc&feature=youtu.be) 
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
