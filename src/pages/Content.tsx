import * as React from 'react'
import { OTContext, OTProvider } from '@/client/ot'

export const Content: React.FC = () => {
  return (
    <OTProvider>
      <_Content />
    </OTProvider>
  )
}

function Title({ title }: { title: string }) {
  return <h1>{title}</h1>
}

function Spacer({ width, height }: { width?: number; height?: number }) {
  return <div style={{ height, width }} />
}

function Button({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button style={{ height: 50, width: 200 }} onClick={onClick}>
      <h3>{title}</h3>
    </button>
  )
}

function _Content() {
  const [sessionId, setSessionId] = React.useState<string>('')
  const videoContainerRef = React.useRef<HTMLDivElement>(null)

  const {
    connect,
    disconnect,
    startPublish,
    stopPublish,
    startSubscribe,
    stopSubscribe,
    updateCurrentAudioInputSourceToNextSource,
    updateCurrentVideoInputSourceToNextSource,
    setVideoResolutionQuality,
  } = React.useContext(OTContext)

  const connectAndPublish = React.useCallback(async () => {
    const isConnected = await connect(sessionId, 'publisher')
    if (!isConnected) {
      console.log('Failed to connect from publisher!!')
      return
    }
    console.log(`Success to connect as publisher!!`)
    startPublish(sessionId)
  }, [connect, sessionId, startPublish])

  const connectAsSubscriber = React.useCallback(async () => {
    const isConnected = await connect(sessionId, 'subscriber')
    if (!isConnected) {
      console.log('Failed to connect from subscriber!!')
    }
    console.log(`Success to connect as subscriber!!`)
    startSubscribe(sessionId, videoContainerRef.current ?? undefined)
  }, [connect, sessionId, startSubscribe])

  const requestNewSession = React.useCallback(async () => {
    const res = await fetch('/api/create-session', {})
    const { sessionId } = await res.json()
    if (typeof sessionId !== 'string') {
      throw new Error(`invalid sessionId ${sessionId}`)
    }

    setSessionId(sessionId)
  }, [])

  const windowHeight = window?.innerHeight ?? 0
  const windowWidth = window?.innerWidth ?? 0

  const videoHeight =
    (windowHeight * 1920) / 1080 > windowWidth
      ? (windowWidth * 1080) / 1920
      : windowHeight
  const videoWidth = (videoHeight * 1920) / 1080
  return (
    <>
      <div
        ref={videoContainerRef}
        id="video-container"
        style={{ background: 'pink', height: videoHeight, width: videoWidth }}
      ></div>
      <Spacer height={100} />
      <Title title="송출/구독" />
      <Spacer height={10} />
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'row',
          width: '100%',
        }}
      >
        <Button onClick={connectAndPublish} title="connect and publish" />
        <Spacer width={100} />
        <Button onClick={connectAsSubscriber} title="subscribe" />
      </div>
      <Spacer height={100} />
      <Title title="미디어 인풋 변경" />
      <Spacer height={10} />
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'row',
          width: '100%',
        }}
      >
        <Button
          onClick={updateCurrentAudioInputSourceToNextSource}
          title="update audio input source to next"
        />
        <Spacer width={100} />
        <Button
          onClick={updateCurrentVideoInputSourceToNextSource}
          title="update video input source to next"
        />
      </div>
      <Spacer height={100} />
      <Title title="비디오 해상도" />
      <Spacer height={10} />
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'row',
          width: '100%',
        }}
      >
        <Button
          onClick={() => setVideoResolutionQuality('high')}
          title="HIGH"
        />
        <Spacer width={100} />
        <Button
          onClick={() => setVideoResolutionQuality('medium')}
          title="MID"
        />
        <Spacer width={100} />
        <Button onClick={() => setVideoResolutionQuality('low')} title="LOW" />
      </div>
      <Spacer height={100} />
      <Title title="세션" />
      <Spacer height={10} />
      <div>
        <Button onClick={requestNewSession} title="새로운 세션 만들기" />
      </div>
      <Spacer height={100} />
      <Title title="세션 ID" />
      <Spacer height={10} />
      <input
        style={{ width: 100, height: 40, backgroundColor: 'orange' }}
        onChange={(e) => setSessionId(e.target.value)}
        value={sessionId}
      />
      <Spacer height={100} />
    </>
  )
}
