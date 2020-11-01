// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable '_'.
const _ = require('lodash')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'Extra'.
const Extra = require('telegraf/extra')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'dayjs'.
const dayjs = require('dayjs')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'getUser'.
const { getUser } = require('./utils')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'getJourney... Remove this comment to see the full error message
const { getJourney } = require('./journeys')

const calendarImageUrl = (now: Date) =>
  (({
    5: 'https://yogawithadriene.com/wp-content/uploads/2020/04/May-2020-Yoga-Calendar.png',
    6: 'https://yogawithadriene.com/wp-content/uploads/2020/05/June-2020-yoga-calendar.png',
    7: 'https://yogawithadriene.com/wp-content/uploads/2020/06/YWA-July-2020-Yoga-calendar.png',
    8: 'https://yogawithadriene.com/wp-content/uploads/2020/07/YWA-August-2020-Yoga-calendar.png',
    9: 'https://yogawithadriene.com/wp-content/uploads/2020/08/YWA-September-2020-Yoga-Calendar-1.png',
    10: 'https://yogawithadriene.com/wp-content/uploads/2020/09/Oct.-2020-Yoga-Calendar-.png',
    11: 'https://yogawithadriene.com/wp-content/uploads/2020/10/YWA-Nov.-2020-Yoga-Calendar-1.png',
  } as Record<number, string>)[now.getMonth() + 1])
const calendarYouTubeUrl = (now: Date) =>
  (({
    5: 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzy0o-rTUNVczfgF5AjNyCPH',
    6: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzwubANxngKF0Jx-4fa1QqHk',
    7: 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzx9mKxS05DdOY14ahXxJxTV',
    8: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzwbGrEZWxUbSmjdpEzRT1TC',
    9: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzwJ37AOvztr5NA0LUciJqoD',
    10: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzyfM2YN1BndQWyKAWIXdvLz',
    11: 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzw8oSuJnpkem3axd29j7NOi',
  } as Record<number, string>)[now.getMonth() + 1])
const calendarYWAUrl = 'https://yogawithadriene.com/calendar/'

const replyCalendar = async (ctx: any) => {
  ctx.state.command = 'calendar'
  // Check if user is on a Journey?
  //
  const user = getUser(ctx)
  const userDoc = ctx.firestore.collection('users').doc(`id${user.id}`)
  const journey = await userDoc.get().then(async (doc: any) => {
    if (!doc.exists) {
      console.log(`dunno this user ${user.id}`)
      return
    }
    const latestJourney = _.maxBy(doc.data().journeys, (j: any) => j.startedAt)
    const dayOfJourney = latestJourney && -dayjs(latestJourney.startedAt.toDate()).startOf('day').diff(ctx.now, 'day')

    if (_.isNumber(dayOfJourney) && dayOfJourney <= 30) {
      const { playlist, calendar, thumb } = getJourney(latestJourney.journey)
      return {
        today: dayOfJourney,
        imageUrl: calendar || thumb,
        playlist,
      }
    }
  })

  if (journey) {
    // User's Journey calendar
    //
    return ctx
      .replyWithPhoto(
        journey.imageUrl,
        Extra.caption(`*/today* is *Day ${journey.today}*`)
          .markdown()
          .markup((m: any) =>
            m.inlineKeyboard(
              [
                m.urlButton('YouTube playlist', journey.playlist),
                m.callbackButton('30 Days of Yoga series', 'cb:journeys'),
                // TODO: there is no way to switch back to the monthly calendar yet,
                // your journey will end in 15 days and you'll be switched to Monthly Calendar
                // automatically
                // m.callbackButton('Monthly Calendar', 'cb:journey:stop'),
              ],
              { columns: 1 }
            )
          )
      )
      .then(() => (ctx.state.success = true))
  }
  // Monthly Calendar
  //
  return ctx
    .replyWithPhoto(
      calendarImageUrl(ctx.now),
      Extra.caption(`*/today* is *Day ${ctx.now.getDate()}*`)
        .markdown()
        .markup((m: any) =>
          m.inlineKeyboard(
            [
              m.urlButton('YWA Calendar', calendarYWAUrl),
              m.urlButton('YouTube playlist', calendarYouTubeUrl(ctx.now)),
              // m.callbackButton('30 Days of Yoga series', 'cb:journeys')
            ],
            { columns: 2 }
          )
        )
    )
    .then(() => (ctx.state.success = true))
}

// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'setupCalen... Remove this comment to see the full error message
function setupCalendar(bot: any) {
  bot.command('/calendar', replyCalendar)
  bot.hears(bot.menu.calendar, replyCalendar)
}

module.exports = setupCalendar
