const Extra = require('telegraf/extra')

const calendarImageUrl = now => ({
  5: 'https://yogawithadriene.com/wp-content/uploads/2020/04/May-2020-Yoga-Calendar.png',
  6: 'https://yogawithadriene.com/wp-content/uploads/2020/05/June-2020-yoga-calendar.png',
}[now.getMonth() + 1])
const calendarYouTubeUrl = now => ({
  5: 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzy0o-rTUNVczfgF5AjNyCPH',
  6: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzwubANxngKF0Jx-4fa1QqHk',
}[now.getMonth() + 1])
const calendarYWAUrl = 'https://yogawithadriene.com/calendar/'

const replyCalendar = ctx => ctx.replyWithPhoto(calendarImageUrl(ctx.now), Extra
  .caption(`*/today* is *Day ${ctx.now.getDate()}*`)
  .markdown()
  .markup(m => m.inlineKeyboard([
    m.urlButton('YWA Calendar', calendarYWAUrl),
    m.urlButton('YouTube playlist', calendarYouTubeUrl(ctx.now)),
    m.callbackButton('30 Days of Yoga series', 'cb:journeys')
  ], { columns: 2 }))
).then(() => ctx.state.success = true)

function setupCalendar(bot) {
  bot.command('/calendar', replyCalendar)
  bot.hears(bot.menu.calendar, replyCalendar)
}

module.exports = setupCalendar
