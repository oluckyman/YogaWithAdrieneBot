import * as Amplitude from '@amplitude/node'
import type { BotContext } from '../models/bot'
import { getUser } from '../utils'

const client = Amplitude.init(`${process.env.AMPLITUDE_API_KEY}`)

function logEvent(ctx: BotContext): void {
  const userId = `${getUser(ctx)?.id ?? -1}`

  client.logEvent({
    event_type: 'Amplitude test',
    user_id: userId,
    event_properties: {
      keyString: 'valueString',
      keyInt: 11,
      keyBool: true
    }
  });

  client.flush();
}


export default logEvent