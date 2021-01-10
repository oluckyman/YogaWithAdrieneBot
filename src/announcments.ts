import { Extra } from 'telegraf'
import { Timestamp, DocumentReference } from '@google-cloud/firestore'
import type { Bot, BotMiddleware } from './models/bot'
import { getUser } from './utils'

// XXX: Don't forget, the title goes first
const title = 'Learn the process of centering yourself'
const letter = `
Dear Elias,
 
We ease in to practice today with a breath technique that can help balance out the brain and body. 

 
This particular technique takes a second to get down, so be patient with yourself, but once you have this breath in your toolkit, oh baby.
 
Alternate Nostril Breathing, also called Nadhi Shodana, is an incredible tool for activating the parasympathetic nervous system which can restore balance - particularly if you are consciously, or subconsciously, living more in fight or flight mode - which is common in such uncertain times. 
 
If it feels almost impossible to drop into practice, this is a great tool to guide you in, improving the mind’s ability to focus and sometimes almost immediately helping you notice how you feel energetically. The energetic body can often go unnoticed. We don’t even realize we are quite off balance until things are so bad they begin to show up in a more harsh or glaring way.
 
Practices such as yoga and breath techniques, like Nadhi Shodhana, offer us a way to better keep in alignment. 
 
As with other techniques in this series this breath also supports your lungs and respiratory functions.

--

Today we introduce the powerful play of opposites in yoga asana as well, considering the ways in which we may join steadiness, or STHIRA, with ease, or SUKHA.
 
I guide postures today that are there not to discourage you, but to help you play with the concept of how to create a dance for **both** steadiness and ease, and one that is individual for **you**. 
 
I invite you to use this material to check in, learn, and grow. 
 
Remember, it’s not about being able to stand on one foot. 
 
**Learn the process of centering yourself, and remember, it’s a process.**
 
If you fall, I will catch you.
 
You got this.
 
Love, 
Adriene
 
 
PS:  [I have a whole video on Alternate Nostril Breathing](https://www.youtube.com/watch?v=8VwufJrUhic&feature=youtu.be)  if you wish for a full tutorial! It is from 2014, baby Adriene, please forgive the lime green walls as that was before I convinced my landlord to allow me to re-paint. 
`
const announcments: BotMiddleware = async (ctx, next) => {
  await next()
  // 0. if it was one of today commands
  if (ctx.state.command !== 'today') {
    return
  }
  await ctx.replyWithMarkdown(
    `💌 Day ${ctx.now.getDate() - 1}: *${title}*`,
    Extra.notifications(false)
      .markdown()
      .markup((m: any) => m.inlineKeyboard([m.callbackButton(`Show the letter`, 'cb:the_letter')]))
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
    const { first_name = 'Friend' } = doc.data() ?? {}
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
