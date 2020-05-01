const _ = require('lodash')


const pad = (num) => `${num}`.padStart(2, '0')

const N = 60

module.exports = async (firestore, { id, month, day }) => {
  const videoName = `${pad(month)}_${pad(day)}_${id}`
  const viewDeltas = await firestore.doc(`videos/${videoName}/viewCounts/latest`).get()
    .then(doc => doc.data())
    .then(({ log }) => log.map((d, i) => i === 0 ? 0 : d.viewCount - log[i-1].viewCount))
    .catch(e => {
      console.error(`🐛 video ${videoName}: ${e}`)
      return []
    })
  // insert odd minutes because the log tracks every 2 minutes
  // and smoothing algorithm expects every minute
  const viewDeltasPerMinute = _.flatMap(viewDeltas.map(d => ([d, 0])))
  const smoothDeltas = gaussianSmoothing(viewDeltasPerMinute, N)
  console.log({ videoName, smoo: _.takeRight(smoothDeltas, 5) })
  return Math.round(_.last(smoothDeltas))
}


function applyKernel(points, w) {
  const precision = 1e-6
  const values = new Float64Array(points.length).fill(0),
    total = new Float64Array(points.length).fill(0);
  let p = 1;
  for (let d = 0; p > precision; d++) {
    p = w(d);
    for (let i = 0; i < points.length; i++) {
      if (i + d < points.length) {
        values[i + d] += p * points[i];
        total[i + d] += p;
      }
      if (d != 0 && i - d >= 0) {
        values[i - d] += p * points[i];
        total[i - d] += p;
      }
    }
  }
  for (let i = 0; i < values.length; i++) {
    values[i] /= total[i];
  }
  return values;
}


function gaussianSmoothing(values, N) {
  const r = 2 / N;
  return applyKernel(values, d => Math.exp(-((r * d) ** 2)));
}