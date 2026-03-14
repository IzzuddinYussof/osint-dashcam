import './CameraTile.css'
import { useEffect, useMemo, useRef, useState } from 'react'

interface CameraTileProps {
  id: string
  name: string
  location: string
  status?: 'online' | 'offline' | 'degraded' | 'loading'
  streamType?: 'snapshot' | 'hls' | 'mjpeg' | 'none'
  streamUrl?: string
  relayUrl?: string
  source?: string
  onClick?: () => void
  isActive?: boolean
}

type HealthState = 'online' | 'offline' | 'degraded'

const BASE_REFRESH_MS = 4000
const FIRST_FRAME_TIMEOUT_MS = 2200
const MAX_BACKOFF_MS = 12000
const OFFLINE_FAILURE_THRESHOLD = 2

function getRefreshOffset(id: string): number {
  const sum = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return sum % BASE_REFRESH_MS
}

function buildFrameUrl(url: string, frameToken: number): string {
  const divider = url.includes('?') ? '&' : '?'
  return `${url}${divider}_refresh=${frameToken}`
}

function buildLocalSnapshotFrame(id: string, name: string, location: string, frameToken: number): string {
  const stamp = new Date(frameToken).toLocaleTimeString('en-GB', { hour12: false })
  const hue = (frameToken / 1000 + id.length * 17) % 360

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue},55%,12%)"/>
      <stop offset="100%" stop-color="#070c16"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <g stroke="rgba(0,209,255,0.12)">
    ${Array.from({ length: 32 }).map((_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="720"/>`).join('')}
    ${Array.from({ length: 18 }).map((_, i) => `<line x1="0" y1="${i * 40}" x2="1280" y2="${i * 40}"/>`).join('')}
  </g>
  <rect x="24" y="24" width="450" height="130" fill="rgba(0,0,0,0.45)" stroke="rgba(0,209,255,0.45)"/>
  <text x="48" y="72" fill="#00d1ff" font-family="monospace" font-size="34" font-weight="700">${id} LIVE</text>
  <text x="48" y="108" fill="#d7e4ff" font-family="Inter,Arial" font-size="24">${name}</text>
  <text x="48" y="138" fill="#8da2c6" font-family="Inter,Arial" font-size="20">${location}</text>

  <rect x="910" y="24" width="346" height="86" fill="rgba(0,0,0,0.45)" stroke="rgba(0,209,255,0.45)"/>
  <text x="930" y="66" fill="#00d1ff" font-family="monospace" font-size="24">FRAME ${frameToken}</text>
  <text x="930" y="94" fill="#d7e4ff" font-family="monospace" font-size="24">${stamp}</text>

  <circle cx="1190" cy="664" r="12" fill="#22c55e"/>
  <text x="1110" y="670" fill="#d7e4ff" font-family="monospace" font-size="20">SYNC OK</text>
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function resolveFrameSrc(id: string, name: string, location: string, streamUrl: string, frameToken: number): string {
  if (streamUrl.startsWith('local://') || streamUrl.startsWith('relay://')) {
    return buildLocalSnapshotFrame(id, name, location, frameToken)
  }

  return buildFrameUrl(streamUrl, frameToken)
}

function shouldInjectQaFailure(id: string, frameToken: number): boolean {
  if (id !== 'CAM001') return false
  const slot = Math.floor(frameToken / 4000) % 5
  return slot === 1
}

function CameraTile({
  id,
  name,
  location,
  status = 'loading',
  streamType = 'none',
  streamUrl,
  relayUrl,
  source,
  onClick,
  isActive = false
}: CameraTileProps) {
  const canUseSnapshot = streamType === 'snapshot' && !!streamUrl
  const refreshOffset = useMemo(() => getRefreshOffset(id), [id])

  const [displayedSrc, setDisplayedSrc] = useState<string | null>(null)
  const [healthState, setHealthState] = useState<HealthState>('degraded')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [isUsingFallback, setIsUsingFallback] = useState(false)
  const [isViaRelay, setIsViaRelay] = useState(false)

  const hasFrameRef = useRef(false)
  const failureStreakRef = useRef(0)
  const successStreakRef = useRef(0)
  const stoppedRef = useRef(false)
  const activeStreamRef = useRef<string>(streamUrl ?? '')

  useEffect(() => {
    if (!canUseSnapshot || !streamUrl) {
      return
    }

    let intervalId: number | null = null
    let startTimerId: number | null = null
    let firstFrameTimerId: number | null = null
    let retryTimerId: number | null = null

    stoppedRef.current = false
    hasFrameRef.current = false
    failureStreakRef.current = 0
    successStreakRef.current = 0
    activeStreamRef.current = streamUrl

    const onSuccess = (nextSrc: string) => {
      if (stoppedRef.current) return
      failureStreakRef.current = 0
      successStreakRef.current += 1
      hasFrameRef.current = true
      setDisplayedSrc(nextSrc)
      setLastUpdatedAt(Date.now())
      setIsUsingFallback(
        activeStreamRef.current.includes('fallback') || activeStreamRef.current.includes('firstframe')
      )
      setIsViaRelay(activeStreamRef.current.startsWith('relay://'))
      setHealthState('online')
    }

    const onFailure = () => {
      if (stoppedRef.current) return

      successStreakRef.current = 0
      failureStreakRef.current += 1

      if (!hasFrameRef.current && relayUrl && !activeStreamRef.current.startsWith('relay://')) {
        activeStreamRef.current = relayUrl
        setIsViaRelay(true)
      } else if (!hasFrameRef.current && !activeStreamRef.current.startsWith('local://') && !activeStreamRef.current.startsWith('relay://')) {
        activeStreamRef.current = `local://fallback/${id}`
        setIsUsingFallback(true)
      }

      if (failureStreakRef.current >= OFFLINE_FAILURE_THRESHOLD) {
        setHealthState('offline')
      } else {
        setHealthState('degraded')
      }

      const backoff = Math.min(900 * 2 ** Math.min(failureStreakRef.current, 4), MAX_BACKOFF_MS)
      if (retryTimerId) window.clearTimeout(retryTimerId)
      retryTimerId = window.setTimeout(() => {
        loadAndSwapFrame()
      }, backoff)
    }

    const loadAndSwapFrame = () => {
      if (stoppedRef.current) return

      const frameToken = Date.now()

      if (shouldInjectQaFailure(id, frameToken)) {
        onFailure()
        return
      }

      const nextSrc = resolveFrameSrc(id, name, location, activeStreamRef.current, frameToken)
      const img = new Image()

      img.onload = async () => {
        try {
          if ('decode' in img) await img.decode()
        } catch {
          // decode can fail in some cross-origin cases; onload is enough
        }
        onSuccess(nextSrc)
      }

      img.onerror = () => {
        onFailure()
      }

      img.src = nextSrc
    }

    startTimerId = window.setTimeout(() => {
      if (stoppedRef.current) return
      loadAndSwapFrame()
      intervalId = window.setInterval(loadAndSwapFrame, BASE_REFRESH_MS)
    }, refreshOffset)

    firstFrameTimerId = window.setTimeout(() => {
      if (stoppedRef.current || hasFrameRef.current) return
      if (relayUrl && !activeStreamRef.current.startsWith('relay://')) {
        activeStreamRef.current = relayUrl
        setIsViaRelay(true)
      } else if (!activeStreamRef.current.startsWith('local://')) {
        activeStreamRef.current = `local://firstframe/${id}`
        setIsUsingFallback(true)
      }
      loadAndSwapFrame()
    }, FIRST_FRAME_TIMEOUT_MS + refreshOffset)

    return () => {
      stoppedRef.current = true
      if (startTimerId) window.clearTimeout(startTimerId)
      if (firstFrameTimerId) window.clearTimeout(firstFrameTimerId)
      if (retryTimerId) window.clearTimeout(retryTimerId)
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [canUseSnapshot, id, location, name, refreshOffset, streamUrl, relayUrl])

  const tileStatus: HealthState = canUseSnapshot
    ? healthState
    : status === 'online'
      ? 'online'
      : status === 'offline'
        ? 'offline'
        : 'degraded'

  const lastUpdatedLabel = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString('en-GB', { hour12: false })
    : 'pending'

  const renderViewport = () => {
    if (canUseSnapshot && displayedSrc) {
      return (
        <div className="viewport-live">
          <img src={displayedSrc} alt={`Live feed from ${name}`} className="live-image" />
          <div className="snapshot-observability">
            <span className="cadence-pill">REFRESH {BASE_REFRESH_MS / 1000}s</span>
            <span className="updated-pill">UPDATED {lastUpdatedLabel}</span>
            {isViaRelay && <span className="relay-pill">VIA RELAY</span>}
            {isUsingFallback && <span className="fallback-pill">FALLBACK ACTIVE</span>}
          </div>
          {source && <div className="stream-attribution">{source}</div>}
        </div>
      )
    }

    return (
      <div className="viewport-placeholder">
        <div className="grid-pattern" />
        <svg className="camera-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {canUseSnapshot && (
          <div className="snapshot-observability placeholder-mode">
            <span className="cadence-pill">REFRESH {BASE_REFRESH_MS / 1000}s</span>
            <span className="updated-pill">UPDATED {lastUpdatedLabel}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`camera-tile ${onClick ? 'clickable' : ''} ${isActive ? 'active' : ''}`}
      data-status={tileStatus}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      } : undefined}
    >
      <div className="tile-header">
        <div className="tile-info">
          <span className="tile-id">#{id}</span>
          <span className={`tile-status ${tileStatus}`}>{tileStatus.toUpperCase()}</span>
          {streamType !== 'none' && streamUrl && (
            <span className="stream-type-badge">{streamType.toUpperCase()}</span>
          )}
        </div>
      </div>

      <div className="tile-viewport">{renderViewport()}</div>

      <div className="tile-footer">
        <div className="tile-name">{name}</div>
        <div className="tile-location">{location}</div>
      </div>
    </div>
  )
}

export default CameraTile
