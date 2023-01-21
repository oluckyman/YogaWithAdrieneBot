import { RouterBuilder } from 'next-api-handler'
import { setTimeout } from 'node:timers/promises'

const router = new RouterBuilder()

router.get<{ answer: string }>(async (req) => {
  const query = req.query.query as string
  const answer = await askGpt(query)
  return { answer }
})

export async function askGpt(query: string) {
  await setTimeout(1000)
  return query + new Date()
}

export default router.build()
