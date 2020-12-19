import { getUser } from './utils'
import type { BotMiddleware } from './models/bot'

type UsernameOrId = string | number
const blacklist: UsernameOrId[] = ['MCKGAMINGYT']

const antispam: BotMiddleware = (ctx, next) => {
  const user = getUser(ctx)
  const isSpamer = blacklist.includes(user?.id ?? 0) || blacklist.includes(user?.username ?? '')
  if (isSpamer) return

  const isMessageFromGroup = !!ctx.update.channel_post
  if (isMessageFromGroup) return
  return next()
}

export default antispam
