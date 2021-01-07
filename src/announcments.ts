import { Extra } from 'telegraf'
import { Timestamp, DocumentReference } from '@google-cloud/firestore'
import type { Bot, BotMiddleware } from './models/bot'
import { getUser } from './utils'

// XXX: Don't forget, the title goes first
const title = 'Begin where you are today'
const letter = `
Dear Elias,
 
Day 6 is here, and it is a 30 Days Of Yoga tradition that on day 6 we focus on the core.
 
Core centric practices are great for toning muscles that support strong and optimal function (read - less back pain) and, let me just get this out of the way, you will be working all of your abs into a fine fiery burn. 
 
But this type of work can also be really healing and centering. 
 
Remember, this is a process of self discovery. 
 
In my 30 day programs, Day 6 practices offer the opportunity to peel back another layer of connecting to who you are today, and what is serving **now**.
 
Think of how many versions of your self you have been throughout your lifetime.
 
A breath centric practice is one in which you are meeting yourself where you are today. 
 
Core work, similar to balancing postures, encouraging you to take stock and embody the present moment as a way of creating sustainable strength and stamina. 
 
While it can sometimes feel discouraging, it is most necessary that you take on the task of beginning where you are today. This is how we evolve, it’s how we learn to know ourselves better, and it is how we get stronger.
 
Today’s practice begins with a powerful pranayama, or breath technique, called the Breath Of Fire. 
 
This breath technique comes with loads of benefits for long term health, and will also supply us with the energy and focus we may need for today’s core conditioning. 
 
Breath Of Fire, also known as Kapalabhati, is a rhythmic cleansing breath that offers the respiratory system some major love. To get a full breakdown on Breath Of Fire,  [you may watch my tutorial here](https://www.youtube.com/watch?v=jbtLH-3DfLc&feature=youtu.be) . Again, fair warned, it is from Halloween 2014. 

--

Today’s session is great for the beginner, but also good for a long term practitioner who may be ready to assess what in their practice once served but may no longer be serving today. _Noticing this could lead to uncovering deeper layers, and a newfound sense of joy whilst doing hard things._
 
**Notice what it feels like to be alive today.**
 
**Burn away that which no longer serves.**  
 
Today is a fun one, I will meet you there. 
  
Yours, 
Adriene
 
_Through love burning fire is pleasing light._
_RUMI_
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
