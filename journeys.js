const _ = require('lodash')
const Extra = require('telegraf/extra')
const journeys = require('./journeys.json')
const { reportError } = require('./utils')

module.exports = function setupJourneys(bot) {
  bot.command('/journeys', replyJourneys)
  bot.action('cb:journeys', replyJourneys)

  bot.action(/cb:journey:start:(?<year>\d+)?/, replyJourneyStart)
  bot.action(/cb:journey:(?<year>\d+)?/, replyJourney)
}


function replyJourneys(ctx) {
  // TODO: add message that you can subscribe to a email version and receive
  // a daily letter here https://do.yogawithadriene.com/30-days-of-yoga-daily-emails
  //   const message = `
  // For the past six years, millions of people have joined us for our annual 30 Days of Yoga series.
  // Each of these series features not only a daily practice video, but an accompanying email to guide and encourage you on your journey.
  // You can join a email newsletter
  // Now you can begin any of these series at your convenience.
  //   `
  const message = `*30 Days of Yoga series*`

  return ctx.replyWithMarkdown(message, Extra.markdown()
    .markup(m => m.inlineKeyboard(
      journeys.map(({ year, title }) => m.callbackButton(`${title} • ${year}`, `cb:journey:${year}`))
    , { columns: 1 })))
    .then(() => ctx.state.success = true)
}


// Show journey for the current year
// reuse previous message when paging
async function replyJourney(ctx) {
  const year = +ctx.match.groups.year
  const journey = journeys.find(c => +c.year === year)
  const { title, description, thumb } = journey
  const caption = `*${title} • ${year}*\n${description}`

  const [minYear, maxYear] = [2015, 2020]
  const [prevLoop, nextLoop] = [year === minYear, year === maxYear]
  const [prevYear, nextYear] = [prevLoop ? maxYear : year - 1, nextLoop ? minYear : year + 1]
  const [prevArrow, nextArrow] = [prevLoop ? '↪️' : '⬅️', nextLoop ? '↩️' : '➡️']
  const [prevBtn, nextBtn] = [[prevArrow, prevYear], [nextYear, nextArrow]].map(arr => arr.join(' '))

  const keyboard = m => m.inlineKeyboard([
    m.callbackButton(`${prevBtn}`, `cb:journey:${prevYear}`),
    m.callbackButton('Start', `cb:journey:start:${year}`),
    m.callbackButton(`${nextBtn}`, `cb:journey:${nextYear}`),
  ], { columns: 3 })

  const isCalledFromList = !_.get(ctx.update, 'callback_query.message.photo')

  if (isCalledFromList) {
    return ctx.replyWithPhoto(thumb, Extra
      .caption(caption)
      .markdown()
      .markup(keyboard)
    ).then(() => ctx.state.success = true)
  } else {
    const chatId = ctx.update.callback_query.from.id
    const messageId = ctx.update.callback_query.message.message_id
    const media = {
      type: 'photo',
      media: thumb,
      caption,
    }
    let sent
    try {
      sent = await ctx.telegram.editMessageMedia(chatId, messageId, null, media, Extra
        .markdown()
        .markup(keyboard)
      ).then(() => ctx.state.success = true)
    } catch (e) {
      console.error('🤔 Paging journeys: too many queires?', e)
      return reportError({ ctx, where: 'paging journeys', error: e, silent: true })
    }
    return sent
  }
}


function replyJourneyStart(ctx) {
  console.log('confirmation screen here')
}
