# osint-dashcam

OSINT Dashcam is a React + TypeScript tactical dashboard for monitoring camera feeds in Malaysia with wall view, map view, focus mode, and patrol mode.

## Current MVP Status

- MVP pipeline complete (T1-T15)
- Build: PASS
- Lint: PASS
- Final regression/signoff: PASS

## Tech Stack

- Frontend: React 19 + TypeScript + Vite 8
- Styling: CSS modules-by-feature (App.css + CameraTile.css)
- QA: Playwright task scripts (`qa_t8_r1`, `qa_t9`, `qa_t10` ... `qa_t14`)
- Persistence (client): `localStorage` for saved view presets

## Project Structure

```text
osint-dashcam/
├─ docs/
│  ├─ DEVELOPMENT_PROGRESS.md
│  ├─ PIPELINE_STATE.json
│  ├─ QA_HITOKIRI_LOG.md
│  └─ DEVELOPER_NOTES.md
├─ references/
└─ web/
   ├─ src/
   │  ├─ App.tsx
   │  ├─ App.css
   │  ├─ components/CameraTile.tsx
   │  ├─ components/CameraTile.css
   │  └─ data/camerasDataset.ts
   ├─ qa_*.mjs
   ├─ package.json
   └─ vite.config.ts
```

## Main Features

1. Camera wall layouts: 2x2, 3x3, 4x4
2. Filters: State, Area, Purpose (multi-select chips)
3. Focus mode: single large tile + side list
4. Map mode: marker-linked camera panel (lat/lon projected to map bounds)
5. Patrol mode: auto-cycle through active pool with configurable interval
6. Saved view presets: persist full dashboard state in localStorage
7. Live/snapshot tile engine:
   - staggered refresh
   - preload + swap on success
   - exponential backoff on failure
   - health states: ONLINE / DEGRADED / OFFLINE
8. Relay path for hard feeds (`stream_relay_url`) before fallback
9. Fallback path for first-frame and repeated load issues
10. Ops Ready counters (Total, Filtered, Online, Offline, Active Filters)

## Run Locally

```bash
cd web
npm install
npm run dev
```

By default Vite uses localhost. For LAN/Tailscale exposure:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

## QA / Validation

From `web/`:

```bash
npm run build
npm run lint
node qa_t14_playwright.mjs
```

## OSINT Connection Design (Important)

Current MVP uses mixed sources for development and deterministic QA:
- `local://stable/*` and `relay://*` are synthetic source schemes for controllable behavior
- external URL feeds are used only where available

### Stream Field Contract

Defined in `src/data/camerasDataset.ts`:

- `stream_type`: `snapshot | hls | mjpeg | none`
- `stream_url`: primary feed URL
- `stream_relay_url`: optional relay/proxy URL for difficult feeds
- `source`: attribution string

### Tile Connection Flow

For snapshot streams (`CameraTile.tsx`):

1. Try `stream_url`
2. If first frame fails and relay exists, switch to `stream_relay_url`
3. If still failing, switch to fallback local synthetic source
4. Keep last good frame visible and update health status based on streaks

### Recommended Production OSINT Integration

Use a backend relay/proxy service between dashboard and source cameras.

Suggested endpoint contract:

- `GET /api/cameras` -> camera metadata list
- `GET /api/camera/:id/snapshot` -> normalized latest frame
- `GET /api/camera/:id/health` -> source + relay health telemetry
- `WS /api/telemetry` -> optional real-time status push

Suggested relay capabilities:

- protocol normalization (RTSP/HLS/MJPEG -> snapshot/HLS)
- source authentication isolation (tokens not exposed to browser)
- per-source timeout + retry + circuit breaker
- signed URL generation with expiry
- caching + rate limiting for high fanout
- audit logs for feed access and failures

Security notes for OSINT feeds:

- never expose private camera credentials in frontend bundle
- enforce allowlist for source domains/IP ranges
- sanitize and validate all dynamic stream URLs
- store provider secrets in server-side env only

## Known Notes

- T11 map QA had historical known warning in regression chain and is treated as non-blocking in aggregate scripts.
- CAM001 is configured for deterministic probe/failure behavior in QA scenarios.

## Next Suggested Phase

1. Replace static dataset with backend `GET /api/cameras`
2. Move stream health to backend telemetry
3. Add user auth + RBAC + audit trail
4. Add incident bookmarks/export and evidence workflow
