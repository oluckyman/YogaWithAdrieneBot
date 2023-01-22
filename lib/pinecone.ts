import { PineconeClient } from 'pinecone-client'
import * as config from '@/config'
import { pick } from '@/utils'

export type Document = {
  video_id: string
  title: string
  duration: number
  description: string
}

// initialize connection to pinecone (get API key at app.pinecone.io)
const pinecone = new PineconeClient<Document>({
  apiKey: process.env.PINECONE_API_KEY,
  baseUrl: process.env.PINECONE_BASE_URL,
})

export async function pineconeQuery(embedding: number[], topK = 20): Promise<Document[]> {
  const { matches } = await pinecone.query({
    vector: embedding,
    topK,
    namespace: config.pineconeNamespace,
    includeMetadata: true,
    includeValues: false,
  })

  const documents = matches.map((match) => match.metadata).map(pick(['video_id', 'title', 'duration', 'description']))
  return documents
}
