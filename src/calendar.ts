import { Extra } from 'telegraf'
import { ExtraPhoto } from 'telegraf/typings/telegram-types.d'
import { sql } from 'slonik'
import { reportError } from './utils'
import type { BotMiddleware } from './models/bot'

const channelUrl = 'https://www.youtube.com/@yogawithadriene/playlists'
const calendarYWAUrl = 'https://yogawithadriene.com/calendar/'

const replyCalendar: BotMiddleware = async (ctx) => {
  ctx.state.command = 'calendar'

  // // Check if user is on a Journey?
  // //
  // const user = getUser(ctx)
  // const userDoc = ctx.firestore.collection('users').doc(`id${user.id}`)
  // const journey = await userDoc.get().then(async (doc: any) => {
  //   if (!doc.exists) {
  //     console.log(`dunno this user ${user.id}`)
  //     return
  //   }
  //   const latestJourney = _.maxBy(doc.data().journeys, (j: any) => j.startedAt)
  //   const dayOfJourney = latestJourney && -dayjs(latestJourney.startedAt.toDate()).startOf('day').diff(ctx.now, 'day')

  //   if (_.isNumber(dayOfJourney) && dayOfJourney <= 30) {
  //     const { playlist, calendar, thumb } = getJourney(latestJourney.journey)
  //     return {
  //       today: dayOfJourney,
  //       imageUrl: calendar || thumb,
  //       playlist,
  //     }
  //   }
  // })

  // if (journey) {
  //   // User's Journey calendar
  //   //
  //   return ctx
  //     .replyWithPhoto(
  //       journey.imageUrl,
  //       Extra.caption(`*/today* is *Day ${journey.today}*`)
  //         .markdown()
  //         .markup((m: any) =>
  //           m.inlineKeyboard(
  //             [
  //               m.urlButton('YouTube playlist', journey.playlist),
  //               m.callbackButton('30 Days of Yoga series', 'cb:journeys'),
  //               // TODO: there is no way to switch back to the monthly calendar yet,
  //               // your journey will end in 15 days and you'll be switched to Monthly Calendar
  //               // automatically
  //               // m.callbackButton('Monthly Calendar', 'cb:journey:stop'),
  //             ],
  //             { columns: 1 }
  //           )
  //         )
  //     )
  //     .then(() => (ctx.state.success = true))
  // }
  // Monthly Calendar
  //

  const calendar: { calendar_url: string; playlist_url: string } = await ctx.postgres
    .query(
      sql.unsafe`SELECT calendar_url, playlist_url FROM calendars where year = ${ctx.now.getFullYear()} and month = ${
        ctx.now.getMonth() + 1
      }`
    )
    .then((res) => res.rows[0])

  if (!calendar) {
    return noCalendarMessage(`No calendar record for ${ctx.now.toISOString().substring(0, 7)} in DB`)
  }

  return ctx
    .replyWithPhoto(
      calendar.calendar_url,
      Extra.caption(`*/today* is *Day ${ctx.now.getUTCDate() - ctx.state.journeyDayShift}*`)
        .notifications(false)
        .markdown()
        .markup(
          (m: any) =>
            m.inlineKeyboard(
              [
                m.urlButton('YWA Calendar', calendarYWAUrl),
                m.urlButton('YouTube playlist', calendar.playlist_url || channelUrl), // if no playlist, fallback to the channel
                // m.callbackButton('30 Days of Yoga series', 'cb:journeys')
              ],
              { columns: 2 }
            )
          // XXX: I don't know what I'm doing here
        ) as unknown as ExtraPhoto
    )
    .then(() => {
      ctx.state.success = true
      return ctx
    })
    .catch(async (e) => noCalendarMessage(e))

  async function noCalendarMessage(e: any) {
    console.error('Failed to show calendar', e)
    await reportError({
      ctx,
      where: '/calendar',
      error: e,
      silent: true,
    })
    await ctx.replyWithMarkdown('https://yogawithadriene.com/calendar/')
    return ctx
  }
}

export default replyCalendar
