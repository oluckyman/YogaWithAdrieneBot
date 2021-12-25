import * as Amplitude from '@amplitude/node'
import type { BotContext } from '../models/bot'
import { getUser } from '../utils'

const client = Amplitude.init(`${process.env.AMPLITUDE_API_KEY}`)

function logEvent(ctx: BotContext): void {
  const user = getUser(ctx)
  const userId = `${user?.id ?? -1}`
  const {state} = ctx

  client.logEvent({
    event_type: state.command || 'unknown',
    user_id: userId,
    user_properties: user,
    event_properties: {
      success: state.success,
      day: state.day,
    }
  });

  client.flush();
}


export default logEvent