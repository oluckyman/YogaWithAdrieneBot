import { Extra } from 'telegraf'
import { Timestamp, DocumentReference } from '@google-cloud/firestore'
import type { Bot, BotMiddleware } from './models/bot'
import { getUser } from './utils'

// XXX: Don't forget, the title goes first
const title = 'Yoga is not all about fancy poses or sweating'
const letter = `

Dear Elias,
 
Your presence is a gift.
 
If you had a thought or inkling that - despite what western wellness culture has marketed to you - yoga is not in fact all about fancy poses or sweating actual bullets, but rather about a deep, deep listening, I am here to tell you that, I think you are right. 
 
Listen to the feedback that every gesture gives back to you. Rather than just _doing_ the poses, or _doing_ yoga, trust that practice really is an art of listening. 
 
Listening and responding…
 
With, yes, again you’re right, 
 
Your breath. 
 
You actually have a lot of wisdom within. 
 
A deep well. 
 
The practice I am sharing in this 30 Day Journey will help you uncover it, and embody it.

--

Our vocabulary grows today as we continue on our explorative journey, kicking it off with diaphragmatic breathing. 
 
Most people do not breathe as well as they can, and I do mean MOST. 
 
We continue with intentional and intuitive movement to improve our posture today, why? 
 
So you may breathe better, my dear. 
 
Re-training the posture is one of the best ways to ensure you are breathing deeply and efficiently.  
 
When we are breathing deeply and efficiently we invite a WHOLE WELL of benefits our way. 
 
More about those benefits tomorrow, for today, listen to your inner teacher.
 
That guru is _the one_. 
 
Love, 
Adriene
 
 
_Listen - are you breathing just a little, and calling it a life?_
_MARY OLIVER_  
`
const announcments: BotMiddleware = async (ctx, next) => {
  await next()
  // 0. if it was one of today commands
  if (ctx.state.command !== 'today') {
    return
  }
  await ctx.replyWithMarkdown(
    `💌 Day ${ctx.now.getDate() - 1}: *${title}*`,
    Extra.markdown().markup((m: any) => m.inlineKeyboard([m.callbackButton(`Show the letter`, 'cb:the_letter')]))
  )
}

const theLetterShow: BotMiddleware = async (ctx) => {
  const user = getUser(ctx)
  type UserData = { id: number; first_name: string }
  const userDoc = ctx.firestore.collection('users').doc(`id${user?.id}`) as DocumentReference<UserData>
  return userDoc.get().then(async (doc) => {
    if (!doc.exists) {
      console.info(`dunno this user ${user?.id}`)
      return
    }
    const { first_name = 'Love' } = doc.data() ?? {}
    const message = `💌 Day ${ctx.now.getDate() - 1}: *${title}*\n${letter.replace(/Elias/g, first_name)}`
    ctx.answerCbQuery()
    return ctx.editMessageText(
      message,
      Extra.markdown().markup((m: any) => m.inlineKeyboard([m.callbackButton('Hide', 'cb:the_letter_hide')]))
    )
  })
}

const theLetterHide: BotMiddleware = async (ctx) => {
  ctx.answerCbQuery()
  const message = `💌 Day ${ctx.now.getDate() - 1}: *${title}*`
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
//           // eslint-disable-next-line no-irregular-whitespace
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
