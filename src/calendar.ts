import { Extra } from 'telegraf'
import { ExtraPhoto } from 'telegraf/typings/telegram-types.d'
import { reportError } from './utils'
import type { BotMiddleware } from './models/bot'

const calendarImageUrl = (now: Date) =>
  ((
    {
      '2022-01': 'https://user-images.githubusercontent.com/642673/147842239-5c76c910-9564-484c-9cf6-83091f3258ce.png',
      '2022-02': 'https://s37280.pcdn.co/wp-content/uploads/2022/01/FEBRUARY-2022-CALENDAR-792-x-612-px.png',
      '2022-03':
        'https://s37280.pcdn.co/wp-content/uploads/2022/02/MARCH-2022-YOGA-CALENDAR-FWFG-Version-792-%C3%97-612-px.png',
      '2022-04':
        'https://s37280.pcdn.co/wp-content/uploads/2022/03/APRIL-2022-YOGA-CALENDAR-YWA-version-792-%C3%97-612-px.png',
      '2022-05':
        'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/themes/2380946/settings_images/eYEHyIVxSj6fAldPMAYy_May_2022_Yoga_Calendar_-_FLOW.png',
      '2022-06': 'https://user-images.githubusercontent.com/642673/171200033-9d872cb2-3469-401e-b54d-89117f088aa9.png',
      '2022-07': 'https://user-images.githubusercontent.com/642673/176765140-04b0a1f3-d45f-4730-93c2-e6c926edbdfa.png',
      '2022-08': 'https://user-images.githubusercontent.com/642673/182041648-a57166ee-0149-4aef-b4c8-5a37ebc0d905.png',
      '2022-09': 'https://user-images.githubusercontent.com/642673/187859837-797f256c-6cfd-4bbd-bafe-737f208e3925.png',
      // 10: 'https://s37280.pcdn.co/wp-content/uploads/2021/09/October-2021-yoga-calendar-792-x-612-px.png',
      // 11: 'https://s37280.pcdn.co/wp-content/uploads/2021/10/November-2021-yoga-calendar.png',
      // 12: 'https://s37280.pcdn.co/wp-content/uploads/2021/11/BALANCE-December-2021-yoga-calendar-1080-x-1080-px-1024x1024.png',
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
      // 10: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzzjC8bTZV9jrvfQNveSSZvb',
      // 11: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzzDCd9xCgPLKsIuTV7tZgac',
      // 12: 'https://www.youtube.com/playlist?list=PLui6Eyny-UzzcTsiPyFR8m_gLnaUm0vw8',
    } as Record<string, string>
  )[now.toISOString().substring(0, 7)])
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
    .catch(async (e) => {
      return noCalendarMessage(e)
    })

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
