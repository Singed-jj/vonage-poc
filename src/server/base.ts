// https://tokbox.com/developer/sdks/node/
import OpenTok from 'opentok'
import util from 'util'

import { OPENTOK_API_KEY, OPENTOK_API_SECRET } from './credentials'

let cachedOpenTok: OpenTok

function getOrCreateOpenTokObject() {
  if (cachedOpenTok) {
    return cachedOpenTok
  }
  cachedOpenTok = new OpenTok(OPENTOK_API_KEY, OPENTOK_API_SECRET)
  return cachedOpenTok
}
export async function createSession() {
  const opentok = getOrCreateOpenTokObject()

  const _createSession = util.promisify(opentok.createSession)
  // Important: Only routed OpenTok sessions support live streaming broadcasts.
  return _createSession({ mediaMode: 'routed', archiveMode: 'always' })
}

const oneDayInTime = 24 * 60 * 60
export function generateToken(sessiontId: string, role: OpenTok.Role) {
  const opentok = getOrCreateOpenTokObject()
  const now = new Date().getTime() / 1000
  const token = opentok.generateToken(sessiontId, {
    role,
    expireTime: now + oneDayInTime,
    // data: 'name=Jinjae',
    // initialLayoutClassList: ['focus']
  })

  return token
}

export function startArchive(sessionId: string, archiveName: string) {
  const opentok = getOrCreateOpenTokObject()
  const _startArchive = util.promisify(opentok.startArchive)

  return _startArchive(sessionId, {
    name: archiveName,
    hasAudio: true,
    hasVideo: true,
    outputMode: 'composed',
    resolution: '1280x720', // type is `'640x480' | '1280x720' | undefined`
    // layout: { type: 'custom', stylesheet: 'body { background-color: red; }' },
  })
}

export function stopArchive(archiveId: string) {
  const opentok = getOrCreateOpenTokObject()
  const _stopArchive = util.promisify(opentok.stopArchive)

  return _stopArchive(archiveId)
}
