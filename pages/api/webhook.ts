import { NextApiRequest, NextApiResponse } from 'next'
import bot from '../../src/index'

const { HOST, WEBHOOK_SECRET } = process.env

export default async function webhookHandler(req: NextApiRequest, res: NextApiResponse) {
  // For local development
  if (req.query.dev === 'true' && process.env.NODE_ENV === 'development' && !HOST) {
    await bot.launch()
    res.status(200).send('OK')
    return
  }

  try {
    // Retrieve the POST request body that gets sent from Telegram
    const { body, query } = req

    if (query.setWebhook === 'true') {
      const webhookUrl = `https://${HOST}/api/webhook?secret=${WEBHOOK_SECRET}`

      // Would be nice to somehow do this in a build file or something
      const isSet = await bot.telegram.setWebhook(webhookUrl)
      console.info(`Set webhook to ${webhookUrl}: ${isSet}`)
    }

    if (query.secret === WEBHOOK_SECRET) {
      await bot.handleUpdate(body)
    }
  } catch (error) {
    // If there was an error sending our message then we
    // can log it into the Vercel console
    console.error('Error sending message')
    console.error(error)
  }

  // Acknowledge the message with Telegram
  // by sending a 200 HTTP status code
  // The message here doesn't matter.
  res.status(200).json({
    OK: true,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    HOST,
  })
}
