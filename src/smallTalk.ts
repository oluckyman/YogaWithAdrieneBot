import type { BotContext } from './models/bot'
import { isAdmin, oneOf, pauseForA } from './utils'

const praiseRegExp = '(?<praise>[🙌🙏❤️🧡💛💚💙💜👍❤️😍🥰😘💖]|thank|thanx|love|namaste)'
const greetRegExp = '(?<greet>^hi|hello|hey|hola|привет|ciao)'
export const smallTalkMessage = new RegExp(`${praiseRegExp}|${greetRegExp}`, 'iu') // eslint-disable-line no-misleading-character-class

const thanksMessages = [
  [...'😌☺️😉'], // smiles
  [...'🥰💚🤗'], // love
  [...'🙏'], // gestures
]
const greetMessages = [[...'👋']]

export async function replySmallTalk(ctx: BotContext) {
  await pauseForA(1)
  await ctx.replyWithChatAction('typing')
  await pauseForA(1)
  let messagesToReply = thanksMessages
  if (ctx.match?.groups?.greet) {
    messagesToReply = greetMessages
  }
  const reply = oneOf(messagesToReply)
  // show how the message looks in botlog
  if (!isAdmin(ctx)) {
    // eslint-disable-next-line require-atomic-updates
    ctx.state.logQueue = [...(ctx.state.logQueue || []), reply]
    console.info(reply)
  }
  return ctx.replyWithMarkdown(reply)
}
