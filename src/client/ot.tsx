import * as React from 'react'
import { apiKey } from './constants'
import * as OT from '@opentok/client'

interface Context {
  // getSession(): OT.Session | null
  connect(sessionId: string): void
  disconnect(sessionId: string): void
  publish(sessionId: string): void
  subscribe(sessionId: string): void
}

export const OTContext = React.createContext<Context>({
  // getSession: () => null,
  connect: () => null,
  disconnect: () => null,
  publish: () => null,
  subscribe: () => null,
})

export const OTProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const session = React.useRef<Map<string, OT.Session>>(new Map())
  const token = React.useRef<Map<string, string>>(new Map())

  const getSessionInstance = React.useCallback((sessionId: string) => {
    if (OT.checkSystemRequirements() != 1) {
      throw new Error('The client does not support WebRTC.')
    }

    const oldSession = session.current.get(sessionId)
    if (oldSession) {
      return oldSession
    }

    const _session = OT.initSession(apiKey, sessionId)
    session.current.set(sessionId, _session)

    return _session
  }, [])

  const getSessionToken = React.useCallback(async (sessionId: string) => {
    const oldToken = token.current.get(sessionId)
    if (oldToken) {
      return oldToken
    }

    const res = await fetch(`/api/ot/token?sessionId=${sessionId}`)
    const result = await res.json()
    const { token: _token } = result

    token.current.set(sessionId, _token)
    return _token
  }, [])

  const addReconnectHandler = React.useCallback(
    (sessionId: string) => {
      const _session = getSessionInstance(sessionId)
      _session.on('sessionReconnecting', () => {
        console.log('session reconnecting')
      })

      _session.on('sessionReconnected', () => {
        console.log('session reconnected')
      })
      _session.on('sessionDisconnected', () => {
        console.log('session disconnected')
      })
    },
    [getSessionInstance]
  )

  const connect = React.useCallback(
    async (sessionId: string) => {
      const _token = await getSessionToken(sessionId)
      const _session = getSessionInstance(sessionId)

      _session.connect(_token, (error) => {
        if (error) {
          console.log('Error connecting: ', error.name, error.message)
        } else {
          console.log('Connected to the session.')
        }
      })
      addReconnectHandler(sessionId)
    },
    [addReconnectHandler, getSessionInstance, getSessionToken]
  )

  const disconnect = React.useCallback(
    (sessionId: string) => {
      const _session = getSessionInstance(sessionId)
      _session.disconnect()
    },
    [getSessionInstance]
  )

  const providerValue = React.useMemo<Context>(
    () => ({
      connect,
      disconnect,
      publish,
      subscribe,
    }),
    []
  )

  return (
    <OTContext.Provider value={providerValue}>{children}</OTContext.Provider>
  )
}
