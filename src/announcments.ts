import { Extra } from 'telegraf'
import { Timestamp, DocumentReference } from '@google-cloud/firestore'
import type { Bot, BotMiddleware } from './models/bot'
import { getUser } from './utils'

// XXX: Don't forget, the title goes first
const title = 'Snuggle up to the role of the observer.'
const letter = `
Dear Elias,
 
Who wants to snuggle? 
(Besides Benji.)
 
Bring an extra blanket or towel and a pillow to the mat today for this restorative practice. 
 
If you don’t have any of these things, don’t worry, just come as you are and it will still be really snuggly. 
 
Wear something extra comfy! 
 
Lay an extra blanket down if you like, and let’s snuggle up to the sensation and rhythm of the breath in today’s gentle floor practice. 
 
This session continues to help us learn about the philosophy of yoga too.  
 
For example, _snuggling up to the role of the observer_ has changed my whole life. 
 
Off the mat, this practice has allowed me to pause more, and notice my reaction before  I make a choice on how I want to consciously react to that emotional response. This has helped me to be a better listener, to move with more mindfulness, and to act with greater intention and purpose. 

--

Today’s practice is nice and slow and low to the ground. Medicine for the legs, the hips, the torso, and the spine. But also hopefully some feel good medicine for thine heart too. 
 
Don’t miss it. Get to that mat today.
 
I hope you enjoy!
 
With Love, 
Adriene
 
 
_The fox_
_is so quiet—_
_he moves like a red rain—_
_even when his_
_shoulders tense and then_
_snuggle down for an instant_
_against the ground_
_and the perfect_
_gate of his teeth_
_slams shut_
_there is nothing_
_you can hear_
_but the cold creek moving_
_over the dark pebbles_
_and across the field_
_and into the rest of the world—_
_and even when you find_
_in the morning_
_the feathery_
_scuffs of fur_
_of the vanished_
_snowshoe hare_
_tangled_
_on the pale spires_
_of the broken flowers_
_of the lost summer—_
_fluttering a little_
_but only_
_like the lapping threads_
_of the wind itself—_
_there is still_
_nothing that you can hear_
_but the cold creek moving_
_over the old pebbles_
_and across the field and into_
_another year._

_THE SNOWSHOE HARE, By MARY OLIVER_
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
