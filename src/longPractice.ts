import _ from 'lodash'
import { timeFormat } from 'd3-time-format'
import { promises as fs } from 'fs'
import { Middleware } from 'telegraf'
import BotContext from './models/bot-context'
import { pauseForA, reportError } from './utils'
import latestCalendar from '../calendars/11.json'

type CalendarType = typeof latestCalendar

const longPractice: Middleware<BotContext> = async (ctx, next) => {
  await next()

  try {
    // 1. Check if it was today command
    if (ctx.state.command !== 'today') {
      return
    }

    // 2. If there is a long practice tomorrow
    //
    // TODO: extract into a common module and cover with tests
    const tomorrow = new Date(ctx.now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const month = timeFormat('%m')(tomorrow)
    const day = tomorrow.getDate()

    // TODO: cache parsed month playlist
    const video = await fs
      .readFile(`calendars/${month}.json`, 'utf8')
      .then((txt: any) => JSON.parse(txt))
      .then((json: CalendarType) => _.filter(json, { day }))
      .then((parts) => _.minBy(parts, 'duration'))

    if (!video) {
      // TODO: handle this case some day
      console.error('Cannot find tomorrow’s video. Is it the end of month?')
      return
    }

    const threshold = 35
    if (video.duration <= threshold) {
      // Do nothing, it's a normal video
      return
    }

    // 3. Check if the user was notified today already
    // TODO: add this check some day
    // XXX: while there is no such check, prevent sending notification twice
    // when there is two practices for a day
    const part = ctx.match?.groups?.part
    if (part) {
      // user picked a specific video from the parts menu, it means he saw /today command
      // and the longPractice note already
      return
    }

    // 4. Notify
    //
    let dura: string | number = video.duration
    if (dura <= 55) {
      dura = `${dura} minutes` // eslint-disable-line no-irregular-whitespace
    } else if (dura <= 70) {
      dura = 'about a hour'
    } else {
      dura = 'more than a hour'
    }
    await pauseForA(1)
    const message = `👉 Note, tomorrow's video will be long: _${dura}_`
    console.info(message)
    return ctx.replyWithMarkdown(message)
  } catch (e) {
    console.error('🐛 In long practice logic', e)
    return reportError({ ctx, where: 'long practice middleware', error: e, silent: true })
  }
}

export default longPractice
