import { Extra } from 'telegraf'
import { DocumentReference } from '@google-cloud/firestore'
import type { Bot, BotMiddleware } from './models/bot'
import { pauseForA, getUser, reportError } from './utils'

const announcments: BotMiddleware = async (ctx, next) => {
  await next()
  // Tell about calendar command
  try {
    // 0. if it was calendar command
    if (ctx.state.command !== 'calendar') {
      return
    }
    console.info(`Checking if I should tell about day number command?`)

    // TODO: need a bullet-proof get-user method
    const user = getUser(ctx)

    // 1. get user doc by user.id
    type UserData = {
      id: number
      calendar_command_count: number | undefined
      first_name: string
    }
    const userDoc = ctx.firestore.collection('users').doc(`id${user?.id}`) as DocumentReference<UserData>
    await userDoc.get().then(async (doc) => {
      if (!doc.exists) {
        console.info(`dunno this user ${user?.id}`)
        return // TODO: what async and what not?
      }
      const { calendar_command_count = 0, first_name } = doc.data() ?? {}

      const secretThreshold = 3
      // 2. see if the doc has yogi field and message was not sent
      if (calendar_command_count !== secretThreshold) {
        console.info(`${first_name} used Calendar ${calendar_command_count} of ${secretThreshold} to by notified`)
      } else {
        console.info(`Yep, tell the secret command`)
        try {
          await pauseForA(1)
          await ctx.replyWithMarkdown(
            `👋 Hey, ${first_name}\nYou can get a video for any day of the month. Just type the day number in the chat. E.g. "\`17\`"`,
            // Extra.notifications(false) as any
          )
          ctx.state.logQueue = [...(ctx.state.logQueue || []), `${first_name} got the secret`]
        } catch (e) {
          await reportError({
            ctx,
            where: `psst message: user: ${user?.first_name}`,
            error: `${e}`,
            silent: true,
          })
        }
      }
      // save calendar command count
      await userDoc.update({
        calendar_command_count: calendar_command_count + 1,
      })
    })
  } catch (e) {
    console.error('🐛 In announcement logic', e)
    return reportError({
      ctx,
      where: 'announcement middleware',
      error: `${e}`,
      silent: true,
    })
  }
  return Promise.resolve()
}

const useAnnouncments = (bot: Bot): void => {
  bot.use(announcments)
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
