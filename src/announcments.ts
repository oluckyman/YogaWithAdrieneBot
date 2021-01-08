import { Extra } from 'telegraf'
import { Timestamp, DocumentReference } from '@google-cloud/firestore'
import type { Bot, BotMiddleware } from './models/bot'
import { getUser } from './utils'

// XXX: Don't forget, the title goes first
const title = 'You should feel proud!'
const letter = `
Dear Elias,
 
Today marks one week of BREATH practice.
 
How about we take a breath right now?
 
Lift your heart, relax your shoulders, and let’s celebrate one week together. 
 
This program has depth. It asks you to sustain curiosity and extend a kindness to yourself that maybe you are not used to.  
 
It asks you to show up, even when you don’t feel like it, or when it feels like the day is conspiring against you.
 
You should feel proud! One week of showing up for yourself in this manner is no small feat. 
 
Today’s session invites you to feel the love that you are and that you deserve. We commemorate week one and phase one of this journey with a yummy vinyasa practice.
 
For a breakdown of the word _vinyasa_ and what it truly means, you might like to check out  this  [“What is Vinyasa?” video that I made in… 2015.](https://www.youtube.com/watch?v=cQ69bxW0DN4&feature=youtu.be) 
 
Your Day 7 practice includes some gentle and delicious dynamic movement to help you continue to free your spine, ribs, shoulders, and neck.

--

Synchronize your watch, your heart, your brain, and your movement to your breath.

I am here to remind you that you are worthy. It is a total honor to be your guide and your cheerleader on this journey. 

Tomorrow begins week two! 

Our quest for conscious breath continues with a very relaxing and supportive DAY 8. (Bring a blanket and a pillow to _snuggle_ with, if you have them. No worries if not.)
 
 
Sincerely, 
Adriene
 
PS: The  [BREATH POP UP SHOP](https://yoga-with-adriene.teemill.com/?from=YogaWithAdrieeBot)  is live as we enter week two!
Per your request, we have created a collection of limited edition **Yoga with Adriene** pieces for you - printed on zero waste natural fibers to celebrate your experience! 
All items in this shop are custom made for this journey, designed by independent artists I love, packaged **without plastic**, and ship most everywhere! 
 [Click here to view the Breath Pop Up Shop and learn more!](https://yoga-with-adriene.teemill.com/?from=YogaWithAdrieeBot) 

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
