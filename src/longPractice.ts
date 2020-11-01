// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable '_'.
const _ = require('lodash')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'timeFormat... Remove this comment to see the full error message
const { timeFormat } = require('d3-time-format')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'pauseForA'... Remove this comment to see the full error message
const { pauseForA, reportError } = require('./utils')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'fs'.
const fs = require('fs').promises

// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'longPracti... Remove this comment to see the full error message
async function longPractice(ctx: any, next: any) {
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
      .then((json: any) => _.filter(json, { day }))
      .then((parts: any) => _.minBy(parts, 'duration'))

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
    const part = _.get(ctx, 'match.groups.part')
    if (part) {
      // user picked a specific video from the parts menu, it means he saw /today command
      // and the longPractice note already
      return
    }

    // 4. Notify
    //
    let dura = video.duration
    if (dura <= 55) {
      dura = `${dura} minutes`
    } else if (dura <= 70) {
      dura = 'about a hour'
    } else {
      dura = 'more than a hour'
    }
    await pauseForA(1)
    const message = `👉 Note, tomorrow's video will be long: _${dura}_`
    console.log(message)
    return ctx.replyWithMarkdown(message)
  } catch (e) {
    console.error('🐛 In long practice logic', e)
    return reportError({ ctx, where: 'long practice middleware', error: e, silent: true })
  }
}

module.exports = longPractice
