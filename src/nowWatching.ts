// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable '_'.
const _ = require('lodash')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'dayjs'.
const dayjs = require('dayjs')

const pad = (num: any) => `${num}`.padStart(2, '0')

module.exports = async function nowWatching(firestore: any, { id, year = 2020, month, day }: any) {
  const videoName = `${year}_${pad(month)}_${pad(day)}_${id}`
  console.log({ videoName })
  const logs = await firestore
    .doc(`videos/${videoName}/viewCounts/latest`)
    .get()
    .then((doc: any) => doc.data())
    .then(({ log }: any) =>
      log.map((d: any) => ({
        ...d,
        date: d.date.toDate(),
      }))
    )
    .catch((e: any) => {
      console.error(`🐛 video ${videoName}: ${e}`)
      return []
    })
  const timeAgo = dayjs(new Date()).subtract(7, 'hour').toDate()
  const minutes = 30
  const latestLogs = logs.filter((d: any) => d.date > timeAgo)
  // TODO: normalize latest logs as it done in https://observablehq.com/d/f2717223f121bb62
  // Now it can wait because the logs has the same period: every 30 mins
  // Also it could show some errors if the logs are not evenly distributed (due to manual trackViews calls)

  // removing the first item as it has delta = 0 and can affect the curve
  const viewDeltas = _.tail(
    latestLogs.map((d: any, i: any, arr: any) => ({
      ...d,
      delta: i ? d.viewCount - arr[i - 1].viewCount : 0,
    }))
  )
  const smoothDeltas = gaussianSmoothing(
    viewDeltas.map((d: any) => d.delta),
    3.5
  ).map((d) => d / minutes)
  return Math.round(_.last(smoothDeltas))
}

function applyKernel(points: any, w: any) {
  const precision = 1e-6
  const values = new Float64Array(points.length).fill(0)
  const total = new Float64Array(points.length).fill(0)
  let p = 1
  for (let d = 0; p > precision; d++) {
    p = w(d)
    for (let i = 0; i < points.length; i++) {
      if (i + d < points.length) {
        values[i + d] += p * points[i]
        total[i + d] += p
      }
      if (d != 0 && i - d >= 0) {
        values[i - d] += p * points[i]
        total[i - d] += p
      }
    }
  }
  for (let i = 0; i < values.length; i++) {
    values[i] /= total[i]
  }
  return values
}

function gaussianSmoothing(values: any, n: any) {
  const r = 2 / n
  return applyKernel(values, (d: any) => Math.exp(-((r * d) ** 2)))
}
