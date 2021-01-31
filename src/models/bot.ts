import type { Firestore } from '@google-cloud/firestore'
import Telegraf, { Context, Middleware } from 'telegraf'

export interface BotContext extends Context {
  state: {
    command?: 'today' | 'calendar' | 'start' | 'help'
    day?: number
    logQueue?: string[]
    success?: boolean
    journeyDayShift: number
  }
  now: Date
  firestore: Firestore
}

export type BotMiddleware = Middleware<BotContext>

export type Bot = Telegraf<BotContext>
