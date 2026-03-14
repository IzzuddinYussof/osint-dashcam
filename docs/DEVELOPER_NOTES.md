# Developer Notes - OSINT Dashcam

## 1) Core Runtime Architecture

### Frontend State Domains (`web/src/App.tsx`)

- Filter state: `selectedState`, `selectedArea`, `selectedPurposes`
- Layout/view state: `layoutMode`, `viewMode`, `focusCameraId`
- Patrol state: `isPatrolRunning`, `patrolIntervalSec`, `patrolCursor`
- Presets state: `presets` with localStorage sync

Derived domains:

- `filteredCameras`: canonical filtered set
- `wallCameras`: filtered subset limited by layout tile count
- `mapCameras`: filtered set with lat/lon
- `patrolPool`: context-aware pool (map/focus/wall)

### Component Contracts

`CameraTile` props:
- identity + metadata (`id`, `name`, `location`)
- operational (`status`, `streamType`, `streamUrl`, `relayUrl`, `source`)
- interaction (`onClick`, `isActive`)

### Dataset Contract (`web/src/data/camerasDataset.ts`)

`CameraMetadata` is source-of-truth for static MVP. Required for OSINT connection migration:

- Keep `id` stable across sessions
- Keep `stream_type` explicit
- Keep `stream_url` and `stream_relay_url` separate

## 2) Snapshot Connection Pipeline (Current)

Implemented in `CameraTile.tsx` for snapshot feeds:

1. Stagger initial start using deterministic offset from camera ID.
2. Periodic refresh every 4s (`BASE_REFRESH_MS`).
3. Preload next image with `new Image()` and decode if available.
4. Swap only on successful load/decode.
5. On failure:
   - increase failure streak
   - if no first frame and relay exists, switch to relay
   - else fallback to local synthetic source
   - retry with exponential backoff (up to 12s)
6. Health transitions:
   - success -> ONLINE
   - transient failure -> DEGRADED
   - threshold failures -> OFFLINE

Observability overlays:

- `REFRESH 4s`
- `UPDATED HH:MM:SS`
- `VIA RELAY`
- `FALLBACK ACTIVE`

## 3) OSINT Connectivity: Production Implementation Plan

Current frontend stream logic is intentionally resilient for unstable feeds, but production OSINT should move feed handling server-side.

### Target Topology

```text
Browser UI -> API Gateway -> Stream Relay Service -> Camera/Provider Sources
```

### Why relay is required

- Avoid CORS/hotlink/auth breakage in browser
- Hide credentials/tokens
- Normalize mixed protocols
- Reduce fanout load with shared caching

### Proposed backend interfaces

- `GET /api/cameras`
  - returns camera metadata + capabilities + current health
- `GET /api/camera/:id/frame`
  - normalized image frame (or signed URL)
- `GET /api/camera/:id/manifest`
  - HLS/mjpeg metadata if non-snapshot mode needed
- `GET /api/camera/:id/health`
  - telemetry counters and latency
- `POST /api/camera/:id/probe`
  - optional on-demand probe for operations

### Minimal camera schema (server)

```json
{
  "id": "CAM001",
  "name": "KLCC Tower View",
  "state": "Kuala Lumpur",
  "area": "KLCC",
  "purpose": "landmark",
  "lat": 3.1578,
  "lon": 101.7118,
  "stream": {
    "mode": "snapshot",
    "primary": "relay-endpoint",
    "fallback": "secondary-relay-endpoint"
  },
  "health": {
    "status": "online",
    "lastFrameAt": "ISO-8601",
    "latencyMs": 240
  }
}
```

## 4) Operational Notes

### Local/Tailscale access

Use:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

### QA sequence (recommended)

```bash
npm run build
npm run lint
node qa_t8_r1_playwright.mjs
node qa_t9_playwright.mjs
node qa_t14_playwright.mjs
```

### Known behavior for QA determinism

- CAM001 has deterministic probe/failure logic to force transition/relay/fallback paths for test observability.
- Keep this behavior behind a feature flag when moving to production feed sources.

## 5) Implementation Caveats

1. `status` in dataset is currently static baseline; runtime health is tile-driven.
2. Online/offline counters in topbar are based on filtered dataset status, not full runtime health telemetry.
3. Map marker projection uses fixed Malaysia bounds and simple linear interpolation.
4. Presets are local-only (`localStorage`) and not multi-user.

## 6) Suggested Next Engineering Tasks

1. Introduce `VITE_API_BASE_URL` and replace static dataset loading with API fetch.
2. Add `useCameraHealth` polling or websocket subscription.
3. Make topbar counters telemetry-based.
4. Add runtime feature flag:
   - `qaDeterministicMode` ON for CI/QA
   - OFF for production.
5. Add server-side signed feed access and audit logging.
