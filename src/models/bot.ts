import type { Firestore } from '@google-cloud/firestore'
import type { DatabasePool } from 'slonik'
import type Telegraf from 'telegraf'
import type { Context, Middleware } from 'telegraf'

export interface BotContext extends Context {
  state: {
    command?: 'today' | 'calendar' | 'start' | 'help' | 'smallTalk'
    day?: number
    logQueue?: string[]
    success?: boolean
    journeyDayShift: number
  }
  now: Date
  firestore: Firestore
  postgres: DatabasePool
}

export type BotMiddleware = Middleware<BotContext>

export type Bot = Telegraf<BotContext>
