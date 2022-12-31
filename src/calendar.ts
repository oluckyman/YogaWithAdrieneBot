import { Extra } from 'telegraf'
import { ExtraPhoto } from 'telegraf/typings/telegram-types.d'
import { reportError } from './utils'
import type { BotMiddleware } from './models/bot'

const calendarImageUrl = (now: Date) =>
  ((
    {
      '2023-01': 'https://user-images.githubusercontent.com/642673/210156844-2c366265-cd07-4ee4-8ecb-5b616d1e8148.png',
      // '2022-02': 'https://s37280.pcdn.co/wp-content/uploads/2022/01/FEBRUARY-2022-CALENDAR-792-x-612-px.png',
      // '2022-03':
      //   'https://s37280.pcdn.co/wp-content/uploads/2022/02/MARCH-2022-YOGA-CALENDAR-FWFG-Version-792-%C3%97-612-px.png',
      // '2022-04':
      //   'https://s37280.pcdn.co/wp-content/uploads/2022/03/APRIL-2022-YOGA-CALENDAR-YWA-version-792-%C3%97-612-px.png',
      // '2022-05':
      //   'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/themes/2380946/settings_images/eYEHyIVxSj6fAldPMAYy_May_2022_Yoga_Calendar_-_FLOW.png',
      // '2022-06': 'https://user-images.githubusercontent.com/642673/171200033-9d872cb2-3469-401e-b54d-89117f088aa9.png',
      // '2022-07': 'https://user-images.githubusercontent.com/642673/176765140-04b0a1f3-d45f-4730-93c2-e6c926edbdfa.png',
      // '2022-08': 'https://user-images.githubusercontent.com/642673/182041648-a57166ee-0149-4aef-b4c8-5a37ebc0d905.png',
      // '2022-09': 'https://user-images.githubusercontent.com/642673/187859837-797f256c-6cfd-4bbd-bafe-737f208e3925.png',
      // '2022-10': 'https://user-images.githubusercontent.com/642673/193360482-4723cdd7-b0f1-4cd2-8a69-3395c4899c82.png',
      // '2022-11': 'https://user-images.githubusercontent.com/642673/199069127-9cc12074-3735-49f1-802d-917a199500f9.png',
      '2022-12': 'https://user-images.githubusercontent.com/642673/204926527-9d599450-3a1a-42f6-8d0d-9046cf8ff70e.png',
    } as Record<string, string>
  )[now.toISOString().substring(0, 7)])
const calendarYouTubeUrl = (now: Date) =>
  ((
    {
      '2022-01': 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzyp5P3Vcuv5qCHQOC8W6grN',
      '2022-02': 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzxyew3G11NEFpemvwrxQKCh',
      '2022-03': 'https://www.youtube.com/playlist?list=PLui6Eyny-UzxP2THkbEIIMnGHvYg9uGhU',
      '2022-04': 'https://www.youtube.com/playlist?list=PLui6Eyny-UzzPMQfXSBQWOJ_pAceAvkOq',
      '2022-05': 'https://www.youtube.com/playlist?list=PLui6Eyny-UzwV0hJTsAaV0k-9cu_yfaiy',
      '2022-06': 'https://www.youtube.com/playlist?list=PLui6Eyny-UzwNH_udMpOfAoerkI2RARGf',
      '2022-07': 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzy-WzVHwASw98pbrQ-X1qU3',
      '2022-08': 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzz94AKMlazzOotWUCRaEtdq',
      '2022-09': 'https://www.youtube.com/playlist?list=PLui6Eyny-UzzYEr8rJOs1yrdguY4pTOyv',
      '2022-10': 'https://www.youtube.com/playlist?list=PLui6Eyny-UzyzAQS01ugd8xDQH6KU4V4v',
      '2022-11': 'https://www.youtube.com/playlist?list=PLui6Eyny-Uzzxnt1jXd_4IRKWL9LU5Nuz',
      '2022-12': 'https://www.youtube.com/playlist?list=PLui6Eyny-UzzhGGZw93tundCv24fq6Y2P',
      '2023-01': '',
    } as Record<string, string>
  )[now.toISOString().substring(0, 7)] ||
  // if no playlist, fallback to the channel
  'https://www.youtube.com/@yogawithadriene/playlists')
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

  if (!calendarImageUrl(ctx.now) || !calendarYouTubeUrl(ctx.now)) {
    return noCalendarMessage('No calendar image or playlist URL')
  }

  return ctx
    .replyWithPhoto(
      calendarImageUrl(ctx.now),
      Extra.caption(`*/today* is *Day ${ctx.now.getDate() - ctx.state.journeyDayShift}*`)
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
