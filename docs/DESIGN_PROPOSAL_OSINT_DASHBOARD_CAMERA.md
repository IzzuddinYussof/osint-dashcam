# Design Proposal - Osint Dashboard Camera

Project: Osint Dashboard Camera
Owner: Izz
Prepared by: Tifa / Yuna
Date: 2026-03-13
Version: v1
Reference template: docs/DESIGN_PROPOSAL_TEMPLATE.md

## 1. Problem Statement
User perlukan satu web app command-center untuk tengok banyak open-source camera dalam satu skrin, bukan sekadar list link.

## 2. Target Users and Jobs-to-be-Done
Primary:
- Operator/analyst yang nak pantau kawasan tertentu secara live

Jobs-to-be-done:
- Cari kamera ikut lokasi + purpose
- Buka banyak feed serentak
- Fokus pada kamera tertentu bila perlu

## 3. Product Goals and Non-Goals
Goals:
- Multi-camera wall (2x2, 3x3, 4x4)
- Filter by state/area/category/purpose/provider
- Live playback terus dalam app

Non-goals (MVP):
- AI object detection penuh
- Incident automation kompleks

## 4. UX Principles (mandatory)
- User-first decision untuk setiap komponen
- Action utama mesti jelas (view, filter, focus)
- Design kemas, cepat faham, rendah cognitive load
- Setiap task development mesti hasilkan perubahan yang nampak live

## 5. UI Direction
Theme: Neon Tactical Command Center
- Dark base + cyan accent
- Kemas, high-contrast, data-dense but readable

## 6. Information Architecture
- Dashboard Wall
- Map View
- Focus View
- Preset/Patrol Controls

## 7. Component Architecture (initial)
- CameraWallGrid
- CameraTile
- FilterPanel
- StreamHealthBadge
- MapCameraLayer
- FocusPlayer

## 8. Data and Backend Design
Minimum camera fields:
- id, name, country, state, city_area
- lat, lon
- category
- purpose_primary, purpose_tags
- stream_type, stream_url_resolved, status

## 9. Live-visible Delivery Rule for This Project
Wajib ikut `docs/TODO_MALAYSIA_LIVE_VISIBLE.md`:
- no invisible backend-only tasks
- setiap task ada test live point

## 10. Yuna Working Directive for This Project
Yuna mesti refer dokumen ini sebelum execute task:
- docs/DESIGN_PROPOSAL_OSINT_DASHBOARD_CAMERA.md
- docs/TODO_MALAYSIA_LIVE_VISIBLE.md

Prinsip kerja Yuna:
- full-stack execution
- UX/UI first thinking
- smart, kemas, cantik, user-friendly
- setiap task mesti berakhir dengan result yang user boleh nampak terus
