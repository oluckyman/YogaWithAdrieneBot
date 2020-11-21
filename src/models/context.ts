import type { Firestore } from '@google-cloud/firestore'
import type { Context } from 'telegraf'

export default interface BotContext extends Context {
  state: {
    command?: string
    logQueue?: string[]
  }
  firestore: Firestore
}
