import _ from 'lodash'
import { Extra } from 'telegraf'
import type { BotContext, BotMiddleware } from './models/bot'
import { pauseForA } from './utils'

const setFirstContact = (ctx: BotContext, { user }: any) => {
  const userDoc = ctx.firestore.collection('users').doc(`id${user.id}`)
  return userDoc.get().then((doc: any) => {
    if (!doc.exists) {
      return userDoc.set({
        ...user,
        first_contact_at: new Date(),
      })
    }
  })
}

const replyStart: BotMiddleware = async (ctx: BotContext) => {
  // I use it in the logger to do verbose log for new users
  ctx.state.command = 'start'

  // TODO: consider use these words (seen in an Adriene's letter):
  // It's free and easy to follow. It takes out all the guess work
  // and welcomes you to make practice a priority.
  const greetings: [number, string][] = [
    [0.0, '👋 _Hello my darling friend!_'],
    [
      1.2,
      'This bot is designed to */help* you maintain your *daily* yoga practice and feel a sense of unity with others.',
    ],
    [
      1.5,
      'It gives you */today*’s yoga video from the */calendar* and shows how many people have started this video right now.',
    ],
  ]

  const sendGreeting = async (i: number) => {
    if (i >= greetings.length) return
    const message = greetings[i][1]
    const delaySec = _.get(greetings, [i + 1, 0])
    const isLastMessage = i === greetings.length - 1
    await ctx.reply(
      message,
      Extra.markdown()
        .markup((m: any) =>
          isLastMessage ? m.inlineKeyboard([m.callbackButton('▶️ Get today’s yoga video', 'cb:today')]) : m
        )
        .notifications(false)
    )
    if (delaySec !== undefined) {
      await ctx.replyWithChatAction('typing')
      await pauseForA(delaySec)
      await sendGreeting(i + 1)
    }
  }
  await ctx.replyWithChatAction('typing')
  await pauseForA(0.5)
  await sendGreeting(0)

  // TODO: rewrite it to `await` chain and set `state.success` at the end
  return setFirstContact(ctx, {
    user: _.get(ctx.update, 'message.from'),
  })
}

export default replyStart
