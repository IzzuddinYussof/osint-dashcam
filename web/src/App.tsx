import './App.css'
import { useEffect, useMemo, useState } from 'react'
import CameraTile from './components/CameraTile'
import CameraMap from './components/CameraMap'
import { getTotalCameraCount, malaysiaCamerasDataset, type CameraMetadata } from './data/camerasDataset'

const totalCameras = getTotalCameraCount()

type LayoutMode = '2x2' | '3x3' | '4x4'
type ViewMode = 'wall' | 'map'
type FeedFilter = 'all' | 'live' | 'snapshot'
type CameraTagMap = Record<string, string>
type VisibilityFilter = 'visible' | 'all' | 'hidden'
type HiddenCameraMap = Record<string, boolean>

const UNTAGGED_FILTER = '__untagged__'
const DASHBOARD_STATE_STORAGE_KEY = 'osint-dashboard-state-v1'
const DEFAULT_WALL_PAGE_SIZE = 20
const MIN_WALL_PAGE_SIZE = 4
const MAX_WALL_PAGE_SIZE = 100

interface ViewPreset {
  id: string
  name: string
  selectedCountry: string
  selectedState: string
  selectedArea: string
  selectedPurposes: string[]
  selectedFeedFilter: FeedFilter
  selectedVisibilityFilter: VisibilityFilter
  selectedSourceSite: string
  selectedSourceGroup: string
  selectedNetworkCode: string
  selectedUserTagFilter: string
  layoutMode: LayoutMode
  viewMode: ViewMode
  wallPageSize: number
}

interface CameraFilterState {
  selectedCountry: string
  selectedState: string
  selectedArea: string
  selectedPurposes: string[]
  selectedFeedFilter: FeedFilter
  selectedVisibilityFilter: VisibilityFilter
  selectedSourceSite: string
  selectedSourceGroup: string
  selectedNetworkCode: string
  selectedUserTagFilter: string
  cameraTags: CameraTagMap
  hiddenCameras: HiddenCameraMap
}

interface PersistedDashboardState {
  selectedCountry: string
  selectedState: string
  selectedArea: string
  selectedPurposes: string[]
  selectedFeedFilter: FeedFilter
  selectedVisibilityFilter: VisibilityFilter
  selectedSourceSite: string
  selectedSourceGroup: string
  selectedNetworkCode: string
  selectedUserTagFilter: string
  layoutMode: LayoutMode
  viewMode: ViewMode
  patrolIntervalSec: number
  wallPageSize: number
}

const NETWORK_LABELS: Record<string, string> = {
  AKL: 'Ampang-Kuala Lumpur Elevated Highway',
  BES: 'BESRAYA',
  CKH: 'Cheras-Kajang Highway',
  DASH: 'Damansara-Shah Alam Elevated Expressway',
  DBKL: 'DBKL / KLCCC',
  DUKE: 'DUKE',
  JB_CITY: 'Johor Bahru City',
  JSAHMS: 'Sultan Abdul Halim Muadzam Shah Bridge',
  KLP: 'MEX / Kuala Lumpur-Putrajaya Expressway',
  KSA: 'LKSA',
  KLK: 'KL-Karak Expressway',
  LDP: 'LDP',
  LKS: 'LEKAS',
  NKV: 'NKVE',
  PNB: 'Penang Bridge',
  SDE: 'Senai-Desaru Expressway',
  SKV: 'South Klang Valley Expressway',
  SPE: 'Setiawangsa-Pantai Expressway',
  SUKE: 'SUKE',
  WCE: 'West Coast Expressway',
}

const FEED_FILTER_OPTIONS: Array<{ value: FeedFilter; label: string }> = [
  { value: 'all', label: 'All Feeds' },
  { value: 'live', label: 'Live Video Only' },
  { value: 'snapshot', label: 'Snapshots Only' },
]

const VISIBILITY_FILTER_OPTIONS: Array<{ value: VisibilityFilter; label: string }> = [
  { value: 'visible', label: 'Visible Only' },
  { value: 'all', label: 'All Cameras' },
  { value: 'hidden', label: 'Hidden Only' },
]

const RECOMMENDED_CAMERA_TAGS = [
  'hide',
  'review',
  'wrong-feed',
  'broken',
  'snapshot-only',
  'favorite',
]

const clampWallPageSize = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_WALL_PAGE_SIZE
  return Math.min(MAX_WALL_PAGE_SIZE, Math.max(MIN_WALL_PAGE_SIZE, Math.round(value)))
}

const clampPatrolInterval = (value: number): number => {
  if (!Number.isFinite(value)) return 6
  return Math.min(30, Math.max(2, Math.round(value)))
}

const readPersistedDashboardState = (): PersistedDashboardState | null => {
  try {
    const raw = window.localStorage.getItem(DASHBOARD_STATE_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<PersistedDashboardState>
    if (!parsed || typeof parsed !== 'object') return null

    return {
      selectedCountry: typeof parsed.selectedCountry === 'string' ? parsed.selectedCountry : '',
      selectedState: typeof parsed.selectedState === 'string' ? parsed.selectedState : '',
      selectedArea: typeof parsed.selectedArea === 'string' ? parsed.selectedArea : '',
      selectedPurposes: Array.isArray(parsed.selectedPurposes)
        ? parsed.selectedPurposes.filter((value): value is string => typeof value === 'string')
        : [],
      selectedFeedFilter: parsed.selectedFeedFilter === 'live' || parsed.selectedFeedFilter === 'snapshot'
        ? parsed.selectedFeedFilter
        : 'all',
      selectedVisibilityFilter: parsed.selectedVisibilityFilter === 'all' || parsed.selectedVisibilityFilter === 'hidden'
        ? parsed.selectedVisibilityFilter
        : 'visible',
      selectedSourceSite: typeof parsed.selectedSourceSite === 'string' ? parsed.selectedSourceSite : '',
      selectedSourceGroup: typeof parsed.selectedSourceGroup === 'string' ? parsed.selectedSourceGroup : '',
      selectedNetworkCode: typeof parsed.selectedNetworkCode === 'string' ? parsed.selectedNetworkCode : '',
      selectedUserTagFilter: typeof parsed.selectedUserTagFilter === 'string' ? parsed.selectedUserTagFilter : '',
      layoutMode: parsed.layoutMode === '2x2' || parsed.layoutMode === '4x4' ? parsed.layoutMode : '3x3',
      viewMode: parsed.viewMode === 'map' ? 'map' : 'wall',
      patrolIntervalSec: clampPatrolInterval(Number(parsed.patrolIntervalSec)),
      wallPageSize: clampWallPageSize(Number(parsed.wallPageSize)),
    }
  } catch {
    return null
  }
}

const getCameraCountry = (country?: string): string => country ?? 'Malaysia'

const getFeedKind = (camera: CameraMetadata): 'live' | 'snapshot' | null => {
  if (camera.feed_kind) return camera.feed_kind
  if (camera.stream_type === 'snapshot') return 'snapshot'
  if (camera.stream_type === 'hls' || camera.stream_type === 'mjpeg' || camera.stream_type === 'embed') return 'live'
  return null
}

const isLiveVideoCamera = (camera: CameraMetadata): boolean => getFeedKind(camera) === 'live'

const isSnapshotCamera = (camera: CameraMetadata): boolean => getFeedKind(camera) === 'snapshot'

const matchesFeedFilter = (camera: CameraMetadata, selectedFeedFilter: FeedFilter): boolean => {
  if (selectedFeedFilter === 'live') return isLiveVideoCamera(camera)
  if (selectedFeedFilter === 'snapshot') return isSnapshotCamera(camera)
  return true
}

const collectUniqueStrings = (values: Array<string | undefined>): string[] =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b))

const getNetworkLabel = (code: string): string => NETWORK_LABELS[code] ?? code

const matchesUserTagFilter = (
  cameraId: string,
  selectedUserTagFilter: string,
  cameraTags: CameraTagMap
): boolean => {
  if (!selectedUserTagFilter) return true

  const cameraTag = cameraTags[cameraId] ?? ''

  if (selectedUserTagFilter === UNTAGGED_FILTER) {
    return cameraTag === ''
  }

  return cameraTag === selectedUserTagFilter
}

const matchesVisibilityFilter = (
  cameraId: string,
  selectedVisibilityFilter: VisibilityFilter,
  hiddenCameras: HiddenCameraMap
): boolean => {
  const isHidden = Boolean(hiddenCameras[cameraId])

  if (selectedVisibilityFilter === 'hidden') return isHidden
  if (selectedVisibilityFilter === 'visible') return !isHidden
  return true
}

const isMountFujiCamera = (camera: CameraMetadata): boolean => camera.source_group === 'Mount Fuji'

const getMapPreviewSource = (camera: CameraMetadata): string | null => {
  if (camera.stream_type !== 'snapshot' || !camera.stream_url) return null
  if (camera.stream_url.startsWith('local://') || camera.stream_url.startsWith('relay://')) return null
  return camera.stream_url
}

const filterCameras = ({
  selectedCountry,
  selectedState,
  selectedArea,
  selectedPurposes,
  selectedFeedFilter,
  selectedVisibilityFilter,
  selectedSourceSite,
  selectedSourceGroup,
  selectedNetworkCode,
  selectedUserTagFilter,
  cameraTags,
  hiddenCameras,
}: CameraFilterState): CameraMetadata[] => {
  return malaysiaCamerasDataset.filter((camera) => {
    if (selectedCountry && getCameraCountry(camera.country) !== selectedCountry) return false
    if (selectedState && camera.state !== selectedState) return false
    if (selectedArea && camera.area !== selectedArea) return false
    if (selectedPurposes.length > 0 && !selectedPurposes.includes(camera.purpose)) return false
    if (!matchesFeedFilter(camera, selectedFeedFilter)) return false
    if (!matchesVisibilityFilter(camera.id, selectedVisibilityFilter, hiddenCameras)) return false
    if (selectedSourceSite && camera.source_site !== selectedSourceSite) return false
    if (selectedSourceGroup && camera.source_group !== selectedSourceGroup) return false
    if (selectedNetworkCode && camera.network_code !== selectedNetworkCode) return false
    if (!matchesUserTagFilter(camera.id, selectedUserTagFilter, cameraTags)) return false
    return true
  })
}

const buildFilterModel = (rawFilters: CameraFilterState) => {
  let filters = { ...rawFilters }

  while (true) {
    const states = collectUniqueStrings(
      filterCameras({
        ...filters,
        selectedState: '',
        selectedArea: '',
      }).map((camera) => camera.state)
    )

    const nextSelectedState = filters.selectedState && states.includes(filters.selectedState)
      ? filters.selectedState
      : ''

    const areas = nextSelectedState
      ? collectUniqueStrings(
        filterCameras({
          ...filters,
          selectedState: nextSelectedState,
          selectedArea: '',
        }).map((camera) => camera.area)
      )
      : []

    const nextSelectedArea = filters.selectedArea && areas.includes(filters.selectedArea)
      ? filters.selectedArea
      : ''

    const sourceSites = collectUniqueStrings(
      filterCameras({
          ...filters,
          selectedState: nextSelectedState,
          selectedArea: nextSelectedArea,
          selectedSourceSite: '',
        }).map((camera) => camera.source_site)
    )

    const nextSelectedSourceSite = filters.selectedSourceSite && sourceSites.includes(filters.selectedSourceSite)
      ? filters.selectedSourceSite
      : ''

    const sourceGroups = collectUniqueStrings(
      filterCameras({
          ...filters,
          selectedState: nextSelectedState,
          selectedArea: nextSelectedArea,
          selectedSourceSite: nextSelectedSourceSite,
          selectedSourceGroup: '',
        }).map((camera) => camera.source_group)
    )

    const nextSelectedSourceGroup = filters.selectedSourceGroup && sourceGroups.includes(filters.selectedSourceGroup)
      ? filters.selectedSourceGroup
      : ''

    const networkCodes = collectUniqueStrings(
      filterCameras({
          ...filters,
          selectedState: nextSelectedState,
          selectedArea: nextSelectedArea,
          selectedSourceSite: nextSelectedSourceSite,
          selectedSourceGroup: nextSelectedSourceGroup,
          selectedNetworkCode: '',
        }).map((camera) => camera.network_code)
    ).sort((left, right) => getNetworkLabel(left).localeCompare(getNetworkLabel(right)))

    const nextSelectedNetworkCode = filters.selectedNetworkCode && networkCodes.includes(filters.selectedNetworkCode)
      ? filters.selectedNetworkCode
      : ''

    const camerasWithoutTagFilter = filterCameras({
        ...filters,
        selectedState: nextSelectedState,
        selectedArea: nextSelectedArea,
        selectedSourceSite: nextSelectedSourceSite,
        selectedSourceGroup: nextSelectedSourceGroup,
        selectedNetworkCode: nextSelectedNetworkCode,
        selectedUserTagFilter: '',
      })

    const userTagOptions = collectUniqueStrings(
      camerasWithoutTagFilter.map((camera) => filters.cameraTags[camera.id])
    )

    const hasUntaggedCameras = camerasWithoutTagFilter.some((camera) => !filters.cameraTags[camera.id])

    const nextSelectedUserTagFilter = filters.selectedUserTagFilter === UNTAGGED_FILTER
      ? (hasUntaggedCameras ? UNTAGGED_FILTER : '')
      : filters.selectedUserTagFilter && userTagOptions.includes(filters.selectedUserTagFilter)
        ? filters.selectedUserTagFilter
        : ''

    const nextFilters: CameraFilterState = {
      ...filters,
      selectedState: nextSelectedState,
      selectedArea: nextSelectedArea,
      selectedSourceSite: nextSelectedSourceSite,
      selectedSourceGroup: nextSelectedSourceGroup,
      selectedNetworkCode: nextSelectedNetworkCode,
      selectedUserTagFilter: nextSelectedUserTagFilter,
    }

    const isStable =
      nextFilters.selectedState === filters.selectedState &&
      nextFilters.selectedArea === filters.selectedArea &&
      nextFilters.selectedSourceSite === filters.selectedSourceSite &&
      nextFilters.selectedSourceGroup === filters.selectedSourceGroup &&
      nextFilters.selectedNetworkCode === filters.selectedNetworkCode &&
      nextFilters.selectedUserTagFilter === filters.selectedUserTagFilter

    if (isStable) {
      return {
        filters: nextFilters,
        states,
        areas,
        sourceSites,
        sourceGroups,
        networkCodes,
        userTagOptions,
        hasUntaggedCameras,
      }
    }

    filters = nextFilters
  }
}

function App() {
  const PRESET_STORAGE_KEY = 'osint-dashboard-view-presets-v4'
  const CAMERA_TAG_STORAGE_KEY = 'osint-dashboard-camera-tags-v1'
  const HIDDEN_CAMERA_STORAGE_KEY = 'osint-dashboard-hidden-cameras-v1'
  const [persistedDashboardState] = useState<PersistedDashboardState | null>(() => readPersistedDashboardState())
  const [selectedCountry, setSelectedCountry] = useState<string>(persistedDashboardState?.selectedCountry ?? '')
  const [selectedState, setSelectedState] = useState<string>(persistedDashboardState?.selectedState ?? '')
  const [selectedArea, setSelectedArea] = useState<string>(persistedDashboardState?.selectedArea ?? '')
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>(persistedDashboardState?.selectedPurposes ?? [])
  const [selectedFeedFilter, setSelectedFeedFilter] = useState<FeedFilter>(persistedDashboardState?.selectedFeedFilter ?? 'all')
  const [selectedVisibilityFilter, setSelectedVisibilityFilter] = useState<VisibilityFilter>(persistedDashboardState?.selectedVisibilityFilter ?? 'visible')
  const [selectedSourceSite, setSelectedSourceSite] = useState<string>(persistedDashboardState?.selectedSourceSite ?? '')
  const [selectedSourceGroup, setSelectedSourceGroup] = useState<string>(persistedDashboardState?.selectedSourceGroup ?? '')
  const [selectedNetworkCode, setSelectedNetworkCode] = useState<string>(persistedDashboardState?.selectedNetworkCode ?? '')
  const [selectedUserTagFilter, setSelectedUserTagFilter] = useState<string>(persistedDashboardState?.selectedUserTagFilter ?? '')
  const [cameraTags, setCameraTags] = useState<CameraTagMap>(() => {
    try {
      const raw = window.localStorage.getItem(CAMERA_TAG_STORAGE_KEY)
      if (!raw) return {}
      const parsed = JSON.parse(raw) as CameraTagMap
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  })
  const [hiddenCameras, setHiddenCameras] = useState<HiddenCameraMap>(() => {
    try {
      const raw = window.localStorage.getItem(HIDDEN_CAMERA_STORAGE_KEY)
      if (!raw) return {}
      const parsed = JSON.parse(raw) as HiddenCameraMap
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  })
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(persistedDashboardState?.layoutMode ?? '3x3')
  const [focusCameraId, setFocusCameraId] = useState<string | null>(null)
  const [hoveredMapCameraId, setHoveredMapCameraId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(persistedDashboardState?.viewMode ?? 'wall')
  const [wallPageSize, setWallPageSize] = useState<number>(persistedDashboardState?.wallPageSize ?? DEFAULT_WALL_PAGE_SIZE)
  const [wallPage, setWallPage] = useState(1)
  const [presetName, setPresetName] = useState('')
  const [isPatrolRunning, setIsPatrolRunning] = useState(false)
  const [patrolIntervalSec, setPatrolIntervalSec] = useState(persistedDashboardState?.patrolIntervalSec ?? 6)
  const [patrolCursor, setPatrolCursor] = useState(0)
  const [presets, setPresets] = useState<ViewPreset[]>(() => {
    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as ViewPreset[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const countries = useMemo(() => {
    return collectUniqueStrings(malaysiaCamerasDataset.map((camera) => getCameraCountry(camera.country)))
  }, [])

  const filterModel = useMemo(() => {
    return buildFilterModel({
      selectedCountry,
      selectedState,
      selectedArea,
      selectedPurposes,
      selectedFeedFilter,
      selectedVisibilityFilter,
      selectedSourceSite,
      selectedSourceGroup,
      selectedNetworkCode,
      selectedUserTagFilter,
      cameraTags,
      hiddenCameras,
    })
  }, [
    selectedCountry,
    selectedState,
    selectedArea,
    selectedPurposes,
    selectedFeedFilter,
    selectedVisibilityFilter,
    selectedSourceSite,
    selectedSourceGroup,
    selectedNetworkCode,
    selectedUserTagFilter,
    cameraTags,
    hiddenCameras,
  ])

  const {
    filters: normalizedFilters,
    states,
    areas,
    sourceSites,
    sourceGroups,
    networkCodes,
    userTagOptions,
    hasUntaggedCameras,
  } = filterModel

  const {
    selectedState: effectiveSelectedState,
    selectedArea: effectiveSelectedArea,
    selectedSourceSite: effectiveSelectedSourceSite,
    selectedSourceGroup: effectiveSelectedSourceGroup,
    selectedNetworkCode: effectiveSelectedNetworkCode,
    selectedUserTagFilter: effectiveSelectedUserTagFilter,
  } = normalizedFilters

  const purposeOptions = useMemo(() => {
    return collectUniqueStrings(malaysiaCamerasDataset.map((camera) => camera.purpose))
  }, [])

  const filteredCameras = useMemo(() => {
    return filterCameras(normalizedFilters)
  }, [normalizedFilters])

  const filteredOnlineCount = filteredCameras.filter((camera) => camera.status === 'online').length
  const filteredOfflineCount = filteredCameras.filter((camera) => camera.status === 'offline').length
  const taggedCameraCount = useMemo(
    () => Object.values(cameraTags).filter(Boolean).length,
    [cameraTags]
  )
  const hiddenCameraCount = useMemo(
    () => Object.values(hiddenCameras).filter(Boolean).length,
    [hiddenCameras]
  )
  const activeFilterCount =
    [
      selectedCountry,
      effectiveSelectedState,
      effectiveSelectedArea,
      effectiveSelectedSourceSite,
      effectiveSelectedSourceGroup,
      effectiveSelectedNetworkCode,
      effectiveSelectedUserTagFilter,
    ].filter(Boolean).length +
    selectedPurposes.length +
    (selectedFeedFilter === 'all' ? 0 : 1) +
    (selectedVisibilityFilter === 'visible' ? 0 : 1)

  const quickStats = [
    { label: 'Total Cameras', value: String(totalCameras), tone: 'neutral' },
    { label: 'Filtered', value: String(filteredCameras.length), tone: 'neutral' },
    { label: 'Tagged', value: String(taggedCameraCount), tone: 'neutral' },
    { label: 'Hidden', value: String(hiddenCameraCount), tone: 'neutral' },
    { label: 'Online', value: String(filteredOnlineCount), tone: 'ok' },
    { label: 'Offline', value: String(filteredOfflineCount), tone: 'danger' },
    { label: 'Active Filters', value: String(activeFilterCount), tone: 'neutral' },
  ]

  const isAnyFilterActive = activeFilterCount > 0

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country)
    setSelectedState('')
    setSelectedArea('')
    setWallPage(1)
  }

  const handleStateChange = (state: string) => {
    setSelectedState(state)
    setSelectedArea('')
    setWallPage(1)
  }

  const handleAreaChange = (area: string) => {
    setSelectedArea(area)
    setWallPage(1)
  }

  const handleClearFilters = () => {
    setSelectedCountry('')
    setSelectedState('')
    setSelectedArea('')
    setSelectedPurposes([])
    setSelectedFeedFilter('all')
    setSelectedVisibilityFilter('visible')
    setSelectedSourceSite('')
    setSelectedSourceGroup('')
    setSelectedNetworkCode('')
    setSelectedUserTagFilter('')
    setWallPage(1)
  }

  const handlePurposeToggle = (purpose: string) => {
    setSelectedPurposes((prev) =>
      prev.includes(purpose)
        ? prev.filter((value) => value !== purpose)
        : [...prev, purpose]
    )
    setWallPage(1)
  }

  const handleFeedFilterChange = (value: FeedFilter) => {
    setSelectedFeedFilter(value)
    setWallPage(1)
  }

  const handleVisibilityFilterChange = (value: VisibilityFilter) => {
    setSelectedVisibilityFilter(value)
    setWallPage(1)
  }

  const handleSourceSiteChange = (value: string) => {
    setSelectedSourceSite(value)
    setWallPage(1)
  }

  const handleSourceGroupChange = (value: string) => {
    setSelectedSourceGroup(value)
    setWallPage(1)
  }

  const handleNetworkCodeChange = (value: string) => {
    setSelectedNetworkCode(value)
    setWallPage(1)
  }

  const handleUserTagFilterChange = (value: string) => {
    setSelectedUserTagFilter(value)
    setWallPage(1)
  }

  const handleEditCameraTag = (cameraId: string) => {
    const currentTag = cameraTags[cameraId] ?? ''
    const nextTagInput = window.prompt(
      'Set a custom tag for this camera. Leave it blank to clear the tag.',
      currentTag
    )

    if (nextTagInput === null) return

    const nextTag = nextTagInput.trim()

    setCameraTags((prev) => {
      const nextTags = { ...prev }

      if (nextTag) {
        nextTags[cameraId] = nextTag
      } else {
        delete nextTags[cameraId]
      }

      return nextTags
    })
  }

  const handleSetCameraTag = (cameraId: string, tag: string) => {
    const nextTag = tag.trim()

    setCameraTags((prev) => {
      if (!nextTag) return prev
      return {
        ...prev,
        [cameraId]: nextTag,
      }
    })
  }

  const handleClearCameraTag = (cameraId: string) => {
    setCameraTags((prev) => {
      if (!(cameraId in prev)) return prev
      const nextTags = { ...prev }
      delete nextTags[cameraId]
      return nextTags
    })
  }

  const handleToggleCameraHidden = (cameraId: string) => {
    setHiddenCameras((prev) => {
      const nextHidden = { ...prev }

      if (nextHidden[cameraId]) {
        delete nextHidden[cameraId]
      } else {
        nextHidden[cameraId] = true
      }

      return nextHidden
    })
  }

  const handleWallPageSizeChange = (value: string) => {
    const nextPageSize = clampWallPageSize(Number(value))
    setWallPageSize(nextPageSize)
    setWallPage(1)
  }

  useEffect(() => {
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets))
  }, [PRESET_STORAGE_KEY, presets])

  useEffect(() => {
    window.localStorage.setItem(CAMERA_TAG_STORAGE_KEY, JSON.stringify(cameraTags))
  }, [CAMERA_TAG_STORAGE_KEY, cameraTags])

  useEffect(() => {
    window.localStorage.setItem(HIDDEN_CAMERA_STORAGE_KEY, JSON.stringify(hiddenCameras))
  }, [HIDDEN_CAMERA_STORAGE_KEY, hiddenCameras])

  useEffect(() => {
    const nextState: PersistedDashboardState = {
      selectedCountry,
      selectedState: effectiveSelectedState,
      selectedArea: effectiveSelectedArea,
      selectedPurposes,
      selectedFeedFilter,
      selectedVisibilityFilter,
      selectedSourceSite: effectiveSelectedSourceSite,
      selectedSourceGroup: effectiveSelectedSourceGroup,
      selectedNetworkCode: effectiveSelectedNetworkCode,
      selectedUserTagFilter: effectiveSelectedUserTagFilter,
      layoutMode,
      viewMode,
      patrolIntervalSec: clampPatrolInterval(patrolIntervalSec),
      wallPageSize,
    }

    window.localStorage.setItem(DASHBOARD_STATE_STORAGE_KEY, JSON.stringify(nextState))
  }, [
    effectiveSelectedArea,
    effectiveSelectedNetworkCode,
    effectiveSelectedSourceGroup,
    effectiveSelectedSourceSite,
    effectiveSelectedState,
    effectiveSelectedUserTagFilter,
    layoutMode,
    patrolIntervalSec,
    selectedCountry,
    selectedFeedFilter,
    selectedPurposes,
    selectedVisibilityFilter,
    viewMode,
    wallPageSize,
  ])

  const handleSavePreset = () => {
    const name = presetName.trim()
    if (!name) return

    const nextPreset: ViewPreset = {
      id: `${Date.now()}`,
      name,
      selectedCountry,
      selectedState: effectiveSelectedState,
      selectedArea: effectiveSelectedArea,
      selectedPurposes,
      selectedFeedFilter,
      selectedVisibilityFilter,
      selectedSourceSite: effectiveSelectedSourceSite,
      selectedSourceGroup: effectiveSelectedSourceGroup,
      selectedNetworkCode: effectiveSelectedNetworkCode,
      selectedUserTagFilter: effectiveSelectedUserTagFilter,
      layoutMode,
      viewMode,
      wallPageSize,
    }

    setPresets((prev) => [nextPreset, ...prev].slice(0, 12))
    setPresetName('')
  }

  const handleApplyPreset = (preset: ViewPreset) => {
    setSelectedCountry(preset.selectedCountry ?? '')
    setSelectedState(preset.selectedState ?? '')
    setSelectedArea(preset.selectedArea ?? '')
    setSelectedPurposes(preset.selectedPurposes ?? [])
    setSelectedFeedFilter(preset.selectedFeedFilter ?? 'all')
    setSelectedVisibilityFilter(preset.selectedVisibilityFilter ?? 'visible')
    setSelectedSourceSite(preset.selectedSourceSite ?? '')
    setSelectedSourceGroup(preset.selectedSourceGroup ?? '')
    setSelectedNetworkCode(preset.selectedNetworkCode ?? '')
    setSelectedUserTagFilter(preset.selectedUserTagFilter ?? '')
    setLayoutMode(preset.layoutMode)
    setViewMode(preset.viewMode)
    setWallPageSize(clampWallPageSize(preset.wallPageSize ?? DEFAULT_WALL_PAGE_SIZE))
    setWallPage(1)
    setFocusCameraId(null)
  }

  const handleDeletePreset = (id: string) => {
    setPresets((prev) => prev.filter((preset) => preset.id !== id))
  }

  const totalWallPages = Math.max(1, Math.ceil(filteredCameras.length / wallPageSize))
  const effectiveWallPage = Math.min(wallPage, totalWallPages)
  const wallPageStart = (effectiveWallPage - 1) * wallPageSize
  const wallPageEnd = wallPageStart + wallPageSize
  const wallCameras = filteredCameras.slice(wallPageStart, wallPageEnd)
  const wallRangeStart = filteredCameras.length === 0 ? 0 : wallPageStart + 1
  const wallRangeEnd = filteredCameras.length === 0 ? 0 : Math.min(wallPageEnd, filteredCameras.length)
  const mapCameras = filteredCameras.filter((camera) => typeof camera.lat === 'number' && typeof camera.lon === 'number')
  const isMountFujiMap = filteredCameras.length > 0 && filteredCameras.every(isMountFujiCamera)

  const handleSelectCamera = (cameraId: string) => {
    const cameraIndex = filteredCameras.findIndex((camera) => camera.id === cameraId)
    if (cameraIndex >= 0) {
      setWallPage(Math.floor(cameraIndex / wallPageSize) + 1)
    }

    setFocusCameraId(cameraId)
  }

  const patrolPool = useMemo(() => {
    if (viewMode === 'map') return mapCameras
    return wallCameras
  }, [viewMode, mapCameras, wallCameras])

  const patrolTargetId = isPatrolRunning && patrolPool.length > 0
    ? patrolPool[patrolCursor % patrolPool.length]?.id
    : null

  const normalizedFocusCameraId = focusCameraId && filteredCameras.some((camera) => camera.id === focusCameraId)
    ? focusCameraId
    : null
  const scopedFocusCameraId = viewMode === 'wall' && normalizedFocusCameraId && !wallCameras.some((camera) => camera.id === normalizedFocusCameraId)
    ? (wallCameras[0]?.id ?? null)
    : normalizedFocusCameraId
  const effectiveFocusId = patrolTargetId ?? scopedFocusCameraId
  const focusedCamera = effectiveFocusId
    ? filteredCameras.find((camera) => camera.id === effectiveFocusId) || wallCameras[0] || filteredCameras[0]
    : null
  const hoveredMapCamera = viewMode === 'map' && hoveredMapCameraId
    ? mapCameras.find((camera) => camera.id === hoveredMapCameraId) ?? null
    : null

  useEffect(() => {
    if (!isPatrolRunning || patrolPool.length <= 1) return

    const timer = window.setInterval(() => {
      setPatrolCursor((prev) => (prev + 1) % patrolPool.length)
    }, Math.max(2, patrolIntervalSec) * 1000)

    return () => window.clearInterval(timer)
  }, [isPatrolRunning, patrolIntervalSec, patrolPool.length])

  const handleTogglePatrol = () => {
    if (isPatrolRunning) {
      setIsPatrolRunning(false)
      return
    }

    setPatrolCursor(0)
    setIsPatrolRunning(true)
  }

  const mapTitle = isMountFujiMap
    ? 'Mount Fuji View Map'
    : selectedCountry
      ? `${selectedCountry} Map Mode`
      : 'Camera Map Mode'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">OSINT COMMAND CENTER</p>
          <h1>World Camera Dashboard</h1>
        </div>

        <div className="topbar-right">
          {quickStats.map((item) => (
            <div key={item.label} className={`stat-card ${item.tone}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar" aria-label="Filter panel">
          <div className="panel-title-wrap">
            <h2>Filters</h2>
            <span className="chip">T15</span>
          </div>

          <div className="filter-block">
            <label>Feed Type</label>
            <div className="filter-dropdown">
              <select
                className="filter-select"
                value={selectedFeedFilter}
                onChange={(event) => handleFeedFilterChange(event.target.value as FeedFilter)}
              >
                {FEED_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-block">
            <label>Visibility</label>
            <div className="filter-dropdown">
              <select
                className="filter-select"
                value={selectedVisibilityFilter}
                onChange={(event) => handleVisibilityFilterChange(event.target.value as VisibilityFilter)}
              >
                {VISIBILITY_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-block">
            <label htmlFor="wall-page-size">Load Per Page</label>
            <input
              id="wall-page-size"
              type="number"
              min={MIN_WALL_PAGE_SIZE}
              max={MAX_WALL_PAGE_SIZE}
              value={wallPageSize}
              onChange={(event) => handleWallPageSizeChange(event.target.value)}
              className="settings-input"
            />
          </div>

          <div className="filter-block">
            <label>Country</label>
            <div className="filter-dropdown">
              <select
                className="filter-select"
                value={selectedCountry}
                onChange={(event) => handleCountryChange(event.target.value)}
              >
                <option value="">All Countries</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-block">
            <label>State</label>
            <div className="filter-dropdown">
              <select
                className="filter-select"
                value={effectiveSelectedState}
                onChange={(event) => handleStateChange(event.target.value)}
              >
                <option value="">All States</option>
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-block">
            <label>Area</label>
            <div className="filter-dropdown">
              <select
                className="filter-select"
                value={effectiveSelectedArea}
                onChange={(event) => handleAreaChange(event.target.value)}
                disabled={!effectiveSelectedState}
              >
                <option value="">All Areas</option>
                {areas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-block">
            <label>Source</label>
            <div className="filter-dropdown">
              <select
                className="filter-select"
                value={effectiveSelectedSourceSite}
                onChange={(event) => handleSourceSiteChange(event.target.value)}
              >
                <option value="">All Sources</option>
                {sourceSites.map((sourceSite) => (
                  <option key={sourceSite} value={sourceSite}>
                    {sourceSite}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-block">
            <label>Source Group</label>
            <div className="filter-dropdown">
              <select
                className="filter-select"
                value={effectiveSelectedSourceGroup}
                onChange={(event) => handleSourceGroupChange(event.target.value)}
              >
                <option value="">All Source Groups</option>
                {sourceGroups.map((sourceGroup) => (
                  <option key={sourceGroup} value={sourceGroup}>
                    {sourceGroup}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-block">
            <label>Network</label>
            <div className="filter-dropdown">
              <select
                className="filter-select"
                value={effectiveSelectedNetworkCode}
                onChange={(event) => handleNetworkCodeChange(event.target.value)}
              >
                <option value="">All Networks</option>
                {networkCodes.map((networkCode) => (
                  <option key={networkCode} value={networkCode}>
                    {getNetworkLabel(networkCode)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-block">
            <label>My Tag</label>
            <div className="filter-dropdown">
              <select
                className="filter-select"
                value={effectiveSelectedUserTagFilter}
                onChange={(event) => handleUserTagFilterChange(event.target.value)}
              >
                <option value="">All Cameras</option>
                {hasUntaggedCameras && <option value={UNTAGGED_FILTER}>Untagged Only</option>}
                {userTagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-block">
            <label>Recommended Tags</label>
            <div className="chip-row">
              {RECOMMENDED_CAMERA_TAGS.map((tag) => (
                <span key={tag} className="chip ghost static-chip">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {isAnyFilterActive && (
            <button
              type="button"
              className="clear-filters-btn"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}

          <div className="filter-block">
            <label>Purpose</label>
            <div className="chip-row">
              {purposeOptions.map((purpose) => (
                <button
                  key={purpose}
                  type="button"
                  className={`chip ${selectedPurposes.includes(purpose) ? '' : 'ghost'}`}
                  onClick={() => handlePurposeToggle(purpose)}
                >
                  {purpose}
                </button>
              ))}
            </div>
          </div>

          <div className="preset-block">
            <label>Saved Views</label>
            <div className="preset-create-row">
              <input
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                className="preset-input"
                placeholder="Preset name"
              />
              <button type="button" className="preset-save-btn" onClick={handleSavePreset}>
                Save
              </button>
            </div>
            <div className="preset-list">
              {presets.length === 0 ? (
                <p className="preset-empty">No presets yet</p>
              ) : presets.map((preset) => (
                <div key={preset.id} className="preset-item">
                  <button
                    type="button"
                    className="preset-apply-btn"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    {preset.name}
                  </button>
                  <button
                    type="button"
                    className="preset-delete-btn"
                    onClick={() => handleDeletePreset(preset.id)}
                    aria-label={`Delete preset ${preset.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="wall" aria-label="Main wall panel">
          <div className="wall-header">
            <h2>
              {viewMode === 'map' ? mapTitle : focusCameraId ? 'Focus Mode' : 'Camera Wall'}
            </h2>
            <div className="layout-switch">
              <div className="patrol-controls">
                <label htmlFor="patrol-interval" className="patrol-label">Patrol</label>
                <input
                  id="patrol-interval"
                  type="number"
                  min={2}
                  max={30}
                  value={patrolIntervalSec}
                  onChange={(event) => setPatrolIntervalSec(clampPatrolInterval(Number(event.target.value)))}
                  className="patrol-input"
                />
                <button
                  type="button"
                  className={`layout-btn ${isPatrolRunning ? 'active' : ''}`}
                  onClick={handleTogglePatrol}
                  disabled={patrolPool.length === 0}
                >
                  {isPatrolRunning ? 'Stop Patrol' : 'Start Patrol'}
                </button>
              </div>
              <button
                type="button"
                className={`layout-btn ${viewMode === 'wall' ? 'active' : ''}`}
                onClick={() => {
                  setViewMode('wall')
                  setFocusCameraId(null)
                }}
              >
                Wall
              </button>
              <button
                type="button"
                className={`layout-btn ${viewMode === 'map' ? 'active' : ''}`}
                onClick={() => setViewMode('map')}
              >
                Map
              </button>

              {viewMode === 'wall' && (focusCameraId ? (
                <button
                  type="button"
                  className="layout-btn active"
                  onClick={() => setFocusCameraId(null)}
                >
                  Exit Focus
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`layout-btn ${layoutMode === '2x2' ? 'active' : ''}`}
                    onClick={() => setLayoutMode('2x2')}
                  >
                    2x2
                  </button>
                  <button
                    type="button"
                    className={`layout-btn ${layoutMode === '3x3' ? 'active' : ''}`}
                    onClick={() => setLayoutMode('3x3')}
                  >
                    3x3
                  </button>
                  <button
                    type="button"
                    className={`layout-btn ${layoutMode === '4x4' ? 'active' : ''}`}
                    onClick={() => setLayoutMode('4x4')}
                  >
                    4x4
                  </button>
                </>
              ))}
            </div>
          </div>

          {viewMode === 'wall' && filteredCameras.length > 0 && (
            <div className="page-toolbar">
              <div className="page-toolbar-meta">
                <strong>{wallRangeStart}-{wallRangeEnd}</strong>
                <span>of {filteredCameras.length} filtered cameras</span>
              </div>
              <div className="page-toolbar-controls">
                <button
                  type="button"
                  className="layout-btn"
                  onClick={() => setWallPage(Math.max(1, effectiveWallPage - 1))}
                  disabled={effectiveWallPage <= 1}
                >
                  Prev
                </button>
                <span className="page-counter">Page {effectiveWallPage} / {totalWallPages}</span>
                <button
                  type="button"
                  className="layout-btn"
                  onClick={() => setWallPage(Math.min(totalWallPages, effectiveWallPage + 1))}
                  disabled={effectiveWallPage >= totalWallPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {viewMode === 'map' ? (
            <div className="map-mode-wrap">
              <div className="malaysia-map">
                <CameraMap
                  cameras={mapCameras}
                  activeCameraId={effectiveFocusId}
                  hoveredCameraId={hoveredMapCameraId}
                  isMountFujiMap={isMountFujiMap}
                  onSelectCamera={handleSelectCamera}
                  onHoverCamera={setHoveredMapCameraId}
                />
                {isMountFujiMap && (
                  <div className="map-context-banner">
                    Hover markers to compare current Mount Fuji viewpoints by side and angle.
                  </div>
                )}
                {hoveredMapCamera && (
                  <div className={`map-hover-preview ${isMountFujiMap ? 'mount-fuji' : ''}`}>
                    <div className="map-preview-head">
                      <span className="map-preview-eyebrow">{hoveredMapCamera.source_group ?? 'Camera Preview'}</span>
                      {hoveredMapCamera.view_hint && (
                        <span className="map-view-hint">{hoveredMapCamera.view_hint}</span>
                      )}
                    </div>
                    <strong className="map-preview-title">{hoveredMapCamera.name}</strong>
                    <span className="map-preview-meta">
                      {hoveredMapCamera.area}, {hoveredMapCamera.state}, {getCameraCountry(hoveredMapCamera.country)}
                    </span>
                    {getMapPreviewSource(hoveredMapCamera) ? (
                      <img
                        src={getMapPreviewSource(hoveredMapCamera) ?? ''}
                        alt={`Preview of ${hoveredMapCamera.name}`}
                        className="map-preview-image"
                      />
                    ) : (
                      <div className="map-preview-placeholder">
                        Preview available after opening the camera panel.
                      </div>
                    )}
                    <span className="map-preview-meta">
                      Click marker to pin this camera in the side panel.
                    </span>
                  </div>
                )}
              </div>

              <aside className="map-focus-panel">
                {focusedCamera ? (
                  <>
                    <p className="map-focus-note">
                      {isMountFujiMap
                        ? 'Hover markers for quick angle comparison, then click to pin the best viewpoint.'
                        : 'Marker linked camera:'}
                    </p>
                    <CameraTile
                      key={`map-focus-${focusedCamera.id}`}
                      id={focusedCamera.id}
                      name={focusedCamera.name}
                      location={`${focusedCamera.area}, ${focusedCamera.state}, ${getCameraCountry(focusedCamera.country)}`}
                      status={focusedCamera.status || 'loading'}
                      streamType={focusedCamera.stream_type}
                      feedKind={focusedCamera.feed_kind}
                      streamUrl={focusedCamera.stream_url}
                      relayUrl={focusedCamera.stream_relay_url}
                      refreshIntervalMs={focusedCamera.update_rate_ms}
                      source={focusedCamera.source}
                      sourceUrl={focusedCamera.source_url}
                      isHidden={Boolean(hiddenCameras[focusedCamera.id])}
                      onToggleHidden={() => handleToggleCameraHidden(focusedCamera.id)}
                      userTag={cameraTags[focusedCamera.id]}
                      recommendedTags={RECOMMENDED_CAMERA_TAGS}
                      onSetTag={(tag) => handleSetCameraTag(focusedCamera.id, tag)}
                      onAddCustomTag={() => handleEditCameraTag(focusedCamera.id)}
                      onClearTag={() => handleClearCameraTag(focusedCamera.id)}
                      onEditTag={() => handleEditCameraTag(focusedCamera.id)}
                      isActive
                    />
                  </>
                ) : (
                  <div className="no-results">
                    <p>Click any marker to open the linked camera panel.</p>
                  </div>
                )}
              </aside>
            </div>
          ) : focusCameraId && focusedCamera ? (
            <div className="focus-mode-wrap">
              <div className="focus-main">
                <CameraTile
                  key={`focus-${focusedCamera.id}`}
                  id={focusedCamera.id}
                  name={focusedCamera.name}
                  location={`${focusedCamera.area}, ${focusedCamera.state}, ${getCameraCountry(focusedCamera.country)}`}
                  status={focusedCamera.status || 'loading'}
                  streamType={focusedCamera.stream_type}
                  feedKind={focusedCamera.feed_kind}
                  streamUrl={focusedCamera.stream_url}
                  relayUrl={focusedCamera.stream_relay_url}
                  refreshIntervalMs={focusedCamera.update_rate_ms}
                  source={focusedCamera.source}
                  sourceUrl={focusedCamera.source_url}
                  isHidden={Boolean(hiddenCameras[focusedCamera.id])}
                  onToggleHidden={() => handleToggleCameraHidden(focusedCamera.id)}
                  userTag={cameraTags[focusedCamera.id]}
                  recommendedTags={RECOMMENDED_CAMERA_TAGS}
                  onSetTag={(tag) => handleSetCameraTag(focusedCamera.id, tag)}
                  onAddCustomTag={() => handleEditCameraTag(focusedCamera.id)}
                  onClearTag={() => handleClearCameraTag(focusedCamera.id)}
                  onEditTag={() => handleEditCameraTag(focusedCamera.id)}
                  isActive
                />
              </div>
              <aside className="focus-list" aria-label="Focus camera list">
                {wallCameras.map((camera) => (
                  <button
                    key={`focus-list-${camera.id}`}
                    type="button"
                    className={`focus-list-item ${camera.id === (focusedCamera?.id ?? '') ? 'active' : ''}`}
                    onClick={() => handleSelectCamera(camera.id)}
                  >
                    <span>{camera.id}</span>
                    <strong>{camera.name}</strong>
                    <small>{camera.area}, {camera.state}, {getCameraCountry(camera.country)}</small>
                    {cameraTags[camera.id] && <small>Tag: {cameraTags[camera.id]}</small>}
                  </button>
                ))}
              </aside>
            </div>
          ) : (
            <div className={`camera-grid grid-${layoutMode}`}>
              {wallCameras.map((camera) => (
                <CameraTile
                  key={camera.id}
                  id={camera.id}
                  name={camera.name}
                  location={`${camera.area}, ${camera.state}, ${getCameraCountry(camera.country)}`}
                  status={camera.status || 'loading'}
                  streamType={camera.stream_type}
                  feedKind={camera.feed_kind}
                  streamUrl={camera.stream_url}
                  relayUrl={camera.stream_relay_url}
                  refreshIntervalMs={camera.update_rate_ms}
                  source={camera.source}
                  sourceUrl={camera.source_url}
                  isHidden={Boolean(hiddenCameras[camera.id])}
                  onToggleHidden={() => handleToggleCameraHidden(camera.id)}
                  userTag={cameraTags[camera.id]}
                  recommendedTags={RECOMMENDED_CAMERA_TAGS}
                  onSetTag={(tag) => handleSetCameraTag(camera.id, tag)}
                  onAddCustomTag={() => handleEditCameraTag(camera.id)}
                  onClearTag={() => handleClearCameraTag(camera.id)}
                  onEditTag={() => handleEditCameraTag(camera.id)}
                  onClick={() => handleSelectCamera(camera.id)}
                  isActive={isPatrolRunning && !focusCameraId && patrolTargetId === camera.id}
                />
              ))}
            </div>
          )}

          {filteredCameras.length === 0 && (
            <div className="no-results">
              <p>No cameras found matching the selected filters.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
