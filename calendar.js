const _ = require('lodash')
const Extra = require('telegraf/extra')
const dayjs = require('dayjs')
const { getUser } = require('./utils')
const { getJourney } = require('./journeys')

const calendarImageUrl = now => ({
  5: 'https://yogawithadriene.com/wp-content/uploads/2020/04/May-2020-Yoga-Calendar.png',
  6: 'https://yogawithadriene.com/wp-content/uploads/2020/05/June-2020-yoga-calendar.png',
  7: 'https://yogawithadriene.com/wp-content/uploads/2020/06/YWA-July-2020-Yoga-calendar.png',
  8: 'https://yogawithadriene.com/wp-content/uploads/2020/07/YWA-August-2020-Yoga-calendar.png',
  9: 'https://yogawithadriene.com/wp-content/uploads/2020/08/YWA-September-2020-Yoga-Calendar-1.png',
  10: 'https://yogawithadriene.com/wp-content/uploads/2020/09/Oct.-2020-Yoga-Calendar-.png',
}[now.getMonth() + 1])
const calendarYouTubeUrl = now => ({
  5: 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzy0o-rTUNVczfgF5AjNyCPH',
  6: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzwubANxngKF0Jx-4fa1QqHk',
  7: 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzx9mKxS05DdOY14ahXxJxTV',
  8: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzwbGrEZWxUbSmjdpEzRT1TC',
  9: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzwJ37AOvztr5NA0LUciJqoD',
  10: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzyfM2YN1BndQWyKAWIXdvLz',
}[now.getMonth() + 1])
const calendarYWAUrl = 'https://yogawithadriene.com/calendar/'

const replyCalendar = async ctx => {
  ctx.state.command = 'calendar'
  // Check if user is on a Journey?
  //
  const user = getUser(ctx)
  const userDoc = ctx.firestore.collection('users').doc(`id${user.id}`)
  const journey = await userDoc.get().then(async doc => {
    if (!doc.exists) {
      console.log(`dunno this user ${user.id}`)
      return
    }
    const latestJourney = _.maxBy(doc.data().journeys, j => j.startedAt)
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
    return ctx.replyWithPhoto(journey.imageUrl, Extra
      .caption(`*/today* is *Day ${journey.today}*`)
      .markdown()
      .markup(m => m.inlineKeyboard([
        m.urlButton('YouTube playlist', journey.playlist),
        m.callbackButton('30 Days of Yoga series', 'cb:journeys'),
        // TODO: there is no way to switch back to the monthly calendar yet,
        // your journey will end in 15 days and you'll be switched to Monthly Calendar
        // automatically
        // m.callbackButton('Monthly Calendar', 'cb:journey:stop'),
      ], { columns: 1 }))
    ).then(() => ctx.state.success = true)
  } else {
    // Monthly Calendar
    //
    return ctx.replyWithPhoto(calendarImageUrl(ctx.now), Extra
      .caption(`*/today* is *Day ${ctx.now.getDate()}*`)
      .markdown()
      .markup(m => m.inlineKeyboard([
        m.urlButton('YWA Calendar', calendarYWAUrl),
        m.urlButton('YouTube playlist', calendarYouTubeUrl(ctx.now)),
        // m.callbackButton('30 Days of Yoga series', 'cb:journeys')
      ], { columns: 2 }))
    ).then(() => ctx.state.success = true)
  }
}

function setupCalendar(bot) {
  bot.command('/calendar', replyCalendar)
  bot.hears(bot.menu.calendar, replyCalendar)
}

module.exports = setupCalendar
