import _ from 'lodash'
import dayjs from 'dayjs'
import writtenNumber from 'written-number'
import { Firestore, Timestamp } from '@google-cloud/firestore'

const pad = (num: number) => `${num}`.padStart(2, '0')

interface NowWatchingProps {
  id: string
  year: number
  month: number
  day: number
}
export default async function nowWatching(
  firestore: Firestore,
  { id, year, month, day }: NowWatchingProps
): Promise<number> {
  const videoName = `${year}_${pad(month)}_${pad(day)}_${id}`
  console.info({ videoName })
  type LogData = {
    log: Array<{
      date: Timestamp
      viewCount: number
    }>
  }
  const logs = await firestore
    .doc(`videos/${videoName}/viewCounts/latest`)
    .get()
    .then((doc) => doc.data() as LogData)
    .then(({ log }) =>
      log.map((d) => ({
        ...d,
        date: d.date.toDate(),
      }))
    )
    .catch((e: Error) => {
      console.error(`🐛 video ${videoName}: ${e}`)
      return []
    })
  const timeAgo = dayjs(new Date()).subtract(7, 'hour').toDate()
  const minutes = 30
  const latestLogs = logs.filter((d) => d.date > timeAgo)
  // TODO: normalize latest logs as it done in https://observablehq.com/d/f2717223f121bb62
  // Now it can wait because the logs has the same period: every 30 mins
  // Also it could show some errors if the logs are not evenly distributed (due to manual trackViews calls)

  // removing the first item as it has delta = 0 and can affect the curve
  const viewDeltas = _.tail(
    latestLogs.map((d, i, arr) => ({
      ...d,
      delta: i ? d.viewCount - arr[i - 1].viewCount : 0,
    }))
  )
  const smoothDeltas = gaussianSmoothing(
    viewDeltas.map((d) => d.delta),
    3.5
  ).map((d) => d / minutes)
  console.info('nowWatching', _.takeRight(smoothDeltas, 5))
  return Math.round(_.last(smoothDeltas) as number)
}

function applyKernel(points: any, w: any) {
  const precision = 1e-6
  const values = new Float64Array(points.length).fill(0)
  const total = new Float64Array(points.length).fill(0)
  let p = 1
  // eslint-disable-next-line no-plusplus
  for (let d = 0; p > precision; d++) {
    p = w(d)
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < points.length; i++) {
      if (i + d < points.length) {
        values[i + d] += p * points[i]
        total[i + d] += p
      }
      // eslint-disable-next-line eqeqeq
      if (d != 0 && i - d >= 0) {
        values[i - d] += p * points[i]
        total[i - d] += p
      }
    }
  }
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < values.length; i++) {
    values[i] /= total[i]
  }
  return values
}

function gaussianSmoothing(values: number[], n: number) {
  const r = 2 / n
  return applyKernel(values, (d: any) => Math.exp(-((r * d) ** 2)))
}

// Show who's practicing right now
//
export function nowWatchingMessage(nowWatchingCount: number): string {
  const yogi1 = [...'😝🤪😑😑😅😅🙃🙃🙃🙃🙃🙃🙃🙃😌😌😌😌😌😌😊😊😊😊😊😊😬😴']
  const rare = [...'🦄👽🤖😇' /* ...'🎅🤶⛄' */]
  // const yogi2 = [...'🤪😝😞🥵😑🙃😅😇☺️😊😌😡🥶😬🙄😴🥴🤢💩🤖👨🦄👽']
  const yogi = [...yogi1, ...rare]
  const emojisArr = _.range(nowWatchingCount).map(() => _.sample(yogi))
  // keep only one instance of rare emoji
  rare.forEach((unicorn) => {
    const where = emojisArr.map((e, i) => (e === unicorn ? i : -1)).filter((i) => i !== -1)
    // Replace all rare emojies with the normal, except the rare cases
    const toReplace = Math.random() < 0.1 ? _.sampleSize(where, where.length - 1) : where
    toReplace.forEach((index) => {
      emojisArr[index] = _.sample(yogi1)
    })
  })
  const emojis = emojisArr.join('')
  const number = nowWatchingCount <= 10 ? writtenNumber(nowWatchingCount) : `${nowWatchingCount}`
  const messages =
    // eslint-disable-next-line no-nested-ternary
    nowWatchingCount > 925
      ? [
          `*${number} people* started this video within the last minute`,
          `*${number} folks* started this video within the last minute`,
          `Practice in sync with *${number} people*`,
          `Join *${number} brave souls*, they’ve just started`,
        ]
      : // eslint-disable-next-line no-nested-ternary
      nowWatchingCount > 2
      ? [
          `${emojis}\n*${_.capitalize(number)} folks* started this video within the last minute`,
          `${emojis}\nPractice in sync with *${number} people*`,
          `${emojis}\nJoin *${number} brave souls*, they’ve just started`,
        ]
      : nowWatchingCount === 2
      ? [`Make a trio with these *two*, they started within the last minute: ${emojis}`]
      : [
          '*One person* hit play within the last minute, make a duo!',
          'Someone on the planet just started this video, keep them company!',
        ]
  return _.sample(messages) as string
}
