import type { BotMiddleware } from '../models/bot'
// import { isAdmin } from '../utils'

const gpt: BotMiddleware = async (ctx, next) => {
  await next()
  if (!ctx.state.command) {
    ctx.state.command = 'gpt'
    console.log('========= GPT-3 kicks in here ======= ', ctx.state)
  } else {
    console.log('========= no gpt here ======= ', ctx.state)
  }
}

export default gpt
