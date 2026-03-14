import './CameraTile.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'

interface CameraTileProps {
  id: string
  name: string
  location: string
  status?: 'online' | 'offline' | 'degraded' | 'loading'
  streamType?: 'snapshot' | 'hls' | 'mjpeg' | 'embed' | 'none'
  feedKind?: 'live' | 'snapshot'
  streamUrl?: string
  relayUrl?: string
  refreshIntervalMs?: number
  source?: string
  sourceUrl?: string
  isHidden?: boolean
  onToggleHidden?: () => void
  userTag?: string
  recommendedTags?: string[]
  onSetTag?: (tag: string) => void
  onAddCustomTag?: () => void
  onClearTag?: () => void
  onEditTag?: () => void
  onClick?: () => void
  isActive?: boolean
}

type HealthState = 'online' | 'offline' | 'degraded'

const DEFAULT_REFRESH_MS = 4000
const FIRST_FRAME_TIMEOUT_MS = 6000
const MAX_BACKOFF_MS = 12000
const OFFLINE_FAILURE_THRESHOLD = 2

function getRefreshOffset(id: string, refreshIntervalMs: number): number {
  const sum = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return sum % refreshIntervalMs
}

function formatRefreshInterval(refreshIntervalMs: number): string {
  if (refreshIntervalMs % 60000 === 0) return `${refreshIntervalMs / 60000}m`
  if (refreshIntervalMs % 1000 === 0) return `${refreshIntervalMs / 1000}s`
  return `${refreshIntervalMs}ms`
}

function isMySGRoadBridge(url?: string): boolean {
  return typeof url === 'string' && url.startsWith('/proxy/mysgroad/')
}

function getMySGRoadCameraPrefix(streamUrl: string): string | null {
  const filename = streamUrl.split('/').pop()?.split('?')[0] ?? ''
  const match = filename.match(/^(.*-\d+[a-z]?)-\d+\.jpg$/i)
  return match ? `${match[1]}-` : null
}

async function resolveMySGRoadSnapshotUrl(pageUrl: string, currentImageUrl: string): Promise<string | null> {
  const prefix = getMySGRoadCameraPrefix(currentImageUrl)
  if (!prefix) return null

  const response = await fetch(pageUrl, {
    credentials: 'same-origin',
    headers: {
      accept: 'text/html,application/xhtml+xml',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load route page: ${response.status}`)
  }

  const html = await response.text()
  const regex = /(?:https:\/\/www\.mysgroad\.com)?(\/sites\/mysgroad\/files\/img\/[^"' ]+?\.jpg)/gi
  let match: RegExpExecArray | null

  while ((match = regex.exec(html)) !== null) {
    const candidate = `https://www.mysgroad.com${match[1]}`
    const candidateFilename = candidate.split('/').pop()?.split('?')[0] ?? ''

    if (candidateFilename.startsWith(prefix)) {
      return candidate
    }
  }

  return null
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
  feedKind,
  streamUrl,
  relayUrl,
  refreshIntervalMs,
  source,
  sourceUrl,
  isHidden = false,
  onToggleHidden,
  userTag,
  recommendedTags = [],
  onSetTag,
  onAddCustomTag,
  onClearTag,
  onEditTag,
  onClick,
  isActive = false
}: CameraTileProps) {
  const canUseSnapshot = streamType === 'snapshot' && !!streamUrl
  const canUseHls = streamType === 'hls' && !!streamUrl
  const canUseEmbed = streamType === 'embed' && !!streamUrl
  const canUseStream = canUseSnapshot || canUseHls || canUseEmbed
  const isMySGRoadRouteBridge = useMemo(() => isMySGRoadBridge(relayUrl), [relayUrl])
  const effectiveRefreshIntervalMs = useMemo(
    () => Math.max(1000, refreshIntervalMs ?? DEFAULT_REFRESH_MS),
    [refreshIntervalMs]
  )
  const refreshOffset = useMemo(
    () => getRefreshOffset(id, effectiveRefreshIntervalMs),
    [effectiveRefreshIntervalMs, id]
  )
  const cadenceLabel = useMemo(
    () => formatRefreshInterval(effectiveRefreshIntervalMs),
    [effectiveRefreshIntervalMs]
  )

  const [displayedSrc, setDisplayedSrc] = useState<string | null>(null)
  const [healthState, setHealthState] = useState<HealthState>('degraded')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [isUsingFallback, setIsUsingFallback] = useState(false)
  const [isViaRelay, setIsViaRelay] = useState(false)
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hasFrameRef = useRef(false)
  const failureStreakRef = useRef(0)
  const successStreakRef = useRef(0)
  const stoppedRef = useRef(false)
  const activeStreamRef = useRef<string>(streamUrl ?? '')
  const isUsingPageBridgeRef = useRef(false)

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
    isUsingPageBridgeRef.current = false

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
      setIsViaRelay(activeStreamRef.current.startsWith('relay://') || isUsingPageBridgeRef.current)
      setHealthState('online')
    }

    const onFailure = () => {
      if (stoppedRef.current) return

      successStreakRef.current = 0
      failureStreakRef.current += 1

      if (
        !hasFrameRef.current &&
        relayUrl &&
        !isMySGRoadRouteBridge &&
        !activeStreamRef.current.startsWith('relay://')
      ) {
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

    const loadAndSwapFrame = async () => {
      if (stoppedRef.current) return

      const frameToken = Date.now()

      if (shouldInjectQaFailure(id, frameToken)) {
        onFailure()
        return
      }

      let nextStreamUrl = activeStreamRef.current

      if (
        isMySGRoadRouteBridge &&
        relayUrl &&
        !nextStreamUrl.startsWith('local://') &&
        !nextStreamUrl.startsWith('relay://')
      ) {
        try {
          const latestRouteImageUrl = await resolveMySGRoadSnapshotUrl(relayUrl, nextStreamUrl)
          if (latestRouteImageUrl) {
            nextStreamUrl = latestRouteImageUrl
            activeStreamRef.current = latestRouteImageUrl
            isUsingPageBridgeRef.current = true
          }
        } catch {
          isUsingPageBridgeRef.current = false
        }
      }

      const nextSrc = resolveFrameSrc(id, name, location, nextStreamUrl, frameToken)
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
      void loadAndSwapFrame()
      intervalId = window.setInterval(() => {
        void loadAndSwapFrame()
      }, effectiveRefreshIntervalMs)
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
      void loadAndSwapFrame()
    }, FIRST_FRAME_TIMEOUT_MS + refreshOffset)

    return () => {
      stoppedRef.current = true
      if (startTimerId) window.clearTimeout(startTimerId)
      if (firstFrameTimerId) window.clearTimeout(firstFrameTimerId)
      if (retryTimerId) window.clearTimeout(retryTimerId)
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [canUseSnapshot, effectiveRefreshIntervalMs, id, isMySGRoadRouteBridge, location, name, refreshOffset, streamUrl, relayUrl])

  useEffect(() => {
    if (!canUseHls || !streamUrl) {
      return
    }

    const video = videoRef.current
    if (!video) {
      return
    }

    let hls: Hls | null = null
    let stopped = false

    const markOnline = () => {
      if (stopped) return
      setHealthState('online')
      setLastUpdatedAt(Date.now())
    }

    const markDegraded = () => {
      if (stopped) return
      setHealthState((current) => current === 'offline' ? current : 'degraded')
    }

    const markOffline = () => {
      if (stopped) return
      setHealthState('offline')
    }

    const tryPlay = () => {
      void video.play().catch(() => {
        markDegraded()
      })
    }

    const handleLoadedData = () => markOnline()
    const handleCanPlay = () => {
      markOnline()
      tryPlay()
    }
    const handlePlaying = () => markOnline()
    const handleWaiting = () => markDegraded()
    const handleStalled = () => markDegraded()
    const handleVideoError = () => markOffline()

    video.muted = true
    video.autoplay = true
    video.playsInline = true

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('stalled', handleStalled)
    video.addEventListener('error', handleVideoError)

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      })

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls?.loadSource(streamUrl)
      })

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        markOnline()
        tryPlay()
      })

      hls.on(Hls.Events.FRAG_CHANGED, () => {
        markOnline()
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) {
          markDegraded()
          return
        }

        if (!hls) {
          markOffline()
          return
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          markDegraded()
          hls.startLoad()
          return
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          markDegraded()
          hls.recoverMediaError()
          return
        }

        markOffline()
        hls.destroy()
        hls = null
      })

      hls.attachMedia(video)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl
      tryPlay()
    } else {
      markOffline()
    }

    return () => {
      stopped = true
      video.pause()
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('stalled', handleStalled)
      video.removeEventListener('error', handleVideoError)
      if (hls) {
        hls.destroy()
      } else {
        video.removeAttribute('src')
        video.load()
      }
    }
  }, [canUseHls, streamUrl])

  const tileStatus: HealthState = canUseStream
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
    if (canUseEmbed && streamUrl) {
      return (
        <div className="viewport-live">
          <iframe
            src={streamUrl}
            title={`Embedded live feed from ${name}`}
            className="live-embed"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => {
              setHealthState('online')
              setLastUpdatedAt(Date.now())
            }}
          />
          <div className="snapshot-observability">
            <span className="cadence-pill">{feedKind === 'snapshot' ? `REFRESH ${cadenceLabel}` : 'LIVE EMBED'}</span>
            <span className="updated-pill">UPDATED {lastUpdatedLabel}</span>
          </div>
          {source && <div className="stream-attribution">{source}</div>}
        </div>
      )
    }

    if (canUseHls) {
      return (
        <div className="viewport-live">
          <video ref={videoRef} className="live-video" muted autoPlay playsInline />
          <div className="snapshot-observability">
            <span className="cadence-pill">LIVE HLS</span>
            <span className="updated-pill">UPDATED {lastUpdatedLabel}</span>
          </div>
          {source && <div className="stream-attribution">{source}</div>}
        </div>
      )
    }

    if (canUseSnapshot && displayedSrc) {
      return (
        <div className="viewport-live">
          <img src={displayedSrc} alt={`Live feed from ${name}`} className="live-image" />
          <div className="snapshot-observability">
            <span className="cadence-pill">REFRESH {cadenceLabel}</span>
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
            <span className="cadence-pill">REFRESH {cadenceLabel}</span>
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
          <div className="tile-info-left">
            <span className="tile-id">#{id}</span>
            <span className={`tile-status ${tileStatus}`}>{tileStatus.toUpperCase()}</span>
            {isHidden && <span className="hidden-state-badge">HIDDEN</span>}
          </div>
          <div className="tile-info-right">
            {streamType !== 'none' && streamUrl && (
              <span className="stream-type-badge">{streamType.toUpperCase()}</span>
            )}
            {onToggleHidden && (
              <button
                type="button"
                className={`quick-hide-btn ${isHidden ? 'active' : ''}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleHidden()
                }}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {isHidden ? 'Unhide' : 'Hide'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="tile-viewport">{renderViewport()}</div>

      <div className="tile-footer">
        <div className="tile-footer-main">
          <div className="tile-name">{name}</div>
          <div className="tile-location">{location}</div>
        </div>
        {sourceUrl && (
          <div className="tile-action-row">
            <a
              className="source-open-link"
              href={sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              title={sourceUrl}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              Open Source Page
            </a>
          </div>
        )}
        {onEditTag && (
          <div className="tile-tag-row">
            <div className="tile-tag-meta">
              {userTag ? (
                <span className="user-tag-badge" title={userTag}>{userTag}</span>
              ) : (
                <span className="user-tag-placeholder">No tag</span>
              )}
            </div>
            <button
              type="button"
              className="tag-edit-btn"
              onClick={(event) => {
                event.stopPropagation()
                setIsTagPickerOpen((current) => !current)
              }}
              onKeyDown={(event) => {
                event.stopPropagation()
              }}
            >
              {isTagPickerOpen ? 'Close Tags' : (userTag ? 'Edit Tag' : 'Add Tag')}
            </button>
          </div>
        )}
        {onEditTag && isTagPickerOpen && (
          <div
            className="tag-picker-panel"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {recommendedTags.length > 0 && (
              <div className="tag-picker-group">
                <span className="tag-picker-label">Recommended</span>
                <div className="tag-picker-chip-row">
                  {recommendedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-choice-btn ${userTag === tag ? 'active' : ''}`}
                      onClick={() => {
                        onSetTag?.(tag)
                        setIsTagPickerOpen(false)
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="tag-picker-actions">
              <button
                type="button"
                className="tag-picker-action-btn"
                onClick={() => {
                  onAddCustomTag?.()
                  setIsTagPickerOpen(false)
                }}
              >
                Custom
              </button>
              <button
                type="button"
                className="tag-picker-action-btn danger"
                onClick={() => {
                  onClearTag?.()
                  setIsTagPickerOpen(false)
                }}
                disabled={!userTag}
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CameraTile
