const _ = require('lodash')
const { timeFormat } = require('d3-time-format')
const { pauseForA, reportError } = require('./utils')
const fs = require('fs').promises

const now = () => new Date()

async function longPractice(ctx, next) {
  await next()

  try {
    // 1. Check if it was today command
    if (ctx.state.command !== 'today') {
      return
    }

    // 2. If there is a long practice tomorrow
    //
    // TODO: extract into a common module and cover with tests
    const month = timeFormat('%m')(now())
    const day = now().getDate() + 1
    // TODO: cache parsed month playlist
    const video = await fs.readFile(`calendars/${month}.json`, 'utf8')
      .then(txt => JSON.parse(txt))
      .then(json => _.filter(json, { day }))
      .then(parts => _.minBy(parts, 'duration'))

    if (!video) {
      // TODO: handle this case some day
      console.error('Cannot find tomorrow’s video. Is it the end of month?')
      return
    }

    const threshold = 38
    if (video.duration <= threshold) {
      // Do nothing, it's a normal video
      return
    }

    // 3. Check if the user was notified today already
    // TODO: add this check some day

    // 4. Notify 
    //
    let dura = video.duration
    if (dura <= 55) {
      dura = `${dura} mins`
    } else if (dura <= 70) {
      dura = 'about a hour'
    } else {
      dura = 'more than a hour'
    }
    await pauseForA(1)
    const message = `👉 Note, _tomorrow's_ video will be long: _${dura}_`
    console.log(message)
    return ctx.replyWithMarkdown(message)
  } catch (e) {
    console.error('🐛 In long practice logic', e)
    return reportError({ ctx, where: 'long practice middleware', error: e, silent: true })
  }
}

module.exports = longPractice
