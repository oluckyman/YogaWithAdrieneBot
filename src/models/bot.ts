import type { Firestore } from '@google-cloud/firestore'
import type { DatabasePool } from 'slonik'
import type Telegraf from 'telegraf'
import type { Context, Middleware } from 'telegraf'

export type Command = 'start' | 'today' | 'calendar' | 'help' | 'smallTalk' | 'gpt'

export interface BotContext extends Context {
  state: {
    command?: Command
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
