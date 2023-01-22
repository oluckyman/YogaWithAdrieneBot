import { Configuration, OpenAIApi } from 'openai'
import { RouterBuilder } from 'next-api-handler'
import * as config from '@/config'
import { type Document, pineconeQuery } from '../../lib/pinecone'

const CONTEXT_MAX_TOKENS = 1500
const ANSWER_MAX_TOKENS = 256
const TEMPERATURE = 0.4

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
)

const router = new RouterBuilder({ showMessage: true })
router.get<{ answer: string }>(async (req) => {
  const query = req.query.query as string
  if (!query) throw new Error('Missing `query` parameter.')
  const answer = await askGpt(query)
  return { answer }
})
export default router.build()

export async function askGpt(query: string) {
  const prompt = await buildPrompt(query)
  const answer = await sendPrompt(prompt)
  return answer
}

async function buildPrompt(query: string): Promise<string> {
  const documents = await searchDocuments(query)
  const context = await buildContext(documents)

  // const INSTRUCTION = `You can ask me about anything related to the following documents:`
  // const INSTRUCTION = `Please answer this question in a way that a human would understand. You can use the context below to help you.`
  const INSTRUCTION = `
The following conversation is with YogaWithAdrieneBot in Telegram.
The YogaWithAdrieneBot shows intent to answer yoga-related questions and recommend
relevant videos from the Yoga With Adriene YouTube channel.
The YogaWithAdrieneBot is firendly and empathetic.
`
    .trim()
    .replaceAll(/\n/g, ' ')

  return `${INSTRUCTION}\n
Context:
${context}\n
A: hi there, how can I help you?
Q: ${query}
A:`
}

async function searchDocuments(query: string, topK = 20): Promise<Document[]> {
  const embedding = await createEmbedding(query)
  const documents = await pineconeQuery(embedding, topK)
  return documents
}

async function createEmbedding(text: string, model = config.openaiEmbeddingModel): Promise<number[]> {
  // replace newlines, which can negatively affect performance.
  // TODO: normalize and cache embeddings
  const textToEmbed = text.replaceAll('\n', ' ')
  const response = await openai.createEmbedding({
    input: [textToEmbed],
    model,
  })
  return response.data.data[0].embedding
}

async function buildContext(documents: Document[]): Promise<string> {
  const docs = documents.map((doc) => {
    const url = `https://youtu.be/${doc.video_id}`
    const title = doc.title
      .replace(' - Yoga With Adriene', '')
      .replace('  |  Yoga With Adriene', '')
      .replace(' | Yoga With Adriene', '')
      .replaceAll(/\s+/g, ' ')
      .trim()
    const description = doc.description.split('- - -')[0].replaceAll(/\s+/g, ' ').trim()
    const duration = `${doc.duration} minutes`
    const theDoc = `Title: ${title}\nURL: ${url}\nDuration: ${duration}\nDescription: ${description}`
      .replace(/#\w+/g, '') // remove hashtags
      .trim()
    return theDoc
  })
  const tokens: number[] = await Promise.all(
    docs.map((doc) =>
      // Fetch API that calcs tokeens for us https://ywa-ai.vercel.app/api/tiktoken?text={doc}
      fetch(`https://ywa-ai.vercel.app/api/tiktoken?text=${encodeURIComponent(doc)}`)
        .then((res) => res.json())
        .then((res) => res.tokens)
    )
  )

  const SEPARATOR = '\n===\n'
  const separatorTokens = 2 // calculated by hand

  let context = ''
  let contextTokens = 0
  for (let i = 0; i < docs.length; i += 1) {
    const doc = docs[i]
    const docTokens = tokens[i]
    contextTokens += docTokens + separatorTokens
    if (contextTokens - separatorTokens > CONTEXT_MAX_TOKENS) break
    if (i > 0) context += SEPARATOR
    context += doc
  }

  return context
}

async function sendPrompt(prompt: string, max_tokens = ANSWER_MAX_TOKENS, temperature = TEMPERATURE): Promise<string> {
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
