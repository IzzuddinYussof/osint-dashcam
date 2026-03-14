# TODO - Malaysia MVP (Live Visible After Every Task)

Tarikh: 2026-03-13
Prinsip: setiap task mesti ada output yang boleh nampak terus dalam web app.

## Rules kerja

1) Tiada task "backend-only" tanpa paparan UI.
2) Kalau perlu buat infra, task yang sama mesti expose status dekat UI.
3) Setiap task ada 3 benda:
- Deliverable
- Cara test live
- Apa yang Izz akan nampak

---

## Sprint A - Bina asas command center (semua task live-visible)

### [x] T1 - App shell + Command Center layout
Deliverable:
- Web app shell (top bar, left filter panel, main wall panel)

Test live:
- Run `npm run dev`
- Buka `/`

Nampak terus:
- Struktur dashboard utama dah wujud (bukan blank page)

---

### [x] T2 - Wall mode mock 3x3
Deliverable:
- 9 tile camera mock cards dengan label kamera

Test live:
- Refresh `/`

Nampak terus:
- Skrin macam operator wall (9 petak serentak)

---

### [x] T3 - Seed data Malaysia (min 20 kamera metadata)
Deliverable:
- Data seed Malaysia dimuat masuk (state, area, purpose, category)
- Wall guna data sebenar metadata (masih boleh guna placeholder stream untuk feed belum siap)

Test live:
- Buka `/`
- Kiraan total kamera muncul dalam UI

Nampak terus:
- List/tile bukan dummy random, tapi kamera Malaysia berstruktur

---

### [x] T4 - Filter negeri/kawasan
Deliverable:
- Dropdown state + area
- Filtering update wall secara real-time

Test live:
- Pilih `Selangor` atau `Kuala Lumpur`

Nampak terus:
- Tile wall terus berubah ikut lokasi dipilih

---

### [x] T5 - Filter purpose (street, mall, highway, city, landmark)
Deliverable:
- Multi-select chips untuk purpose
- Sokong kombinasi filter (contoh: street + mall)

Test live:
- Klik `street`, tambah `mall`

Nampak terus:
- Hanya kamera purpose tu dipaparkan

---

### [x] T6 - First real live stream playable dalam tile
Deliverable:
- Sekurang-kurangnya 1 kamera Malaysia play live dalam tile (HLS/MJPEG/snapshot-refresh)

Test live:
- Klik tile kamera live

Nampak terus:
- Video/image feed bergerak/update live, bukan sekadar link

---

## Sprint B - Dari 1 live stream ke multi-live wall

### [x] T7 - 4 live streams serentak (2x2)
Deliverable:
- Minimum 4 feed playable serentak dalam wall

Test live:
- Aktifkan layout 2x2

Nampak terus:
- 4 kamera berjalan serentak dalam satu screen

---

### [x] T8 - Stream health badges
Deliverable:
- Badge status pada setiap tile: ONLINE / OFFLINE / DEGRADED

Test live:
- Buka wall, tengok status setiap tile

Nampak terus:
- Indikator health muncul live pada setiap kamera

---

### [x] T9 - Auto-refresh fallback untuk snapshot-only feeds
Deliverable:
- Kamera jenis image snapshot auto refresh ikut interval

Test live:
- Pilih kamera snapshot

Nampak terus:
- Gambar update berkala (timestamp/frame berubah)

---

### [x] T10 - Focus mode
Deliverable:
- Klik mana-mana tile untuk buka satu kamera besar + sidebar camera list

Test live:
- Klik tile pada wall

Nampak terus:
- Satu kamera jadi besar (mode investigation)

---

## Sprint C - Geospatial + operator workflow

### [x] T11 - Map mode Malaysia
Deliverable:
- Peta dengan marker kamera ikut lat/lon

Test live:
- Buka tab `Map`
- Klik marker

Nampak terus:
- Kamera berkaitan terus dipaparkan/play dari marker

---

### [x] T12 - Saved view preset
Deliverable:
- Simpan preset filter + layout (contoh: `KL Traffic`, `North-South Highway`)

Test live:
- Set filter, save preset, reload page, apply preset

Nampak terus:
- Dashboard kembali ke konfigurasi yang disimpan

---

### [x] T13 - Patrol mode (auto rotate)
Deliverable:
- Auto-cycle kamera setiap X saat ikut filter aktif

Test live:
- On `Patrol Mode`

Nampak terus:
- Kamera bertukar automatik pada wall/focus mode

---

### [x] T14 - Proxy/relay integration untuk feed susah
Deliverable:
- Feed yang sebelum ini tak play (CORS/referer) jadi playable melalui relay
- UI tunjuk `via relay` tag

Test live:
- Buka feed yang sebelum ini gagal

Nampak terus:
- Feed itu kini keluar live dalam app

---

### [x] T15 - "Ops Ready" status panel
Deliverable:
- Widget dashboard: total camera, online count, offline count, active filters

Test live:
- Tukar filter / disable sample feed

Nampak terus:
- Nombor panel berubah live ikut keadaan semasa

---

## Definition of Done (Malaysia MVP)

MVP siap bila:
- minimum 20 kamera metadata Malaysia masuk
- minimum 8 kamera playable live/snapshot dalam web app
- filter lokasi + purpose berfungsi real-time
- wall mode, focus mode, map mode, patrol mode berfungsi
- setiap langkah pembangunan ada bukti UI yang boleh nampak terus

## Cadangan execution mode

Untuk pastikan awak nampak progress tanpa tunggu lama:
- Saya deliver per task (T1, T2, T3...) dan setiap kali terus bagi run-test point
- Lepas siap 1 task, saya hantar screenshot + arahan test ringkas
- Tidak gabung banyak task sekaligus supaya setiap update jelas nampak
