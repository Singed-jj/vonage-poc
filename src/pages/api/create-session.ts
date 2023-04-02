// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createSession } from '@/server/base'
import type { NextApiRequest, NextApiResponse } from 'next'
import { APIError } from './types'

type Data = {
  sessionId: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | { error: APIError }>
) {
  const session = await createSession()

  if (!session) {
    res.status(500).json({ error: { message: 'Failed to create session' } })
    return
  }

  res.status(200).json({ sessionId: session.sessionId })
}
