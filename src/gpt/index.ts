import { askGpt } from '../../pages/api/gpt'
import type { BotMiddleware } from '../models/bot'
import { pauseForA } from '../utils'
// import { isAdmin } from '../utils'

const gpt: BotMiddleware = async (ctx, next) => {
  await next()

  // Make sure it's not command and there is text to answer
  //
  if (ctx.state.command) return
  const message = ctx.message?.text
  if (!message) return
  ctx.state.command = 'gpt'

  // Ask GPT
  //
  const answerPromise = askGpt(message)

  // UI
  //
  await pauseForA(1)
  await ctx.replyWithChatAction('typing')
  await pauseForA(1)
  const answer = await answerPromise
  await ctx.replyWithMarkdown(answer)

  // TODO: maybe use dynamic message update while gpt is streaming
  // const reply = await ctx.replyWithMarkdown('GPT-3 is thinking…')
  // const answer = await answerPromise
  // await ctx.telegram.editMessageText(ctx.chat.id, reply.message_id, undefined, `GPT-3 says: ${answer}`)
}

export default gpt
