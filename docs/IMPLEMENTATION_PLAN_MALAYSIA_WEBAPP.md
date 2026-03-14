# Osint Dashboard Camera

## Implementation Plan (Malaysia First)

Tarikh: 2026-03-13
Status: Draft MVP Plan

## 1) Feasibility

Ya, ini memang possible.

Target "macam drama polis" (banyak CCTV live serentak dalam satu screen) boleh dibuat, dengan 3 syarat utama:
- kita dapat stream source yang stabil (HLS/MJPEG/snapshot)
- kita sediakan layer normalisasi (supaya semua stream boleh dipaparkan konsisten)
- kita hadkan bilangan stream serentak ikut bandwidth/performance

Limit real-world yang normal:
- ada source yang anti-hotlink / token expiry
- ada source cuma bagi snapshot (bukan true video stream)
- ada source block CORS atau perlukan referer tertentu

## 2) Objective MVP (Malaysia)

MVP fokus Malaysia dulu dengan kemampuan:
- paparan multi-camera grid (2x2, 3x3, 4x4)
- filter by negeri/kawasan/kategori/purpose/provider
- live playback terus dalam web app (bukan sekadar external link)
- map view untuk klik kamera ikut lokasi
- health status (online/offline/lagging)

## 3) Source Categories (Malaysia)

Initial source yang practical:
- LLM / lebuhraya (kamera trafik/snapshot)
- PLUS / expressway pages yang expose public feed
- aggregator yang senaraikan Malaysia cams (untuk metadata + discovery)
- city/tourism cams (KL skyline dll) bila stream boleh embed/direct play

## 3.1) Purpose Taxonomy (for filtering)

Purpose filter kita define sebagai controlled tags supaya senang query dan elak label bercampur:
- street
- highway
- city
- landmark
- mall
- airport
- port
- beach
- mountain
- mt_fuji
- sakura
- aurora
- wildlife
- weather

Rule data model:
- setiap kamera ada `purpose_primary` (1 nilai utama)
- optional `purpose_tags` (multi-tag, contoh: ["street", "landmark"])

## 4) Suggested Architecture

### 4.1 Frontend
- Next.js (App Router) + React
- Video wall component (grid + fullscreen tile)
- Map (Leaflet) untuk geospatial filter
- Filter panel:
  - country (default Malaysia)
  - state
  - city/area
  - category (traffic/city/tourism)
  - purpose (street, sakura, mt_fuji, aurora, mall, beach, landmark, highway)
  - source provider
  - stream status

### 4.2 Backend API
- FastAPI atau NestJS (pilih satu stack sahaja)
- Endpoint utama:
  - GET /api/cameras
  - GET /api/cameras/:id
  - GET /api/streams/:id/resolve
  - GET /api/health
- Fungsi backend:
  - simpan metadata kamera
  - resolve stream sebenar (jika source berlapis)
  - refresh token/url bila expired
  - monitor health stream

### 4.3 Stream Ingestion / Relay Layer
- Layer ini penting untuk "directly access" dalam web app
- Guna mediamtx atau ffmpeg worker untuk kes berikut:
  - source block CORS
  - source perlu referer/header tertentu
  - source bagi format tak compatible browser
- Output standard untuk frontend:
  - HLS (m3u8) untuk kebanyakan browser
  - MJPEG/image refresh fallback untuk snapshot-only feeds

### 4.4 Database
- PostgreSQL + PostGIS (recommended)
- Jadual minimum:
  - cameras
  - camera_sources
  - camera_tags
  - stream_health_logs

Field kamera minimum:
- id
- name
- country
- state
- city_area
- lat
- lon
- category
- purpose_primary
- purpose_tags (array)
- provider
- source_page_url
- stream_type (hls/mjpeg/image)
- stream_url_raw
- stream_url_resolved
- requires_proxy
- status
- last_checked_at

## 5) UI/UX Modes

Mode yang terus nampak "command center":
- Wall Mode: 9/16 tiles serentak
- Focus Mode: 1 kamera besar + side thumbnails
- Map Mode: marker based, click marker terus play
- Patrol Mode: auto-rotate kamera ikut filter

Opsional (next phase):
- simpan layout preset (contoh "KL Traffic Core", "North-South Highway")
- event pin (manual note oleh user)

## 6) Performance Plan

Anggaran bandwidth:
- 1 stream HD: ~2-5 Mbps
- 9 stream serentak: ~18-45 Mbps
- 16 stream serentak: ~32-80 Mbps

Strategi jaga performance:
- adaptive quality (pilih bitrate lebih rendah dalam wall mode)
- autoplay muted + pause stream yang tak visible
- hadkan concurrent stream ikut device profile
- lazy-load tile bila masuk viewport

## 7) Legal and Compliance Guardrails

Untuk setiap kamera, simpan:
- source attribution
- terms snapshot
- allowed embed status

Rule practical:
- kalau tak dibenarkan embed/direct stream, jangan force bypass
- guna source yang sememangnya public-facing dan dibenarkan untuk paparan

## 8) Delivery Roadmap (Malaysia MVP)

Fasa 1 (2-3 hari)
- setup repo + frontend shell + backend skeleton
- DB schema + admin seed script
- basic camera list page + map placeholder

Fasa 2 (3-5 hari)
- implement stream resolver + health checker
- integrate 20-50 Malaysia camera records
- wall mode 3x3 + filter panel fully functional

Fasa 3 (2-4 hari)
- proxy/relay untuk feed yang perlukan header/token refresh
- status indicator (online/offline/slow)
- UI polish + saved filter presets

Fasa 4 (1-2 hari)
- QA + stress test (9/16 feed serentak)
- finalize docs + deployment guide

## 9) MVP Success Criteria

MVP dianggap siap bila:
- user boleh buka web app dan nampak multi-cam wall live
- filter negeri/kawasan/kategori/purpose berfungsi
- sekurang-kurangnya 20 feed Malaysia playable dalam app
- ada health status dan fallback untuk feed rosak

## 10) Immediate Next Actions

1. lock tech stack (Next.js + FastAPI atau Next.js + NestJS)
2. pilih deployment target (local dulu atau cloud)
3. compile curated list awal 30-50 kamera Malaysia
4. start build MVP wall mode + filter + stream resolver
