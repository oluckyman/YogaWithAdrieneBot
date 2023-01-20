import { Extra } from 'telegraf'
import { BotContext } from './models/bot'

export default function replyHelp(ctx: BotContext) {
  return ctx
    .replyWithHTML(
      `
<b>Yoga With Adriene</b> bot helps you get yoga videos without friction and distractions.

<b>Commands</b>
• <b>/today</b>’s video from the calendar ▶️
• <b>/calendar</b> of the month and YouTube playlist 🗓
• <b>/help</b> — <i>this message</i>📍

If the bot doesn’t work, it means I dropped the daily yoga, <a href="t.me/oluckyman">cheer me up 👋</a>
`,
      Extra.notifications(false).webPreview(false) as any
    )
    .then(() => {
      ctx.state.success = true
      ctx.state.command = 'help'
    })
  // • <b>/about</b> this bot and Yoga With Adriene 🤔
}
