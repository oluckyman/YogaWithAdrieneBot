import _ from 'lodash'
import dayjs from 'dayjs'
import { Firestore, Timestamp } from '@google-cloud/firestore'

const pad = (num: number) => `${num}`.padStart(2, '0')

interface NowWatchingProps {
  id: string
  year?: number
  month: number
  day: number
}
export default async function nowWatching(
  firestore: Firestore,
  { id, year = 2020, month, day }: NowWatchingProps
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
