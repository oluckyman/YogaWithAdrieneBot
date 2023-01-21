import { Configuration, OpenAIApi } from 'openai'
import { RouterBuilder } from 'next-api-handler'
import * as config from '@/config'

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
)

const router = new RouterBuilder({ showMessage: true })
router.get<{ answer: string }>(async (req) => {
  const query = req.query.query as string
  const answer = await askGpt(query)
  return { answer }
})
export default router.build()

export async function askGpt(query: string) {
  const prompt = query // buildPrompt(query)
  const answer = await sendPrompt(prompt)
  return answer
}

async function sendPrompt(prompt: string, max_tokens = 256, temperature = 0.4) {
  console.info('===> sendPrompt', { prompt, max_tokens, temperature })
  const response = await openai.createCompletion({
    model: config.openaiCompletionModel,
    prompt,
    max_tokens,
    temperature,
  })
  console.info('===> got prompt', response.data)
  return response.data.choices[0].text.trim()
}
