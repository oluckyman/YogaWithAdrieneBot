import { Extra } from 'telegraf'
import { ExtraPhoto } from 'telegraf/typings/telegram-types'
import { reportError } from './utils'
import type { BotMiddleware } from './models/bot'

const calendarImageUrl = (now: Date) =>
  (({
    1: 'https://user-images.githubusercontent.com/642673/103418679-02d7c100-4b90-11eb-81ac-57247cfe8522.png',
    2: 'https://yogawithadriene.com/wp-content/uploads/2021/01/February-2021-calendar.png',
    3: 'https://yogawithadriene.com/wp-content/uploads/2021/02/March-2021-calendar.png',
    4: 'https://yogawithadriene.com/wp-content/uploads/2021/03/April-2021-calendar.png',
    // 5: 'https://yogawithadriene.com/wp-content/uploads/2020/04/May-2020-Yoga-Calendar.png',
    // 6: 'https://yogawithadriene.com/wp-content/uploads/2020/05/June-2020-yoga-calendar.png',
    // 7: 'https://yogawithadriene.com/wp-content/uploads/2020/06/YWA-July-2020-Yoga-calendar.png',
    // 8: 'https://yogawithadriene.com/wp-content/uploads/2020/07/YWA-August-2020-Yoga-calendar.png',
    // 9: 'https://yogawithadriene.com/wp-content/uploads/2020/08/YWA-September-2020-Yoga-Calendar-1.png',
    // 10: 'https://yogawithadriene.com/wp-content/uploads/2020/09/Oct.-2020-Yoga-Calendar-.png',
    // 11: 'https://yogawithadriene.com/wp-content/uploads/2020/10/YWA-Nov.-2020-Yoga-Calendar-1.png',
    // 12: 'https://yogawithadriene.com/wp-content/uploads/2020/11/Dec.-2020-Yoga-Calendar.png',
  } as Record<number, string>)[now.getMonth() + 1])
const calendarYouTubeUrl = (now: Date) =>
  (({
    1: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzzJ4NSTesh4xRWg4ZWNz5s4',
    2: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzytwJuOoFMlOtDFjo7MwXZY',
    3: 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzxcg6NNoi7bocbVEkZIfUDl',
    4: 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzxacv05UIXE8n1dyzQUDwyu',
    // 6: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzwubANxngKF0Jx-4fa1QqHk',
    // 7: 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzx9mKxS05DdOY14ahXxJxTV',
    // 8: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzwbGrEZWxUbSmjdpEzRT1TC',
    // 9: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzwJ37AOvztr5NA0LUciJqoD',
    // 10: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzyfM2YN1BndQWyKAWIXdvLz',
    // 11: 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzw8oSuJnpkem3axd29j7NOi',
    // 12: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzwfYsbU4iBdXHorpVjkLx4d',
  } as Record<number, string>)[now.getMonth() + 1])
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
  return ctx
    .replyWithPhoto(
      calendarImageUrl(ctx.now),
      (Extra.caption(`*/today* is *Day ${ctx.now.getDate() - ctx.state.journeyDayShift}*`)
        .notifications(false)
        .markdown()
        .markup(
          (m: any) =>
            m.inlineKeyboard(
              [
                m.urlButton('YWA Calendar', calendarYWAUrl),
                m.urlButton('YouTube playlist', calendarYouTubeUrl(ctx.now)),
                // m.callbackButton('30 Days of Yoga series', 'cb:journeys')
              ],
              { columns: 2 }
            )
          // XXX: I don't know what I'm doing here
        ) as unknown) as ExtraPhoto
    )
    .then(() => {
      ctx.state.success = true
      return ctx
    })
    .catch(async (e) => {
      console.error('Failed to show calendar', e)
      await reportError({
        ctx,
        where: '/calendar',
        error: e,
        silent: true,
      })
      await ctx.replyWithMarkdown(
        'Oh, calendar is not working now. Sorry for that. Check out https://yogawithadriene.com/calendar/'
      )
      return ctx
    })
}

export default replyCalendar
