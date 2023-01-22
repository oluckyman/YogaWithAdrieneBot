import _ from 'lodash'
import { Extra } from 'telegraf'
import { ExtraReplyMessage, Message, User } from 'telegraf/typings/telegram-types.d'
import type { BotContext, BotMiddleware, Command } from './models/bot'

export const MENU = {
  today: '▶️ Today’s yoga',
  calendar: '🗓 Calendar',
  help: '💁 Help',
}

export const commandHandler = (command: Command) => (handler: BotMiddleware) => {
  if (typeof handler !== 'function') {
    throw new Error('Handler must be a function')
  }
  const wrapper: BotMiddleware = async (ctx, next) => {
    ctx.state.command = command
    await handler(ctx, next)
    ctx.state.success = true
  }
  return wrapper
}

export function convertTZ(date: Date, tzString: string) {
  return new Date(
    +new Date(date.toLocaleString('en-US', { timeZone: tzString })) - date.getTimezoneOffset() * 60 * 1000
  )
}

export function getDaysInMonth(now: Date): number {
  const date = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return date.getDate()
}

export const oneOf = (messages: string[][]): string => _.sample(_.sample(messages)) as string

export function pauseForA(sec: number): Promise<void> {
  return new Promise((r) => setTimeout(r, sec * 1000))
}

export const isAdmin = (ctx: BotContext): boolean =>
  [ctx.update.message?.from?.id, ctx.update.callback_query?.from.id].includes(+process.env.ADMIN_ID)

// TODO: need a bullet-proof get-user method
export const getUser = (ctx: BotContext): User | undefined =>
  ctx.update.message ? ctx.update.message.from : ctx.update.callback_query?.from

interface ReportErrorProps {
  ctx: BotContext
  error: string
  where: string
  silent?: boolean
}
export async function reportError({
  ctx,
  error,
  where,
  silent = false,
}: ReportErrorProps): Promise<Message | undefined> {
  const toChat = process.env.LOG_CHAT_ID
  const errorMessage = `🐞${error}\n👉${where}\n🤖${JSON.stringify(ctx.update, null, 2)}`
  await ctx.telegram.sendMessage(toChat, errorMessage)
  if (silent) {
    return
  }

  await ctx.reply('Oops… sorry, something went wrong 😬')
  await pauseForA(1)
  await ctx.replyWithMarkdown(
    'Don’t hesitate to ping [the author](t.me/oluckyman) to get it fixed',
    Extra.webPreview(false) as ExtraReplyMessage
  )
  await pauseForA(2)
  await ctx.replyWithMarkdown('Meantime try the */calendar*…')
  await pauseForA(0.7)
  // eslint-disable-next-line consistent-return
  return ctx.replyWithMarkdown('_…if it’s working 😅_')
}

// lodash/fp analog
export const pick =
  <T, K extends keyof T>(keys: K[]) =>
  (obj: T) =>
    keys.reduce((acc, key) => ({ ...acc, [key]: obj[key] }), {} as Pick<T, K>)
