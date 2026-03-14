// Malaysia Camera Metadata Dataset
// Task T3 - Structured camera records with complete metadata
// Task T6 - Added stream_type, stream_url, and source fields for live feeds

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
}

interface MySGRoadSingaporeRouteConfig {
  slug: string
  area: string
  name: string
  networkCode: string
  pagePath: string
  count: number
  category: string
  purpose: string
}

const MYSGROAD_REFRESH_MS = 60000

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

const SINGAPORE_MYSGROAD_ROUTES: MySGRoadSingaporeRouteConfig[] = [
  { slug: 'sg-woodlands', area: 'Woodlands Checkpoint', name: 'Woodlands Checkpoint', networkCode: 'SGP_WOODLANDS', pagePath: '/proxy/mysgroad/woodlands-checkpoint', count: 5, category: 'checkpoint', purpose: 'checkpoint' },
  { slug: 'sg-tuas', area: 'Tuas Checkpoint', name: 'Tuas Checkpoint', networkCode: 'SGP_TUAS', pagePath: '/proxy/mysgroad/tuas-checkpoint', count: 6, category: 'checkpoint', purpose: 'checkpoint' },
  { slug: 'sg-aye', area: 'Ayer Rajah Expressway', name: 'Ayer Rajah Expressway', networkCode: 'SGP_AYE', pagePath: '/proxy/mysgroad/traffic-cam/sg-aye', count: 12, category: 'highway', purpose: 'highway' },
  { slug: 'sg-bke', area: 'Bukit Timah Expressway', name: 'Bukit Timah Expressway', networkCode: 'SGP_BKE', pagePath: '/proxy/mysgroad/traffic-cam/sg-bke', count: 6, category: 'highway', purpose: 'highway' },
  { slug: 'sg-cte', area: 'Central Expressway', name: 'Central Expressway', networkCode: 'SGP_CTE', pagePath: '/proxy/mysgroad/traffic-cam/sg-cte', count: 9, category: 'highway', purpose: 'highway' },
  { slug: 'sg-ecp', area: 'East Coast Parkway', name: 'East Coast Parkway', networkCode: 'SGP_ECP', pagePath: '/proxy/mysgroad/traffic-cam/sg-ecp', count: 8, category: 'highway', purpose: 'highway' },
  { slug: 'sg-kje', area: 'Kranji Expressway', name: 'Kranji Expressway', networkCode: 'SGP_KJE', pagePath: '/proxy/mysgroad/traffic-cam/sg-kje', count: 4, category: 'highway', purpose: 'highway' },
  { slug: 'sg-kpe', area: 'Kallang-Paya Lebar Expressway', name: 'Kallang-Paya Lebar Expressway', networkCode: 'SGP_KPE', pagePath: '/proxy/mysgroad/traffic-cam/sg-kpe', count: 6, category: 'highway', purpose: 'highway' },
  { slug: 'sg-la', area: 'Loyang Ave / Tanah Merah Coast Road', name: 'Loyang Ave / Tanah Merah Coast Road', networkCode: 'SGP_LA', pagePath: '/proxy/mysgroad/traffic-cam/sg-la', count: 3, category: 'street', purpose: 'street' },
  { slug: 'sg-mce', area: 'Marina Coastal Expressway', name: 'Marina Coastal Expressway', networkCode: 'SGP_MCE', pagePath: '/proxy/mysgroad/traffic-cam/sg-mce', count: 5, category: 'highway', purpose: 'highway' },
  { slug: 'sg-pie', area: 'Pan-Island Expressway', name: 'Pan-Island Expressway', networkCode: 'SGP_PIE', pagePath: '/proxy/mysgroad/traffic-cam/sg-pie', count: 18, category: 'highway', purpose: 'highway' },
  { slug: 'sg-sle', area: 'Seletar Expressway', name: 'Seletar Expressway', networkCode: 'SGP_SLE', pagePath: '/proxy/mysgroad/traffic-cam/sg-sle', count: 6, category: 'highway', purpose: 'highway' },
  { slug: 'sg-tpe', area: 'Tampines Expressway', name: 'Tampines Expressway', networkCode: 'SGP_TPE', pagePath: '/proxy/mysgroad/traffic-cam/sg-tpe', count: 7, category: 'highway', purpose: 'highway' },
  { slug: 'sg-sentosa', area: 'Sentosa Gateway', name: 'Sentosa Gateway', networkCode: 'SGP_SENTOSA', pagePath: '/proxy/mysgroad/traffic-cam/sg-sentosa', count: 2, category: 'landmark', purpose: 'landmark' },
]

const buildMySGRoadPlaceholderImageUrl = (slug: string, cameraNumber: number): string =>
  `https://www.mysgroad.com/placeholder/${slug}/${slug}-traffic-camera-${cameraNumber}-0.jpg`

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

const buildSingaporeMySGRoadCameras = (): CameraMetadata[] => {
  let cursor = 1

  return SINGAPORE_MYSGROAD_ROUTES.flatMap((route) =>
    Array.from({ length: route.count }, (_, index) => {
      const cameraNumber = index + 1
      const id = `SGP${String(cursor).padStart(3, '0')}`
      cursor += 1

      return {
        id,
        name: `${route.name} Camera ${String(cameraNumber).padStart(2, '0')}`,
        country: 'Singapore',
        state: 'Singapore',
        area: route.area,
        category: route.category,
        purpose: route.purpose,
        status: 'online',
        stream_type: 'snapshot',
        feed_kind: 'snapshot',
        stream_url: buildMySGRoadPlaceholderImageUrl(route.slug, cameraNumber),
        stream_relay_url: route.pagePath,
        update_rate_ms: MYSGROAD_REFRESH_MS,
        source: 'mySGRoad public Singapore traffic camera snapshot',
        source_site: 'mySGRoad',
        source_group: 'Singapore',
        network_code: route.networkCode,
      }
    })
  )
}

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
    source_group: 'Mount Fuji'
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
    source_group: 'Mount Fuji'
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
    source_group: 'Mount Fuji'
  },
  {
    id: 'JPN009',
    name: 'Mount Fuji - Asagiri Snapshot Viewer',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Asagiri',
    category: 'nature',
    purpose: 'landmark',
    status: 'online',
    stream_type: 'embed',
    feed_kind: 'snapshot',
    stream_url: '/proxy/fujisabo/fujisabo/en/camera/cctv_h264.html?area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2&cctv=f23',
    update_rate_ms: 600000,
    source: 'Fuji Sabo official snapshot viewer (auto-updates every 10 minutes)',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji'
  },
  {
    id: 'JPN010',
    name: 'Mount Fuji - Tenshigatake Snapshot Viewer',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Tenshigatake',
    category: 'nature',
    purpose: 'landmark',
    status: 'online',
    stream_type: 'embed',
    feed_kind: 'snapshot',
    stream_url: '/proxy/fujisabo/fujisabo/en/camera/cctv_h264.html?area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2&cctv=f26',
    update_rate_ms: 600000,
    source: 'Fuji Sabo official snapshot viewer (auto-updates every 10 minutes)',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji'
  },
  {
    id: 'JPN011',
    name: 'Mount Fuji - Hakoarasawa Snapshot Viewer',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Hakoarasawa',
    category: 'nature',
    purpose: 'landmark',
    status: 'online',
    stream_type: 'embed',
    feed_kind: 'snapshot',
    stream_url: '/proxy/fujisabo/fujisabo/en/camera/cctv_h264.html?area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2&cctv=f27',
    update_rate_ms: 600000,
    source: 'Fuji Sabo official snapshot viewer (auto-updates every 10 minutes)',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji'
  },
  {
    id: 'JPN012',
    name: 'Mount Fuji - Yui Satta Pass Snapshot Viewer',
    country: 'Japan',
    state: 'Shizuoka',
    area: 'Yui Satta Pass',
    category: 'nature',
    purpose: 'landmark',
    status: 'online',
    stream_type: 'embed',
    feed_kind: 'snapshot',
    stream_url: '/proxy/fujisabo/fujisabo/en/camera/cctv_h264.html?area=%E5%AF%8C%E5%A3%AB%E7%A0%82%E9%98%B2&cctv=f33',
    update_rate_ms: 600000,
    source: 'Fuji Sabo official snapshot viewer (auto-updates every 10 minutes)',
    source_site: 'Fuji Sabo',
    source_group: 'Mount Fuji'
  }
]

export const malaysiaCamerasDataset: CameraMetadata[] = [
  ...baseCamerasDataset,
  ...buildSingaporeMySGRoadCameras(),
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
