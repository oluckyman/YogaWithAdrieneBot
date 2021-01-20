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
  '', // 15
  'I choose to show up for myself for the next 15 days.', // 15
]
const letter = `
Dear Elias,
 
The discipline of showing up, 
 
The practice of drawing your attention inward. 
 
This is what we are committed to. 
 
We are slowing things down today as we begin the second half of this journey.
 
I will introduce some foundational elements for the next wave of this journey, as well as offer practice of a new technique called **breath ratio**.
 
Breath ratios are breath patterns set to counts. They are a wonderful tool for expanding your awareness and ability to control your breath.
 
They are also full of transformative potential and wonderful to pull out of your tool kit when you are feeling mentally, physically, or emotionally stressed or lost.  
 
They can be short, or long, but they do require a bit of focus and yes you guessed it…. discipline.
- - - -
If you need to write the following out on a napkin, mirror, or in your journal today  - 
 
Do it. 
 
**I choose to show up for myself for the next 15 days.**
 
As we focus on the discipline of yoga today, remember to take your time settling in each time you come to the mat. This is productive. Returning to your breath and to your body with careful attention and deep presence is not meant to be done with a flip of a switch or just by pressing play.
 
_Remember this is a practice, this is a process. We are here to learn._
 
Whatever you are bringing to the mat today, it's all good.
 
This whole session is low to the ground with a nice therapeutic breath for the arms, shoulders, and wrists. As it is seated, do sit up on your blanket if you have one. If you need to do some or all this practice in a chair or on the edge of a couch, do it. 
 
Our theme for today is discipline. An important one as we go deeper in our studies of yoga and as you continue to show up, gifting yourself with the opportunity for valuable self study and transformation. 
 
This practice is one in which you are invited to come as you are. 
 
All the things that you may see as distractions or things that are not working in your favor... **use it**. 
 
Enjoy your time on the mat today! 
 
It is a classroom, designed to support you and help you feel good. 
 
Yours, 
Adriene
 
 
 
 
_This morning I watched the deer_
_with beautiful lips touching the tips_
_of the cranberries, setting their hooves down_
_in the dampness carelessly, isn’t it after all_
_the carpet of their house, their home, whose roof_
_is the sky?_
_Why, then, was I suddenly miserable?_
_Well, this is nothing much._
_This is the heaviness of the body watching the swallows_
_gliding just under that roof._
_This is the wish that the deer would not lift their heads_
_and leap away, leaving me there alone._
_This is the wish to touch their faces, their brown wrists—_
_to sing some sparkling poem into_
_the folds of their ears,_
_then walk with them,_
_over the hills_
_and over the hills_
_and into the impossible trees._
 
_This Morning I Watched the Deer_
_By MARY OLIVER_

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
  // bot.use(announcments)
  // bot.action('cb:the_letter', theLetterShow)
  // bot.action('cb:the_letter_hide', theLetterHide)
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
