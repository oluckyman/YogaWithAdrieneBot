import { getUser } from './utils'
import type { BotMiddleware } from './models/bot'

type UsernameOrId = string | number
const blacklist: UsernameOrId[] = ['MCKGAMINGYT']

const antispam: BotMiddleware = (ctx, next) => {
  const user = getUser(ctx)
  const isSpam = blacklist.includes(user?.id ?? 0) || blacklist.includes(user?.username ?? '')
  if (isSpam) {
    return
  }
  return next()
}

export default antispam
