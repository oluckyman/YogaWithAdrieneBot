import _ from 'lodash'
import { timeFormat } from 'd3-time-format'
import { DocumentReference } from '@google-cloud/firestore'
import { getUser, pauseForA, reportError } from './utils'
import { getVideosFromPlaylist } from './today/playlist'
import type { BotContext, BotMiddleware } from './models/bot'

const longPractice: BotMiddleware = async (ctx, next) => {
  await next()

  try {
    // 1. Check if it was today command
    if (ctx.state.command !== 'today') {
      return
    }

    // 2. If there is a long practice tomorrow
    //
    const tomorrow = new Date(ctx.now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const year = timeFormat('%Y')(tomorrow)
    const month = timeFormat('%m')(tomorrow)
    const day = tomorrow.getDate() - ctx.state.journeyDayShift

    console.info('===> longPractice tomorrow', { year, month, day })

    const video = await getVideosFromPlaylist(ctx, year, month, day)
      .then((videos) => _.maxBy(videos, 'duration'))
      .catch(() => {
        /* do nothing, the check below will handle empty video */
      })

    if (!video) {
      console.error('Cannot find tomorrow’s video')
      return
    }

    const threshold = 35
    if (video.duration <= threshold) {
      // Do nothing, it's a normal video
      return
    }

    // 3. Check if the user was notified today already
    const shouldNotify = await shouldNotifyLongPractice(ctx, tomorrow)
    if (!shouldNotify) return

    // 4. Notify
    //
    let dura: string | number = video.duration
    if (dura <= 55) {
      dura = `${dura} minutes` // eslint-disable-line no-irregular-whitespace
    } else if (dura <= 70) {
      dura = 'about an hour'
    } else {
      dura = 'more than an hour'
    }
    await pauseForA(1)
    const message = `👉 Note, tomorrow's video will be _${dura}_`
    console.info(message)
    return ctx.replyWithMarkdown(message)
  } catch (e) {
    console.error('🐛 In long practice logic', e)
    return reportError({ ctx, where: 'long practice middleware', error: `${e}`, silent: true })
  }
}

async function shouldNotifyLongPractice(ctx: BotContext, date: Date) {
  type UserData = {
    id: number
    long_practice_note: string | undefined
  }
  const user = getUser(ctx)
  const userDoc = ctx.firestore.collection('users').doc(`id${user?.id}`) as DocumentReference<UserData>
  const longPracticeDate = date.toISOString().substring(0, 10)
  return userDoc.get().then(async (doc) => {
    if (!doc.exists) {
      console.info(`dunno this user ${user?.id}`)
      return false
    }
    const { long_practice_note = '' } = doc.data() ?? {}
    if (long_practice_note === longPracticeDate) {
      console.info('Already received long practice note')
      return false
    }
    await userDoc.update({
      long_practice_note: longPracticeDate,
    })
    return true
  })
}
export default longPractice
