import { Timestamp, DocumentReference } from '@google-cloud/firestore'
import type { BotMiddleware } from './models/bot'
import { pauseForA, getUser } from './utils'

const announcments: BotMiddleware = async (ctx, next) => {
  await next()
  try {
    // 0. if it was one of today commands
    if (ctx.state.command !== 'today') {
      return
    }
    console.info(`Checking if I should send a link to chart to user?`)

    // TODO: need a bullet-proof get-user method
    const user = getUser(ctx)

    // 1. get user doc by user.id
    type UserData = {
      id: number
      yogi: string
      message_sent_at: Timestamp
      first_name: string
    }
    const userDoc = ctx.firestore.collection('users').doc(`id${user?.id}`) as DocumentReference<UserData>
    await userDoc.get().then(async (doc) => {
      if (!doc.exists) {
        console.info(`dunno this user ${user?.id}`)
        return // TODO: what async and what not?
      }
      const { yogi, message_sent_at, first_name } = doc.data() ?? {}

      // 2. see if the doc has yogi field and message was not sent
      if (!yogi) {
        console.info(`${first_name} not a regular user in May`)
        return
      }
      if (message_sent_at) {
        console.info(`${first_name} already received the message at`, message_sent_at.toDate())
        return
      }

      // 3. Send the link
      let linkSeen = false
      try {
        await pauseForA(2)
        await ctx.reply(`👋 Hey, ${first_name}! One more thing…`)
        await pauseForA(2)
        await ctx.reply(`You might be interested to see what the last month looked like from the bot’s perspective.`)
        await pauseForA(3)
        await ctx.replyWithMarkdown(
          // eslint-disable-next-line no-irregular-whitespace
          `Check out the [Yoga Calendar Effect](https://yoga-calendar-effect.now.sh/?yogi=${yogi}) chart.\nYou’re part of it too!`
        )
        linkSeen = true

        // 4. save message sent date
        await userDoc.update({
          message_sent_at: new Date(),
        })

        console.info(`link sent to ${first_name} (yogi=${yogi})`)
        const linkSentMessage = `${first_name} have received https://ywa-calendar-may-2020.now.sh/?yogi=${yogi}`
        await ctx.telegram.sendMessage(process.env.LOG_CHAT_ID, linkSentMessage)
      } catch (e) {
        await reportError({
          ctx,
          where: `yogi message, linkSeen: ${linkSeen}, yogi: ${yogi}`,
          error: e,
          silent: true,
        })
      }
    })
    return Promise.resolve()
  } catch (e) {
    console.error('🐛 In announcement logic', e)
    return reportError({
      ctx,
      where: 'announcement middleware',
      error: e,
      silent: true,
    })
  }
}

export default announcments
