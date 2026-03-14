// Malaysia Camera Metadata Dataset
// Task T3 - Structured camera records with complete metadata
// Task T6 - Added stream_type, stream_url, and source fields for live feeds

export interface CameraMetadata {
  id: string
  name: string
  state: string
  area: string
  category: string
  purpose: string
  lat?: number
  lon?: number
  status?: 'online' | 'offline' | 'loading'
  stream_type?: 'snapshot' | 'hls' | 'mjpeg' | 'none'
  stream_url?: string
  stream_relay_url?: string
  source?: string
}

export const malaysiaCamerasDataset: CameraMetadata[] = [
  // Kuala Lumpur
  // T6: First live camera with snapshot-refresh feed
  {
    id: 'CAM001',
    name: 'KLCC Tower View - Live',
    state: 'Kuala Lumpur',
    area: 'KLCC',
    category: 'city',
    purpose: 'landmark',
    lat: 3.1578,
    lon: 101.7118,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://qa-probe.invalid/cam001.jpg',
    stream_relay_url: 'relay://my-relay/cam001',
    source: 'MY Edge Stream via Relay Bridge'
  },
  {
    id: 'CAM002',
    name: 'Bukit Bintang Junction - Live',
    state: 'Kuala Lumpur',
    area: 'Bukit Bintang',
    category: 'city',
    purpose: 'street',
    lat: 3.1478,
    lon: 101.7108,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'local://stable/cam002',
    source: 'MY Local Snapshot Proxy (stable)'
  },
  {
    id: 'CAM003',
    name: 'Petronas Twin Towers - Live',
    state: 'Kuala Lumpur',
    area: 'KLCC',
    category: 'city',
    purpose: 'landmark',
    lat: 3.1580,
    lon: 101.7120,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'local://stable/cam003',
    source: 'MY Local Snapshot Proxy (stable)'
  },
  {
    id: 'CAM004',
    name: 'Jalan Tun Razak - Live',
    state: 'Kuala Lumpur',
    area: 'Wangsa Maju',
    category: 'city',
    purpose: 'highway',
    lat: 3.1710,
    lon: 101.7240,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'local://stable/cam004',
    source: 'MY Local Snapshot Proxy (stable)'
  },
  {
    id: 'CAM005',
    name: 'Mid Valley Megamall',
    state: 'Kuala Lumpur',
    area: 'Mid Valley',
    category: 'retail',
    purpose: 'mall',
    lat: 3.1179,
    lon: 101.6770,
    status: 'loading'
  },

  // Selangor
  {
    id: 'CAM006',
    name: 'Shah Alam Highway - Live',
    state: 'Selangor',
    area: 'Shah Alam',
    category: 'highway',
    purpose: 'highway',
    lat: 3.0733,
    lon: 101.5185,
    status: 'online',
    stream_type: 'snapshot',
    stream_url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&auto=format&fit=crop',
    source: 'PLUS Malaysia Highway'
  },
  {
    id: 'CAM007',
    name: 'KLIA Terminal 1',
    state: 'Selangor',
    area: 'Sepang',
    category: 'transport',
    purpose: 'landmark',
    lat: 2.7456,
    lon: 101.7099,
    status: 'loading'
  },
  {
    id: 'CAM008',
    name: 'Sunway Pyramid Mall',
    state: 'Selangor',
    area: 'Bandar Sunway',
    category: 'retail',
    purpose: 'mall',
    lat: 3.0733,
    lon: 101.6069,
    status: 'loading'
  },
  {
    id: 'CAM009',
    name: 'Petaling Jaya Street',
    state: 'Selangor',
    area: 'Petaling Jaya',
    category: 'city',
    purpose: 'street',
    lat: 3.1073,
    lon: 101.6067,
    status: 'loading'
  },
  {
    id: 'CAM010',
    name: 'Cyberjaya Tech Hub',
    state: 'Selangor',
    area: 'Cyberjaya',
    category: 'city',
    purpose: 'landmark',
    lat: 2.9213,
    lon: 101.6559,
    status: 'loading'
  },

  // Putrajaya
  {
    id: 'CAM011',
    name: 'Putrajaya Sentral',
    state: 'Putrajaya',
    area: 'Precinct 7',
    category: 'transport',
    purpose: 'landmark',
    lat: 2.9264,
    lon: 101.6964,
    status: 'loading'
  },
  {
    id: 'CAM012',
    name: 'Putrajaya Lake View',
    state: 'Putrajaya',
    area: 'Precinct 4',
    category: 'city',
    purpose: 'landmark',
    lat: 2.9264,
    lon: 101.6964,
    status: 'loading'
  },

  // Johor
  {
    id: 'CAM013',
    name: 'Johor Premium Outlet',
    state: 'Johor',
    area: 'Kulai',
    category: 'retail',
    purpose: 'mall',
    lat: 1.6527,
    lon: 103.6402,
    status: 'loading'
  },
  {
    id: 'CAM014',
    name: 'JB City Square',
    state: 'Johor',
    area: 'Johor Bahru',
    category: 'city',
    purpose: 'street',
    lat: 1.4655,
    lon: 103.7578,
    status: 'loading'
  },
  {
    id: 'CAM015',
    name: 'Senai Airport',
    state: 'Johor',
    area: 'Senai',
    category: 'transport',
    purpose: 'landmark',
    lat: 1.6411,
    lon: 103.6697,
    status: 'loading'
  },

  // Pulau Pinang
  {
    id: 'CAM016',
    name: 'Penang Bridge',
    state: 'Pulau Pinang',
    area: 'Gelugor',
    category: 'highway',
    purpose: 'landmark',
    lat: 5.3515,
    lon: 100.3990,
    status: 'loading'
  },
  {
    id: 'CAM017',
    name: 'Georgetown Heritage',
    state: 'Pulau Pinang',
    area: 'Georgetown',
    category: 'city',
    purpose: 'landmark',
    lat: 5.4141,
    lon: 100.3288,
    status: 'loading'
  },
  {
    id: 'CAM018',
    name: 'Gurney Drive',
    state: 'Pulau Pinang',
    area: 'Georgetown',
    category: 'city',
    purpose: 'street',
    lat: 5.4378,
    lon: 100.3102,
    status: 'loading'
  },

  // Pahang
  {
    id: 'CAM019',
    name: 'Genting Highlands',
    state: 'Pahang',
    area: 'Bentong',
    category: 'city',
    purpose: 'landmark',
    lat: 3.4233,
    lon: 101.7933,
    status: 'loading'
  },
  {
    id: 'CAM020',
    name: 'Kuantan Waterfront',
    state: 'Pahang',
    area: 'Kuantan',
    category: 'city',
    purpose: 'street',
    lat: 3.8077,
    lon: 103.3260,
    status: 'loading'
  },

  // Melaka
  {
    id: 'CAM021',
    name: 'Melaka River View',
    state: 'Melaka',
    area: 'Bandar Melaka',
    category: 'city',
    purpose: 'landmark',
    lat: 2.1896,
    lon: 102.2501,
    status: 'loading'
  },
  {
    id: 'CAM022',
    name: 'A Famosa Highway',
    state: 'Melaka',
    area: 'Alor Gajah',
    category: 'highway',
    purpose: 'highway',
    lat: 2.3789,
    lon: 102.2092,
    status: 'loading'
  }
]

export const getTotalCameraCount = (): number => {
  return malaysiaCamerasDataset.length
}

export const getCamerasByState = (state: string): CameraMetadata[] => {
  return malaysiaCamerasDataset.filter(cam => cam.state === state)
}

export const getCamerasByPurpose = (purpose: string): CameraMetadata[] => {
  return malaysiaCamerasDataset.filter(cam => cam.purpose === purpose)
}
