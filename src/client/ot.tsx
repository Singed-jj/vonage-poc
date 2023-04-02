import * as React from 'react'
import { apiKey } from './constants'
import * as OT from '@opentok/client'

interface Context {
  // getSession(): OT.Session | null
  connect(sessionId: string, role: SessionRole): Promise<boolean>
  disconnect(sessionId: string): void
  startPublish(sessionId: string): void
  stopPublish(sessionId: string): void
  startSubscribe(sessionId: string, targetElement?: HTMLElement): void
  stopSubscribe(sessionId: string): void
  updateCurrentAudioInputSourceToNextSource(): Promise<void>
  updateCurrentVideoInputSourceToNextSource(): Promise<void>
  setVideoResolutionQuality(quality: videoResolutionQuality): void
}

export const OTContext = React.createContext<Context>({
  // getSession: () => null,
  connect: () => new Promise(() => null),
  disconnect: () => null,
  startPublish: () => null,
  stopPublish: () => null,
  startSubscribe: () => null,
  stopSubscribe: () => null,
  updateCurrentAudioInputSourceToNextSource: () => new Promise(() => null),
  updateCurrentVideoInputSourceToNextSource: () => new Promise(() => null),
  setVideoResolutionQuality: () => null,
})

type SessionRole = 'publisher' | 'subscriber'
type videoResolutionQuality = 'low' | 'medium' | 'high'

export const OTProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const session = React.useRef<Map<string, OT.Session>>(new Map()) // {[sessionId]: Session}
  const publisher = React.useRef<OT.Publisher>()
  const subscriber = React.useRef<OT.Subscriber>()
  const token = React.useRef<Map<string, string>>(new Map()) // {[sessionId]: token}

  const getInputDevices = React.useCallback(
    async (mediaType: 'audio' | 'video') => {
      return new Promise<OT.Device[]>((resolve, reject) => {
        OT.getDevices(function (error, devices) {
          if (!devices) {
            OT.log('No devices found.')
            reject(error)
            return
          }

          const inputDevices = devices.filter(function (element) {
            return element.kind == `${mediaType}Input`
          })

          resolve(inputDevices)
        })
      })
    },
    []
  )

  // TODO: 하나의 sessoin은 여러개의 stream을 가질 수 있습니다.
  const stream = React.useRef<OT.Stream>()
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

    _session.on('streamCreated', (val) => {
      stream.current = val.stream
    })

    return _session
  }, [])

  const getSessionToken = React.useCallback(
    async (sessionId: string, role: SessionRole) => {
      const oldToken = token.current.get(sessionId)
      if (oldToken) {
        return oldToken
      }

      const res = await fetch(`/api/generate-token`, {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          role,
          sessionId,
        }),
      })
      const result = await res.json()
      const { token: _token } = result

      token.current.set(sessionId, _token)
      return _token
    },
    []
  )

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

  const [currentVideoInputSourceIdx, setCurrentVideoInputSourceIdx] =
    React.useState(0)
  const [currentAudioInputSourceIdx, setCurrentAudioInputSourceIdx] =
    React.useState(0)

  const getNextInputSource = React.useCallback(
    async (mediaType: 'audio' | 'video') => {
      const sources = await getInputDevices(mediaType)

      console.log({ mediaSources: sources })
      const length = sources.length

      const currentIdx =
        (mediaType === 'audio'
          ? currentAudioInputSourceIdx
          : currentVideoInputSourceIdx) + 1
      return sources[currentIdx % length]
    },
    [currentAudioInputSourceIdx, currentVideoInputSourceIdx, getInputDevices]
  )

  const updateCurrentVideoInputSourceToNextSource =
    React.useCallback(async () => {
      const targetVideoInputSource = await getNextInputSource('video')
      setCurrentVideoInputSourceIdx((prev) => {
        publisher.current?.setVideoSource(targetVideoInputSource.deviceId)
        return prev + 1
      })
    }, [getNextInputSource])

  const updateCurrentAudioInputSourceToNextSource =
    React.useCallback(async () => {
      const targetAudioInputSource = await getNextInputSource('audio')

      console.log({
        targetAudioInputSourceDeviceId: targetAudioInputSource.deviceId,
      })

      console.log({ publisher })
      setCurrentAudioInputSourceIdx((prev) => {
        publisher.current?.setAudioSource(targetAudioInputSource.deviceId)
        return prev + 1
      })
    }, [getNextInputSource])

  const connect = React.useCallback(
    async (sessionId: string, role: SessionRole): Promise<boolean> => {
      const _token = await getSessionToken(sessionId, role)

      console.log({ token: _token, sessionIdShouldBeTargeted: sessionId })
      const _session = getSessionInstance(sessionId)

      return new Promise((resolve, reject) => {
        _session.connect(_token, (error) => {
          if (error) {
            console.log('Error connecting: ', error.name, error.message)
            reject(error)
          } else {
            console.log('Connected to the session.')
            addReconnectHandler(sessionId)
            resolve(true)
          }
        })
      })
    },
    [addReconnectHandler, getSessionInstance, getSessionToken]
  )

  const _destroyPublisher = React.useCallback(() => {
    if (!publisher.current) {
      return
    }

    publisher.current.destroy()
    publisher.current = undefined
  }, [])

  const disconnect = React.useCallback(
    (sessionId: string) => {
      const _session = getSessionInstance(sessionId)
      _session.disconnect()
      _destroyPublisher()
    },
    [_destroyPublisher, getSessionInstance]
  )

  const getPublisherInstance = React.useCallback(() => {
    if (publisher.current) {
      return publisher.current
    }

    const _publisher = OT.initPublisher(
      undefined,
      {
        insertMode: 'append',
        resolution: '1920x1080',
        frameRate: 30,
        audioBitrate: 48000,
        autoGainControl: false,
        echoCancellation: false,
        enableStereo: true,
        noiseSuppression: false,
      },
      function (error) {
        console.log('OT.initPublisher error: ', error)
      }
    )

    _publisher.on({
      accessAllowed: (event: any) => {
        OT.log(`accessAllowed: ${event}`)
        // The user has granted access to the camera and mic.
      },
      accessDenied: (event: any) => {
        // The user has denied access to the camera and mic.
        OT.log(`accessDenied: ${event}`)
      },
      streamCreated: (event: any) => {
        OT.log(`The publisher started streaming. ${event}`)
      },
      streamDestroyed: (event: any) => {
        OT.log('The publisher stopped streaming. Reason: ' + event.reason)
      },
    })

    publisher.current = _publisher
    return _publisher
  }, [])

  const startPublish = React.useCallback(
    (sessionId: string) => {
      const _session = getSessionInstance(sessionId)
      const _publisher = getPublisherInstance()

      _session.publish(_publisher, function (error) {
        if (error) {
          console.log(error)
        } else {
          console.log('Publishing a stream.')
        }
      })
    },
    [getPublisherInstance, getSessionInstance]
  )

  const stopPublish = React.useCallback(
    (sessionId: string) => {
      const _session = getSessionInstance(sessionId)
      const _publisher = getPublisherInstance()
      _session.unpublish(_publisher)
    },
    [getPublisherInstance, getSessionInstance]
  )

  const setVideoResolutionQuality = React.useCallback(
    (quality: videoResolutionQuality) => {
      if (!subscriber.current) {
        return
      }
      const _subscriberVideoResolution =
        quality === 'high'
          ? { width: 1920, height: 1080 }
          : quality === 'medium'
          ? { width: 960, height: 540 }
          : { width: 480, height: 270 }
      subscriber.current.setPreferredResolution(_subscriberVideoResolution)
    },
    []
  )

  const startSubscribe = React.useCallback(
    (sessionId: string, targetElement?: HTMLElement) => {
      if (stream.current) {
        const _session = getSessionInstance(sessionId)
        const _subscriber = _session.subscribe(stream.current, targetElement, {
          fitMode: 'contain',
          insertDefaultUI: true,
          showControls: false,
          insertMode: 'append',
          width: '100%',
          height: '100%',
        })

        _subscriber.on({
          disconnected: function () {
            // Display a user interface notification.
            OT.log('The subscriber disconnected.')
          },
          connected: function () {
            OT.log('The subscriber connected.')
            // Adjust user interface.
          },
          destroyed: function () {
            OT.log('The subscriber destroyed.')
            // Adjust user interface.
          },
        })

        subscriber.current = _subscriber
      }
    },
    [getSessionInstance]
  )

  const stopSubscribe = React.useCallback(
    (sessionId: string) => {
      const _session = getSessionInstance(sessionId)
      if (subscriber.current) {
        _session.unsubscribe(subscriber.current)
        subscriber.current = undefined
      }
    },
    [getSessionInstance]
  )

  const providerValue = React.useMemo<Context>(
    () => ({
      connect,
      disconnect,
      startPublish,
      stopPublish,
      startSubscribe,
      stopSubscribe,
      updateCurrentAudioInputSourceToNextSource,
      updateCurrentVideoInputSourceToNextSource,
      setVideoResolutionQuality,
    }),
    [
      connect,
      disconnect,
      startPublish,
      stopPublish,
      startSubscribe,
      stopSubscribe,
      updateCurrentAudioInputSourceToNextSource,
      updateCurrentVideoInputSourceToNextSource,
      setVideoResolutionQuality,
    ]
  )

  return (
    <OTContext.Provider value={providerValue}>{children}</OTContext.Provider>
  )
}
