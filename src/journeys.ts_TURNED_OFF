// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable '_'.
const _ = require('lodash')
const Extra = require('telegraf/extra')
const journeys = require('../calendars/journeys.json')
const { reportError, getUser } = require('./utils')

function setupJourneys(bot: any) {
  bot.command('/journeys', replyJourneys)
  bot.action('cb:journeys', replyJourneys)

  bot.action(/cb:journey:(?<year>\d+)$/, replyJourney)
  bot.action(/cb:journey:(?<year>\d+):join$/, replyJourneyJoin)
  bot.action(/cb:journey:(?<year>\d+):start$/, replyJourneyStart)
  // bot.action(/cb:journey:(?<year>\d+):(?<command>.*)$/, replyJourneyJoin)
}

const getJourney = (year: any) => journeys.find((c: any) => +c.year === +year)

function replyJourneys(ctx: any) {
  // TODO: add message that you can subscribe to a email version and receive
  // a daily letter here https://do.yogawithadriene.com/30-days-of-yoga-daily-emails
  //   const message = `
  // For the past six years, millions of people have joined us for our annual 30 Days of Yoga series.
  // Each of these series features not only a daily practice video, but an accompanying email to guide and encourage you on your journey.
  // You can join a email newsletter
  // Now you can begin any of these series at your convenience.
  //   `
  const message = `*30 Days of Yoga series*`

  return ctx
    .replyWithMarkdown(
      message,
      Extra.markdown().markup((m: any) =>
        m.inlineKeyboard(
          journeys.map(({ year, title }: any) => m.callbackButton(`${title} • ${year}`, `cb:journey:${year}`)),
          { columns: 1 }
        )
      )
    )
    .then(() => (ctx.state.success = true))
}

// Show journey for the current year
// reuse previous message when paging
async function replyJourney(ctx: any) {
  const year = +ctx.match.groups.year
  const journey = getJourney(year)
  const { title, description, thumb } = journey
  const caption = `*${title} • ${year}*\n${description}`

  const [minYear, maxYear] = [2015, 2020]
  const [prevLoop, nextLoop] = [year === minYear, year === maxYear]
  const [prevYear, nextYear] = [prevLoop ? maxYear : year - 1, nextLoop ? minYear : year + 1]
  // const [prevArrow, nextArrow] = [prevLoop ? '↪️' : '⬅️', nextLoop ? '↩️' : '➡️']
  const [prevArrow, nextArrow] = [prevLoop ? '↪️' : '←️', nextLoop ? '↩️' : '→️']
  const [prevBtn, nextBtn] = [
    [prevArrow, prevYear],
    [nextYear, nextArrow],
  ].map((arr) => arr.join(' '))

  const keyboard = (m: any) =>
    m.inlineKeyboard(
      [
        m.callbackButton(`${prevBtn}`, `cb:journey:${prevYear}`),
        m.callbackButton('Join', `cb:journey:${year}:join`),
        m.callbackButton(`${nextBtn}`, `cb:journey:${nextYear}`),
      ],
      { columns: 3 }
    )

  const isCalledFromList = !_.get(ctx.update, 'callback_query.message.photo')

  if (isCalledFromList) {
    return ctx
      .replyWithPhoto(thumb, Extra.caption(caption).markdown().markup(keyboard))
      .then(() => (ctx.state.success = true))
  }
  const chatId = ctx.update.callback_query.from.id
  const messageId = ctx.update.callback_query.message.message_id
  const media = {
    type: 'photo',
    media: thumb,
    caption,
  }
  let sent
  try {
    sent = await ctx.telegram
      .editMessageMedia(chatId, messageId, null, media, Extra.markdown().markup(keyboard))
      .then(() => (ctx.state.success = true))
  } catch (e) {
    console.error('🤔 Paging journeys: too many queires?', e)
    return reportError({ ctx, where: 'paging journeys', error: e, silent: true })
  }
  return sent
}

async function replyJourneyJoin(ctx: any) {
  const year = +ctx.match.groups.year
  const journey = getJourney(year)
  const { title, description, thumb } = journey
  const more =
    '*When you join a journey*' +
    '\n• Your */calendar* will be set to this journey for the next 30 days' +
    "\n• */today*'s yoga will be taken from the journey playlist." +
    '\n*TODO:* _explain better how it works_'
  const caption = `*${title} • ${year}*\n${description}\n${more}`
  const chatId = ctx.update.callback_query.from.id
  const messageId = ctx.update.callback_query.message.message_id
  const media = {
    type: 'photo',
    media: thumb,
    caption,
  }
  const keyboard = (m: any) =>
    m.inlineKeyboard(
      [
        m.callbackButton('Start the Journey!', `cb:journey:${year}:start`),
        m.callbackButton('Back', `cb:journey:${year}`),
      ],
      { columns: 1 }
    )

  let sent
  try {
    sent = await ctx.telegram
      .editMessageMedia(chatId, messageId, null, media, Extra.markdown().markup(keyboard))
      .then(() => (ctx.state.success = true))
  } catch (e) {
    console.error('🤔 Paging journeys: too many queires?', e)
    return reportError({ ctx, where: 'paging journeys', error: e, silent: true })
  }
  return sent
}

async function replyJourneyStart(ctx: any) {
  // const year = +ctx.match.groups.year
  // const journey = journeys.find(c => +c.year === year)
  // const { title, description, thumb } = journey
  // const user = getUser(ctx)
  // console.log(user)
  // 1. get user doc by user.id
  // const userDoc = ctx.firestore.collection('users').doc(`id${user.id}`)
  // TODO:
  // firestore:
  // user.journey = year
  // user.joinedAt = new Date()
  // remove the journey message
  // send /calendar command
  // await userDoc.get().then(async doc => {
  //   if (!doc.exists) {
  //     console.log(`dunno this user ${user.id}`)
  //     return // TODO: what async and what not?
  //   }
  //   console.log('TODO: set')
  // })
}

module.exports = {
  setupJourneys,
  getJourney,
}
