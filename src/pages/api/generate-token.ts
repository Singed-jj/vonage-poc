// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { generateToken } from '@/server/base'
import type { NextApiRequest, NextApiResponse } from 'next'
import { APIError } from './types'

type Data = {
  token: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | { error: APIError }>
) {
  const { sessionId, role } = req.body

  if (typeof sessionId !== 'string') {
    res
      .status(500)
      .json({ error: { message: `${sessionId} is not a string type.` } })
    return
  }

  if (role !== 'publisher' && role !== 'subscriber') {
    res.status(500).json({ error: { message: `${role} is not a valid role.` } })
    return
  }
  const token = generateToken(sessionId, role)

  res.status(200).json({ token })
}
