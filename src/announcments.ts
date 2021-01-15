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
  'A fun and therapeutic session for you', // 14
]
const letter = `
Dear Elias,

We focus on creating sensation and space in the body, learning to breathe and move with efficiency, mindfulness, and even sometimes joy - so that when we step off the mat we can continue that practice.

This way we may proceed to learn and _live_ with more ease.

This way we have proper energy in the tank to _serve others_ more fully.

Your day 14 practice is a fun and **therapeutic session** with full conscious breath to guide the way.

We are approaching the halfway mark!

If you would like, take some time to write about how you are feeling (physically, mentally, and emotionally) after experiencing the first 14 days of this 30 Day BREATH Journey.

--

Don’t forget! If you would like, **take some time to write a few words down** before you begin tomorrow’s practice!

Here are four writing prompts that may help you:

**So far my experience is best described as….**

**I am learning to honor…**

**I am learning to celebrate....**

**I felt/I am feeling…**


I hope you have a beautiful Day 14.

This is your time, this is your practice. Take up space, darling. You are so worthy of it all.

I will see you tomorrow.

Love,
Adriene


_When I moved from one house to another_
_there were many things I had no room for._
_What does one do? I rented a storage_
_space. And filled it. Years passed._
_Occasionally I went there and looked in,_
_but nothing happened, not a single_
_twinge of the heart._
_As I grew older the things I cared_
_about grew fewer, but were more_
_important. So one day I undid the lock_
_and called the trash man. He took_
_everything._
_I felt like the little donkey when_
_his burden is finally lifted. Things!_
_Burn them, burn them! Make a beautiful_
_fire! More room in your heart for love,_
_for the trees! For the birds who own_
_nothing– the reason they can fly._

_STORAGE by MARY OLIVER_
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
