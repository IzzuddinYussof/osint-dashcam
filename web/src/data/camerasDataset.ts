// Malaysia Camera Metadata Dataset
// Task T3 - Structured camera records with complete metadata
// Task T6 - Added stream_type, stream_url, and source fields for live feeds
import { MYSGROAD_CAMERA_CATALOG } from './mysgroadCatalog'

export interface CameraMetadata {
  id: string
  name: string
  country?: string
  state: string
  area: string
  category: string
  purpose: string
  lat?: number
  lon?: number
  status?: 'online' | 'offline' | 'loading'
  stream_type?: 'snapshot' | 'hls' | 'mjpeg' | 'embed' | 'none'
  feed_kind?: 'live' | 'snapshot'
  stream_url?: string
  stream_relay_url?: string
  update_rate_ms?: number
  source?: string
  source_url?: string
  source_site?: string
  source_group?: string
  network_code?: string
  view_hint?: string
}

interface HbcCameraConfig {
  id: string
  name: string
  state: string
  area: string
  category: string
  purpose: string
  lat?: number
  lon?: number
  streamUrl: string
  pageSlug: string
  sourceGroup: string
  viewHint: string
}

const MYSGROAD_REFRESH_MS = 60000
const HBC_REFRESH_MS = 60000

const MYSGROAD_ROUTE_PAGES: Record<string, string> = {
  BES: '/proxy/mysgroad/traffic-cam/highway-bes',
  CKH: '/proxy/mysgroad/traffic-cam/highway-grandsaga',
  DASH: '/proxy/mysgroad/traffic-cam/highway-dash',
  DUKE: '/proxy/mysgroad/traffic-cam/highway-duke',
  JB_CITY: '/proxy/mysgroad/jb-city',
  JSAHMS: '/proxy/mysgroad/traffic-cam/highway-jsahms',
  KLK: '/proxy/mysgroad/traffic-cam/highway-klk',
  KLP: '/proxy/mysgroad/traffic-cam/highway-mex',
  KSA: '/proxy/mysgroad/traffic-cam/highway-lksa',
  LDP: '/proxy/mysgroad/traffic-cam/highway-ldp',
  LKS: '/proxy/mysgroad/traffic-cam/highway-lekas',
  NKV: '/proxy/mysgroad/traffic-cam/highway-nkve',
  PNB: '/proxy/mysgroad/traffic-cam/highway-pnb',
  SDE: '/proxy/mysgroad/traffic-cam/highway-sde',
  SKV: '/proxy/mysgroad/traffic-cam/highway-skve',
  SPE: '/proxy/mysgroad/traffic-cam/highway-spe',
  SUKE: '/proxy/mysgroad/traffic-cam/highway-suke',
  WCE: '/proxy/mysgroad/traffic-cam/highway-wce',
  SGP_AYE: '/proxy/mysgroad/traffic-cam/sg-aye',
  SGP_BKE: '/proxy/mysgroad/traffic-cam/sg-bke',
  SGP_CTE: '/proxy/mysgroad/traffic-cam/sg-cte',
  SGP_ECP: '/proxy/mysgroad/traffic-cam/sg-ecp',
  SGP_KJE: '/proxy/mysgroad/traffic-cam/sg-kje',
  SGP_KPE: '/proxy/mysgroad/traffic-cam/sg-kpe',
  SGP_LA: '/proxy/mysgroad/traffic-cam/sg-la',
  SGP_MCE: '/proxy/mysgroad/traffic-cam/sg-mce',
  SGP_PIE: '/proxy/mysgroad/traffic-cam/sg-pie',
  SGP_SENTOSA: '/proxy/mysgroad/traffic-cam/sg-sentosa',
  SGP_SLE: '/proxy/mysgroad/traffic-cam/sg-sle',
  SGP_TPE: '/proxy/mysgroad/traffic-cam/sg-tpe',
  SGP_TUAS: '/proxy/mysgroad/tuas-checkpoint',
  SGP_WOODLANDS: '/proxy/mysgroad/woodlands-checkpoint',
}

const resolvePublicProxyUrl = (url?: string): string | undefined => {
  if (!url) return undefined

  if (url.startsWith('/proxy/klccc/')) {
    return `https://klccc.dbkl.gov.my/${url.slice('/proxy/klccc/'.length)}`
  }

  if (url.startsWith('/proxy/fujinomiya/')) {
    return `https://www.fujinomiya-camera.jp/${url.slice('/proxy/fujinomiya/'.length)}`
  }

  if (url.startsWith('/proxy/fujisabo/')) {
    return `https://www.cbr.mlit.go.jp/${url.slice('/proxy/fujisabo/'.length)}`
  }

  if (url.startsWith('/proxy/mysgroad/')) {
    return `https://www.mysgroad.com${url.slice('/proxy/mysgroad'.length)}`
  }

  return undefined
}

const resolveSourceUrl = (camera: CameraMetadata): string | undefined => {
  if (camera.source_url) return camera.source_url

  if (camera.source_site === 'KLCCC') {
    return 'https://klccc.dbkl.gov.my/ms/cctv-images/'
  }

  if (camera.source_site === 'Fujinomiya Camera') {
    return 'https://www.fujinomiya-camera.jp/livecam.htm'
  }

  if (camera.source_site === 'Fuji Sabo') {
    if (camera.stream_type === 'embed') {
      return resolvePublicProxyUrl(camera.stream_url)
    }

    return 'https://www.cbr.mlit.go.jp/fujisabo/en/camera/camera.html'
  }

  if (camera.source_site === 'mySGRoad') {
    const routePage = camera.stream_relay_url ?? MYSGROAD_ROUTE_PAGES[camera.network_code ?? '']
    return resolvePublicProxyUrl(routePage)
  }

  return resolvePublicProxyUrl(camera.stream_relay_url) ?? resolvePublicProxyUrl(camera.stream_url)
}

const LEGACY_MYSGROAD_CAMERA_IDS = new Set([
  'CAM004',
  'CAM005',
  'CAM006',
  'CAM007',
  'CAM008',
  'CAM009',
  'CAM010',
  'CAM011',
  'CAM012',
  'CAM013',
  'CAM014',
  'CAM015',
  'CAM016',
  'CAM017',
  'CAM018',
  'CAM019',
  'CAM020',
  'CAM021',
  'CAM022',
])

const buildMySGRoadCatalogCameras = (): CameraMetadata[] =>
  MYSGROAD_CAMERA_CATALOG.map((camera) => ({
    id: camera.id,
    name: camera.name,
    country: camera.country,
    state: camera.state,
    area: camera.area,
    category: camera.category,
    purpose: camera.purpose,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    stream_url: camera.imageUrl,
    stream_relay_url: camera.relayPath,
    update_rate_ms: MYSGROAD_REFRESH_MS,
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: camera.sourceGroup,
    network_code: camera.networkCode,
  }))

const ADDITIONAL_HBC_CAMERAS: HbcCameraConfig[] = [
  {
    id: 'JPN024',
    name: 'Shin-Chitose Airport Snapshot',
    state: 'Hokkaido',
    area: 'Shin-Chitose Airport',
    category: 'transport',
    purpose: 'transport',
    lat: 42.7752,
    lon: 141.6923,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media/chitosehd_720.jpg',
    pageSlug: 'shinchitose',
    sourceGroup: 'Hokkaido Transport',
    viewHint: 'Airport district and apron-facing view',
  },
  {
    id: 'JPN025',
    name: 'Obihiro City Snapshot',
    state: 'Hokkaido',
    area: 'Obihiro',
    category: 'city',
    purpose: 'street',
    lat: 42.9239,
    lon: 143.1965,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media/obihirohd_720.jpg',
    pageSlug: 'obihiro',
    sourceGroup: 'Hokkaido Cities',
    viewHint: 'City-center skyline',
  },
  {
    id: 'JPN026',
    name: 'Tomakomai City Snapshot',
    state: 'Hokkaido',
    area: 'Tomakomai',
    category: 'city',
    purpose: 'street',
    lat: 42.6343,
    lon: 141.6055,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media/tomakomaihd_720.jpg',
    pageSlug: 'tomakomai',
    sourceGroup: 'Hokkaido Cities',
    viewHint: 'Port city skyline',
  },
  {
    id: 'JPN027',
    name: 'Nakayama Pass Snapshot',
    state: 'Hokkaido',
    area: 'Nakayama Pass',
    category: 'highway',
    purpose: 'highway',
    lat: 42.8466,
    lon: 141.1452,
    streamUrl: 'https://www.hbc.co.jp/weather/roadcamera/current/picture/970000000520.jpg',
    pageSlug: 'nakayama',
    sourceGroup: 'Hokkaido Nature',
    viewHint: 'Mountain pass road camera',
  },
  {
    id: 'JPN028',
    name: 'Hiroo Snapshot',
    state: 'Hokkaido',
    area: 'Hiroo',
    category: 'city',
    purpose: 'street',
    lat: 42.289,
    lon: 143.3127,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media/hiroohd_720.jpg',
    pageSlug: 'hiroo',
    sourceGroup: 'Hokkaido Coast',
    viewHint: 'Coastal town view',
  },
  {
    id: 'JPN029',
    name: 'Hamanaka Wetland Center Snapshot',
    state: 'Hokkaido',
    area: 'Kiritappu Wetland Center',
    category: 'nature',
    purpose: 'landmark',
    lat: 43.0779,
    lon: 145.1211,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media2/shitsugen.jpg',
    pageSlug: 'hamanaka',
    sourceGroup: 'Hokkaido Nature',
    viewHint: 'Wetland and marshland view',
  },
  {
    id: 'JPN030',
    name: 'Hamanaka Biwase Snapshot',
    state: 'Hokkaido',
    area: 'Biwase',
    category: 'nature',
    purpose: 'landmark',
    lat: 43.085,
    lon: 145.081,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media2/kiritappu.jpg',
    pageSlug: 'hamanakabiwase',
    sourceGroup: 'Hokkaido Nature',
    viewHint: 'Coastal marsh and bay view',
  },
  {
    id: 'JPN031',
    name: 'Rumoi Snapshot',
    state: 'Hokkaido',
    area: 'Rumoi',
    category: 'city',
    purpose: 'street',
    lat: 43.9343,
    lon: 141.6424,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media/rumoihd_720.jpg',
    pageSlug: 'rumoi',
    sourceGroup: 'Hokkaido Coast',
    viewHint: 'Coastal city view',
  },
  {
    id: 'JPN032',
    name: 'Esashi Snapshot',
    state: 'Hokkaido',
    area: 'Esashi',
    category: 'city',
    purpose: 'street',
    lat: 41.8694,
    lon: 140.1278,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media/esashihd_720.jpg',
    pageSlug: 'esashi',
    sourceGroup: 'Hokkaido Coast',
    viewHint: 'Historic coastal town view',
  },
  {
    id: 'JPN033',
    name: 'Kushiro Snapshot',
    state: 'Hokkaido',
    area: 'Kushiro',
    category: 'city',
    purpose: 'street',
    lat: 42.9849,
    lon: 144.3814,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media/kushirohd_720.jpg',
    pageSlug: 'kushiro',
    sourceGroup: 'Hokkaido Cities',
    viewHint: 'Port city skyline',
  },
  {
    id: 'JPN034',
    name: 'Utoro Snapshot',
    state: 'Hokkaido',
    area: 'Utoro',
    category: 'nature',
    purpose: 'landmark',
    lat: 44.0622,
    lon: 144.9994,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media/utorohd_720.jpg',
    pageSlug: 'utoro',
    sourceGroup: 'Hokkaido Coast',
    viewHint: 'Shiretoko coast view',
  },
  {
    id: 'JPN035',
    name: 'Iwamizawa Snapshot',
    state: 'Hokkaido',
    area: 'Iwamizawa',
    category: 'city',
    purpose: 'street',
    lat: 43.1962,
    lon: 141.7597,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media/iwamizawahd_720.jpg',
    pageSlug: 'iwamizawa',
    sourceGroup: 'Hokkaido Cities',
    viewHint: 'Inland city-center view',
  },
  {
    id: 'JPN036',
    name: 'Muroran Snapshot',
    state: 'Hokkaido',
    area: 'Muroran',
    category: 'city',
    purpose: 'street',
    lat: 42.3152,
    lon: 140.9738,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media/muroranhd_720.jpg',
    pageSlug: 'muroran',
    sourceGroup: 'Hokkaido Coast',
    viewHint: 'Harbor city skyline',
  },
  {
    id: 'JPN037',
    name: 'Wakkanai Snapshot',
    state: 'Hokkaido',
    area: 'Wakkanai',
    category: 'city',
    purpose: 'street',
    lat: 45.4156,
    lon: 141.673,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media/wakkanaihd_720.jpg',
    pageSlug: 'wakkanai',
    sourceGroup: 'Hokkaido Coast',
    viewHint: 'Northern coastal city view',
  },
  {
    id: 'JPN038',
    name: 'Nemuro Snapshot',
    state: 'Hokkaido',
    area: 'Nemuro',
    category: 'city',
    purpose: 'street',
    lat: 43.3301,
    lon: 145.5828,
    streamUrl: 'https://www.hbc.co.jp/info-cam/media/nemurohd_720.jpg',
    pageSlug: 'nemuro',
    sourceGroup: 'Hokkaido Coast',
    viewHint: 'Far east coastal city view',
  },
]

const buildAdditionalHbcCameras = (): CameraMetadata[] =>
  ADDITIONAL_HBC_CAMERAS.map((camera) => ({
    id: camera.id,
    name: camera.name,
    country: 'Japan',
    state: camera.state,
    area: camera.area,
    category: camera.category,
    purpose: camera.purpose,
    lat: camera.lat,
    lon: camera.lon,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: HBC_REFRESH_MS,
    stream_url: camera.streamUrl,
    source: 'HBC current-image snapshot',
    source_url: `https://www.hbc.co.jp/info-cam/${camera.pageSlug}.html`,
    source_site: 'HBC Info Cam',
    source_group: camera.sourceGroup,
    view_hint: camera.viewHint,
  }))

const baseCamerasDataset: CameraMetadata[] = [
  // Kuala Lumpur
  {
    id: 'CAM001',
    name: 'KLCCC CCTV CN030F - Live',
    state: 'Kuala Lumpur',
    area: 'Central KL',
    category: 'city',
    purpose: 'city',
    lat: 3.1459,
    lon: 101.6953,
    status: 'online',
    stream_type: 'hls',
    feed_kind: 'live',
    stream_url: '/proxy/klccc/wp-content/uploads/rtsp-streams/cn030f/index.m3u8',
    source: 'KLCCC official public HLS feed',
    source_site: 'KLCCC',
    source_group: 'Kuala Lumpur',
    network_code: 'DBKL'
  },
  {
    id: 'CAM002',
    name: 'KLCCC CCTV CN033F - Live',
    state: 'Kuala Lumpur',
    area: 'Central KL',
    category: 'city',
    purpose: 'city',
    lat: 3.1390,
    lon: 101.6869,
    status: 'online',
    stream_type: 'hls',
    feed_kind: 'live',
    stream_url: '/proxy/klccc/wp-content/uploads/rtsp-streams/cn033f/index.m3u8',
    source: 'KLCCC official public HLS feed',
    source_site: 'KLCCC',
    source_group: 'Kuala Lumpur',
    network_code: 'DBKL'
  },
  {
    id: 'CAM003',
    name: 'KLCCC CCTV CN407F - Live',
    state: 'Kuala Lumpur',
    area: 'Central KL',
    category: 'city',
    purpose: 'city',
    lat: 3.1528,
    lon: 101.7037,
    status: 'online',
    stream_type: 'hls',
    feed_kind: 'live',
    stream_url: '/proxy/klccc/wp-content/uploads/rtsp-streams/cn407f/index.m3u8',
    source: 'KLCCC official public HLS feed',
    source_site: 'KLCCC',
    source_group: 'Kuala Lumpur',
    network_code: 'DBKL'
  },
  {
    id: 'CAM004',
    name: 'KL-Karak Expressway Camera 01',
    state: 'Kuala Lumpur',
    area: 'Gombak',
    category: 'highway',
    purpose: 'highway',
    lat: 3.2370,
    lon: 101.7312,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-klk/highway-klk-traffic-camera-1-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'KLK'
  },
  {
    id: 'CAM005',
    name: 'BESRAYA Expressway Camera 01',
    state: 'Kuala Lumpur',
    area: 'Sungai Besi',
    category: 'highway',
    purpose: 'highway',
    lat: 3.0988,
    lon: 101.7073,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-bes/highway-bes-traffic-camera-1-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'BES'
  },

  // Selangor
  {
    id: 'CAM006',
    name: 'Grand Saga Highway Camera 01',
    state: 'Selangor',
    area: 'Cheras',
    category: 'highway',
    purpose: 'highway',
    lat: 3.0907,
    lon: 101.7650,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-grandsaga/highway-grandsaga-traffic-camera-1-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'CKH'
  },
  {
    id: 'CAM007',
    name: 'Senai-Desaru Expressway Camera 01',
    state: 'Johor',
    area: 'Senai',
    category: 'highway',
    purpose: 'highway',
    lat: 1.6011,
    lon: 103.6550,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-sde/highway-sde-traffic-camera-1-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'SDE'
  },
  {
    id: 'CAM008',
    name: 'South Klang Valley Expressway Camera 01',
    state: 'Selangor',
    area: 'Klang',
    category: 'highway',
    purpose: 'highway',
    lat: 3.0253,
    lon: 101.4515,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-skve/highway-skve-traffic-camera-1-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'SKV'
  },
  {
    id: 'CAM009',
    name: 'SUKE Highway Camera 01',
    state: 'Selangor',
    area: 'Ampang',
    category: 'highway',
    purpose: 'highway',
    lat: 3.1352,
    lon: 101.7616,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-suke/highway-suke-traffic-camera-1-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'SUKE'
  },
  {
    id: 'CAM010',
    name: 'LKSA Highway Camera 01E',
    state: 'Selangor',
    area: 'Shah Alam',
    category: 'highway',
    purpose: 'highway',
    lat: 3.0738,
    lon: 101.5050,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-lksa/highway-lksa-traffic-camera-1e-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'KSA'
  },

  // Putrajaya
  {
    id: 'CAM011',
    name: 'DASH Expressway Camera 01',
    state: 'Selangor',
    area: 'Damansara',
    category: 'highway',
    purpose: 'highway',
    lat: 3.1647,
    lon: 101.6154,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-dash/highway-dash-traffic-camera-1-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'DASH'
  },
  {
    id: 'CAM012',
    name: 'Setiawangsa-Pantai Expressway Camera 01E',
    state: 'Kuala Lumpur',
    area: 'Setiawangsa',
    category: 'highway',
    purpose: 'highway',
    lat: 3.1732,
    lon: 101.7447,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-spe/highway-spe-traffic-camera-1e-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'SPE'
  },

  // Johor
  {
    id: 'CAM013',
    name: 'West Coast Expressway Camera 06D',
    state: 'Perak',
    area: 'West Coast Corridor',
    category: 'highway',
    purpose: 'highway',
    lat: 4.3348,
    lon: 100.9218,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-wce/highway-wce-traffic-camera-6d-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'WCE'
  },
  {
    id: 'CAM014',
    name: 'Johor Bahru City Camera 05',
    state: 'Johor',
    area: 'Johor Bahru',
    category: 'city',
    purpose: 'street',
    lat: 1.4655,
    lon: 103.7578,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/jb-city/jb-city-traffic-camera-5-1773505082.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Johor Bahru',
    network_code: 'JB_CITY'
  },
  {
    id: 'CAM015',
    name: 'Johor Bahru City Camera 06',
    state: 'Johor',
    area: 'Johor Bahru',
    category: 'city',
    purpose: 'street',
    lat: 1.4700,
    lon: 103.7600,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/jb-city/jb-city-traffic-camera-6-1773505082.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Johor Bahru',
    network_code: 'JB_CITY'
  },

  // Pulau Pinang
  {
    id: 'CAM016',
    name: 'Penang Bridge Camera 01',
    state: 'Pulau Pinang',
    area: 'Gelugor',
    category: 'highway',
    purpose: 'landmark',
    lat: 5.3515,
    lon: 100.3990,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-pnb/highway-pnb-traffic-camera-1-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Penang',
    network_code: 'PNB'
  },
  {
    id: 'CAM017',
    name: 'Penang Second Bridge Camera 01',
    state: 'Pulau Pinang',
    area: 'Batu Kawan',
    category: 'highway',
    purpose: 'landmark',
    lat: 5.2345,
    lon: 100.3635,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-jsahms/highway-jsahms-traffic-camera-1-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Penang',
    network_code: 'JSAHMS'
  },
  {
    id: 'CAM018',
    name: 'MEX Expressway Camera 01',
    state: 'Putrajaya',
    area: 'Putrajaya Link',
    category: 'highway',
    purpose: 'highway',
    lat: 2.9264,
    lon: 101.6964,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-mex/highway-mex-traffic-camera-1-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'KLP'
  },

  // Pahang
  {
    id: 'CAM019',
    name: 'LEKAS Expressway Camera 01A',
    state: 'Negeri Sembilan',
    area: 'Kajang-Seremban',
    category: 'highway',
    purpose: 'highway',
    lat: 2.9935,
    lon: 101.7874,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-lekas/highway-lekas-traffic-camera-1a-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'LKS'
  },
  {
    id: 'CAM020',
    name: 'LDP Expressway Camera 01G',
    state: 'Selangor',
    area: 'Petaling Jaya',
    category: 'highway',
    purpose: 'highway',
    lat: 3.1129,
    lon: 101.6074,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-ldp/highway-ldp-traffic-camera-1g-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'LDP'
  },

  // Melaka
  {
    id: 'CAM021',
    name: 'DUKE Expressway Camera 01',
    state: 'Kuala Lumpur',
    area: 'Duta',
    category: 'highway',
    purpose: 'highway',
    lat: 3.1812,
    lon: 101.6674,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-duke/highway-duke-traffic-camera-1-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'DUKE'
  },
  {
    id: 'CAM022',
    name: 'NKVE Expressway Camera 01',
    state: 'Selangor',
    area: 'Shah Alam',
    category: 'highway',
    purpose: 'highway',
    lat: 3.0733,
    lon: 101.5185,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://www.mysgroad.com/sites/mysgroad/files/img/26/3/15/0/highway-nkve/highway-nkve-traffic-camera-1-1773505682.jpg',
    source: 'mySGRoad public traffic camera snapshot',
    source_site: 'mySGRoad',
    source_group: 'Malaysia Highways',
    network_code: 'NKV'
  },

  // Japan - Mount Fuji
  {
    id: 'JPN002',
    name: 'Mount Fuji - Fujinomiya City Snapshot',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Fujinomiya',
    category: 'nature',
    purpose: 'landmark',
    lat: 35.2221,
    lon: 138.6215,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 600000,
    stream_url: '/proxy/fujinomiya/10photo/new.jpg',
    source: 'Fujinomiya City official current-image snapshot',
    source_site: 'Fujinomiya Camera',
    source_group: 'Mount Fuji',
    view_hint: 'Southwest side of Mount Fuji'
  },
  {
    id: 'JPN004',
    name: 'Mount Fuji - Gotemba City Office Snapshot',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Gotemba',
    category: 'nature',
    purpose: 'landmark',
    lat: 35.3083,
    lon: 138.9349,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 600000,
    stream_url: '/proxy/fujisabo/fujisabo/camera/images/00045.jpg',
    source: 'Fuji Sabo official auto-refreshing snapshot',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji',
    source_url: 'https://www.cbr.mlit.go.jp/fujisabo/en/camera/cctv_h264.html?cctv=f45&area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2',
    view_hint: 'East-southeast side of Mount Fuji'
  },

  // Japan - Additional Mount Fuji snapshots
  {
    id: 'JPN007',
    name: 'Mount Fuji - Fuji City Hall Snapshot',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Fuji',
    category: 'nature',
    purpose: 'landmark',
    lat: 35.1613,
    lon: 138.6767,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 600000,
    stream_url: '/proxy/fujisabo/fujisabo/camera/images/00024.jpg',
    source: 'Fuji Sabo official auto-refreshing snapshot',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji',
    source_url: 'https://www.cbr.mlit.go.jp/fujisabo/en/camera/cctv.html?cctv=f24&area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2',
    view_hint: 'South-southwest side of Mount Fuji'
  },
  {
    id: 'JPN009',
    name: 'Mount Fuji - Asagiri Snapshot Viewer',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Asagiri',
    category: 'nature',
    purpose: 'landmark',
    lat: 35.4215,
    lon: 138.5657,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    stream_url: '/proxy/fujisabo/fujisabo/camera/images/00023.jpg',
    update_rate_ms: 600000,
    source: 'Fuji Sabo official auto-refreshing snapshot',
    source_url: 'https://www.cbr.mlit.go.jp/fujisabo/en/camera/cctv_h264.html?cctv=f23&area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji',
    view_hint: 'West-northwest side of Mount Fuji'
  },
  {
    id: 'JPN010',
    name: 'Mount Fuji - Tenshigatake Snapshot Viewer',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Tenshigatake',
    category: 'nature',
    purpose: 'landmark',
    lat: 35.3240,
    lon: 138.5670,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    stream_url: '/proxy/fujisabo/fujisabo/camera/images/00026.jpg',
    update_rate_ms: 600000,
    source: 'Fuji Sabo official auto-refreshing snapshot',
    source_url: 'https://www.cbr.mlit.go.jp/fujisabo/en/camera/cctv_h264.html?cctv=f26&area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji',
    view_hint: 'West-southwest side of Mount Fuji'
  },
  {
    id: 'JPN011',
    name: 'Mount Fuji - Hakoarasawa Snapshot Viewer',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Hakoarasawa',
    category: 'nature',
    purpose: 'landmark',
    lat: 35.2850,
    lon: 138.6450,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    stream_url: '/proxy/fujisabo/fujisabo/camera/images/00027.jpg',
    update_rate_ms: 600000,
    source: 'Fuji Sabo official auto-refreshing snapshot',
    source_url: 'https://www.cbr.mlit.go.jp/fujisabo/en/camera/cctv_h264.html?cctv=f27&area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji',
    view_hint: 'Southwest side of Mount Fuji'
  },
  {
    id: 'JPN012',
    name: 'Mount Fuji - Yui Satta Pass Snapshot Viewer',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Yui Satta Pass',
    category: 'nature',
    purpose: 'landmark',
    lat: 35.1062,
    lon: 138.5111,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    stream_url: '/proxy/fujisabo/fujisabo/camera/images/00033.jpg',
    update_rate_ms: 600000,
    source: 'Fuji Sabo official auto-refreshing snapshot',
    source_url: 'https://www.cbr.mlit.go.jp/fujisabo/en/camera/cctv_h264.html?cctv=f33&area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji',
    view_hint: 'Far south-southwest view across Suruga Bay'
  },
  {
    id: 'JPN020',
    name: 'Mount Fuji - Taroubo Snapshot',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Taroubo',
    category: 'nature',
    purpose: 'landmark',
    lat: 35.2920,
    lon: 138.8080,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 600000,
    stream_url: '/proxy/fujisabo/fujisabo/camera/images/00032.jpg',
    source: 'Fuji Sabo official auto-refreshing snapshot',
    source_url: 'https://www.cbr.mlit.go.jp/fujisabo/en/camera/cctv_h264.html?cctv=f32&area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji',
    view_hint: 'East-southeast side of Mount Fuji'
  },
  {
    id: 'JPN021',
    name: 'Mount Fuji - Katafutayama Snapshot',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Katafutayama',
    category: 'nature',
    purpose: 'landmark',
    lat: 35.2510,
    lon: 138.7890,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 600000,
    stream_url: '/proxy/fujisabo/fujisabo/camera/images/00039.jpg',
    source: 'Fuji Sabo official auto-refreshing snapshot',
    source_url: 'https://www.cbr.mlit.go.jp/fujisabo/en/camera/cctv_h264.html?cctv=f39&area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji',
    view_hint: 'Southeast side of Mount Fuji'
  },
  {
    id: 'JPN022',
    name: 'Mount Fuji - Fuji Sabo Office Snapshot',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Fuji Sabo Office',
    category: 'nature',
    purpose: 'landmark',
    lat: 35.2290,
    lon: 138.6200,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 600000,
    stream_url: '/proxy/fujisabo/fujisabo/camera/images/00030.jpg',
    source: 'Fuji Sabo official auto-refreshing snapshot',
    source_url: 'https://www.cbr.mlit.go.jp/fujisabo/en/camera/cctv_h264.html?cctv=f30&area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji',
    view_hint: 'Southwest foothills view of Mount Fuji'
  },
  {
    id: 'JPN023',
    name: 'Mount Fuji - Sekotsuji Snapshot',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Sekotsuji',
    category: 'nature',
    purpose: 'landmark',
    lat: 35.2350,
    lon: 138.7800,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 600000,
    stream_url: '/proxy/fujisabo/fujisabo/camera/images/00025.jpg',
    source: 'Fuji Sabo official auto-refreshing snapshot',
    source_url: 'https://www.cbr.mlit.go.jp/fujisabo/en/camera/cctv_h264.html?cctv=f25&area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji',
    view_hint: 'South-southeast foothills view of Mount Fuji'
  },
  {
    id: 'JPN013',
    name: 'Central Sapporo City Snapshot',
    country: 'Japan',
    state: 'Hokkaido',
    area: 'Sapporo',
    category: 'city',
    purpose: 'street',
    lat: 43.0618,
    lon: 141.3545,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 60000,
    stream_url: 'https://www.hbc.co.jp/info-cam/media/sapporohd_720.jpg',
    source: 'HBC current city-center snapshot',
    source_url: 'https://www.hbc.co.jp/info-cam/sapporo.html',
    source_site: 'HBC Info Cam',
    source_group: 'Hokkaido Cities',
    view_hint: 'Central city skyline'
  },
  {
    id: 'JPN014',
    name: 'JR Sapporo Station Snapshot',
    country: 'Japan',
    state: 'Hokkaido',
    area: 'Sapporo',
    category: 'city',
    purpose: 'transport',
    lat: 43.0687,
    lon: 141.3508,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 60000,
    stream_url: 'https://www.hbc.co.jp/info-cam/media/jrsapporohd_720.jpg',
    source: 'HBC current station-district snapshot',
    source_url: 'https://www.hbc.co.jp/info-cam/jrsapporosta.html',
    source_site: 'HBC Info Cam',
    source_group: 'Hokkaido Cities',
    view_hint: 'Station district view'
  },
  {
    id: 'JPN015',
    name: 'Hakodate City Snapshot',
    country: 'Japan',
    state: 'Hokkaido',
    area: 'Hakodate',
    category: 'city',
    purpose: 'street',
    lat: 41.7688,
    lon: 140.7288,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 60000,
    stream_url: 'https://www.hbc.co.jp/info-cam/media/hakodatehd_720.jpg',
    source: 'HBC current city-center snapshot',
    source_url: 'https://www.hbc.co.jp/info-cam/hakodate.html',
    source_site: 'HBC Info Cam',
    source_group: 'Hokkaido Cities',
    view_hint: 'City-center skyline'
  },
  {
    id: 'JPN016',
    name: 'Otaru City Snapshot',
    country: 'Japan',
    state: 'Hokkaido',
    area: 'Otaru',
    category: 'city',
    purpose: 'street',
    lat: 43.1907,
    lon: 140.9947,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 60000,
    stream_url: 'https://www.hbc.co.jp/info-cam/media/otaruhd_720.jpg',
    source: 'HBC current city-center snapshot',
    source_url: 'https://www.hbc.co.jp/info-cam/otaru.html',
    source_site: 'HBC Info Cam',
    source_group: 'Hokkaido Cities',
    view_hint: 'City-center skyline'
  },
  {
    id: 'JPN017',
    name: 'Asahikawa City Snapshot',
    country: 'Japan',
    state: 'Hokkaido',
    area: 'Asahikawa',
    category: 'city',
    purpose: 'street',
    lat: 43.7706,
    lon: 142.3649,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 60000,
    stream_url: 'https://www.hbc.co.jp/info-cam/media/asahikawahd_720.jpg',
    source: 'HBC current city-center snapshot',
    source_url: 'https://www.hbc.co.jp/info-cam/asahikawa.html',
    source_site: 'HBC Info Cam',
    source_group: 'Hokkaido Cities',
    view_hint: 'City-center skyline'
  },
  {
    id: 'JPN018',
    name: 'Sendai Mediatheque Snapshot A',
    country: 'Japan',
    state: 'Miyagi',
    area: 'Sendai',
    category: 'city',
    purpose: 'landmark',
    lat: 38.2647,
    lon: 140.8670,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 60000,
    stream_url: 'https://www.smt.jp/livecam/motion_a',
    source: 'Sendai Mediatheque current city snapshot',
    source_url: 'https://www.smt.jp/livecam/index_en.html',
    source_site: 'Sendai Mediatheque',
    source_group: 'Sendai',
    view_hint: 'Downtown landmark-facing view'
  },
  {
    id: 'JPN019',
    name: 'Sendai Mediatheque Snapshot B',
    country: 'Japan',
    state: 'Miyagi',
    area: 'Sendai',
    category: 'city',
    purpose: 'street',
    lat: 38.2647,
    lon: 140.8670,
    status: 'online',
    stream_type: 'snapshot',
    feed_kind: 'snapshot',
    update_rate_ms: 60000,
    stream_url: 'https://www.smt.jp/livecam/motion_b',
    source: 'Sendai Mediatheque current street snapshot',
    source_url: 'https://www.smt.jp/livecam/index_en.html',
    source_site: 'Sendai Mediatheque',
    source_group: 'Sendai',
    view_hint: 'Downtown street view'
  }
]

export const malaysiaCamerasDataset: CameraMetadata[] = [
  ...baseCamerasDataset.filter((camera) => !LEGACY_MYSGROAD_CAMERA_IDS.has(camera.id)),
  ...buildAdditionalHbcCameras(),
  ...buildMySGRoadCatalogCameras(),
].map((camera) => {
  const normalizedCamera = camera.source_site === 'mySGRoad'
    ? {
      ...camera,
      feed_kind: camera.feed_kind ?? 'snapshot',
      stream_relay_url: camera.stream_relay_url ?? MYSGROAD_ROUTE_PAGES[camera.network_code ?? ''],
      update_rate_ms: camera.update_rate_ms ?? MYSGROAD_REFRESH_MS,
    }
    : camera

  return {
    ...normalizedCamera,
    source_url: resolveSourceUrl(normalizedCamera),
  }
})

export const getTotalCameraCount = (): number => {
  return malaysiaCamerasDataset.length
}

export const getCamerasByState = (state: string): CameraMetadata[] => {
  return malaysiaCamerasDataset.filter(cam => cam.state === state)
}

export const getCamerasByPurpose = (purpose: string): CameraMetadata[] => {
  return malaysiaCamerasDataset.filter(cam => cam.purpose === purpose)
}
