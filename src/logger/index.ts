import type { BotMiddleware } from '../models/bot'
import { isAdmin } from '../utils'
import logAmplitude from './amplitude'
import logTelegram from './telegram'

const logger: BotMiddleware = async (ctx, next) => {
  if (!isAdmin(ctx)) {
    console.info('👉 New Request ---')
    console.info(ctx.update)
  } else {
    console.info('👨‍💻 me working…')
  }

  await next()

  //
  // Amplitude
  //
  logAmplitude(ctx)

  //
  // Telegram channel log + Firebase log
  //
  await logTelegram(ctx)
}

export default logger
