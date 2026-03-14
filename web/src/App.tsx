import './App.css'
import CameraTile from './components/CameraTile'
import { malaysiaCamerasDataset, getTotalCameraCount } from './data/camerasDataset'
import { useState, useMemo, useEffect } from 'react'

const totalCameras = getTotalCameraCount()

type LayoutMode = '2x2' | '3x3' | '4x4'
type ViewMode = 'wall' | 'map'

interface ViewPreset {
  id: string
  name: string
  selectedState: string
  selectedArea: string
  selectedPurposes: string[]
  layoutMode: LayoutMode
  viewMode: ViewMode
}

const MALAYSIA_MAP_BOUNDS = {
  minLat: 0.8,
  maxLat: 7.4,
  minLon: 99.6,
  maxLon: 119.4,
}

function App() {
  const PRESET_STORAGE_KEY = 'osint-dashboard-view-presets-v1'

  const [selectedState, setSelectedState] = useState<string>('')
  const [selectedArea, setSelectedArea] = useState<string>('')
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([])
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('3x3')
  const [focusCameraId, setFocusCameraId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('wall')
  const [presetName, setPresetName] = useState('')
  const [isPatrolRunning, setIsPatrolRunning] = useState(false)
  const [patrolIntervalSec, setPatrolIntervalSec] = useState(6)
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

  const states = useMemo(() => {
    const uniqueStates = Array.from(new Set(malaysiaCamerasDataset.map(cam => cam.state)))
    return uniqueStates.sort()
  }, [])

  const areas = useMemo(() => {
    if (!selectedState) return []
    const uniqueAreas = Array.from(
      new Set(
        malaysiaCamerasDataset
          .filter(cam => cam.state === selectedState)
          .map(cam => cam.area)
      )
    )
    return uniqueAreas.sort()
  }, [selectedState])

  const filteredCameras = useMemo(() => {
    let filtered = malaysiaCamerasDataset

    if (selectedState) {
      filtered = filtered.filter(cam => cam.state === selectedState)
    }

    if (selectedArea) {
      filtered = filtered.filter(cam => cam.area === selectedArea)
    }

    if (selectedPurposes.length > 0) {
      filtered = filtered.filter(cam => selectedPurposes.includes(cam.purpose))
    }

    return filtered
  }, [selectedState, selectedArea, selectedPurposes])

  const filteredOnlineCount = filteredCameras.filter((camera) => camera.status === 'online').length
  const filteredOfflineCount = filteredCameras.filter((camera) => camera.status === 'offline').length
  const activeFilterCount = [selectedState, selectedArea].filter(Boolean).length + selectedPurposes.length

  const quickStats = [
    { label: 'Total Cameras', value: String(totalCameras), tone: 'neutral' },
    { label: 'Filtered', value: String(filteredCameras.length), tone: 'neutral' },
    { label: 'Online', value: String(filteredOnlineCount), tone: 'ok' },
    { label: 'Offline', value: String(filteredOfflineCount), tone: 'danger' },
    { label: 'Active Filters', value: String(activeFilterCount), tone: 'neutral' },
  ]

  const handleStateChange = (state: string) => {
    setSelectedState(state)
    setSelectedArea('')
  }

  const handleAreaChange = (area: string) => {
    setSelectedArea(area)
  }

  const handleClearFilters = () => {
    setSelectedState('')
    setSelectedArea('')
    setSelectedPurposes([])
  }

  const handlePurposeToggle = (purpose: string) => {
    setSelectedPurposes(prev =>
      prev.includes(purpose)
        ? prev.filter(p => p !== purpose)
        : [...prev, purpose]
    )
  }

  useEffect(() => {
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets))
  }, [PRESET_STORAGE_KEY, presets])

  const handleSavePreset = () => {
    const name = presetName.trim()
    if (!name) return

    const nextPreset: ViewPreset = {
      id: `${Date.now()}`,
      name,
      selectedState,
      selectedArea,
      selectedPurposes,
      layoutMode,
      viewMode,
    }

    setPresets(prev => [nextPreset, ...prev].slice(0, 12))
    setPresetName('')
  }

  const handleApplyPreset = (preset: ViewPreset) => {
    setSelectedState(preset.selectedState)
    setSelectedArea(preset.selectedArea)
    setSelectedPurposes(preset.selectedPurposes)
    setLayoutMode(preset.layoutMode)
    setViewMode(preset.viewMode)
    setFocusCameraId(null)
  }

  const handleDeletePreset = (id: string) => {
    setPresets(prev => prev.filter(preset => preset.id !== id))
  }

  const purposeOptions = ['street', 'mall', 'highway', 'city', 'landmark']

  const getMaxTiles = (mode: LayoutMode): number => {
    switch (mode) {
      case '2x2': return 4
      case '3x3': return 9
      case '4x4': return 16
      default: return 9
    }
  }

  const maxTiles = getMaxTiles(layoutMode)
  const wallCameras = filteredCameras.slice(0, maxTiles)
  const mapCameras = filteredCameras.filter(cam => typeof cam.lat === 'number' && typeof cam.lon === 'number')

  const patrolPool = useMemo(() => {
    if (viewMode === 'map') return mapCameras
    if (focusCameraId) return filteredCameras
    return wallCameras
  }, [viewMode, mapCameras, focusCameraId, filteredCameras, wallCameras])

  const patrolTargetId = isPatrolRunning && patrolPool.length > 0
    ? patrolPool[patrolCursor % patrolPool.length]?.id
    : null

  const effectiveFocusId = patrolTargetId ?? focusCameraId
  const focusedCamera = effectiveFocusId
    ? filteredCameras.find(camera => camera.id === effectiveFocusId) || wallCameras[0] || filteredCameras[0]
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

  const getMarkerPosition = (lat: number, lon: number) => {
    const x = ((lon - MALAYSIA_MAP_BOUNDS.minLon) / (MALAYSIA_MAP_BOUNDS.maxLon - MALAYSIA_MAP_BOUNDS.minLon)) * 100
    const y = 100 - ((lat - MALAYSIA_MAP_BOUNDS.minLat) / (MALAYSIA_MAP_BOUNDS.maxLat - MALAYSIA_MAP_BOUNDS.minLat)) * 100
    return { left: `${Math.min(98, Math.max(2, x))}%`, top: `${Math.min(98, Math.max(2, y))}%` }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">OSINT COMMAND CENTER</p>
          <h1>Malaysia Live Camera Dashboard</h1>
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
            <label>Country</label>
            <button type="button" className="fake-select">Malaysia</button>
          </div>

          <div className="filter-block">
            <label>State</label>
            <div className="filter-dropdown">
              <select
                className="filter-select"
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
              >
                <option value="">All States</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-block">
            <label>Area</label>
            <div className="filter-dropdown">
              <select
                className="filter-select"
                value={selectedArea}
                onChange={(e) => handleAreaChange(e.target.value)}
                disabled={!selectedState}
              >
                <option value="">All Areas</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>

          {(selectedState || selectedArea || selectedPurposes.length > 0) && (
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
              {purposeOptions.map(purpose => (
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
                onChange={(e) => setPresetName(e.target.value)}
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
              {viewMode === 'map' ? 'Malaysia Map Mode' : focusCameraId ? 'Focus Mode' : 'Camera Wall'}
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
                  onChange={(e) => setPatrolIntervalSec(Number(e.target.value) || 6)}
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

          {viewMode === 'map' ? (
            <div className="map-mode-wrap">
              <div className="malaysia-map">
                <div className="map-grid" />
                {mapCameras.map((camera) => {
                  const position = getMarkerPosition(camera.lat as number, camera.lon as number)
                  return (
                    <button
                      key={`marker-${camera.id}`}
                      type="button"
                      className={`map-marker ${effectiveFocusId === camera.id ? 'active' : ''}`}
                      style={position}
                      onClick={() => setFocusCameraId(camera.id)}
                      title={`${camera.name} (${camera.area}, ${camera.state})`}
                    >
                      <span>{camera.id}</span>
                    </button>
                  )
                })}
              </div>

              <aside className="map-focus-panel">
                {focusedCamera ? (
                  <>
                    <p className="map-focus-note">Marker linked camera:</p>
                    <CameraTile
                      key={`map-focus-${focusedCamera.id}`}
                      id={focusedCamera.id}
                      name={focusedCamera.name}
                      location={`${focusedCamera.area}, ${focusedCamera.state}`}
                      status={focusedCamera.status || 'loading'}
                      streamType={focusedCamera.stream_type}
                      streamUrl={focusedCamera.stream_url}
                      relayUrl={focusedCamera.stream_relay_url}
                      source={focusedCamera.source}
                      isActive
                    />
                  </>
                ) : (
                  <div className="no-results">
                    <p>Click any marker to open linked camera panel.</p>
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
                  location={`${focusedCamera.area}, ${focusedCamera.state}`}
                  status={focusedCamera.status || 'loading'}
                  streamType={focusedCamera.stream_type}
                  streamUrl={focusedCamera.stream_url}
                  relayUrl={focusedCamera.stream_relay_url}
                  source={focusedCamera.source}
                  isActive
                />
              </div>
              <aside className="focus-list" aria-label="Focus camera list">
                {filteredCameras.slice(0, 16).map((camera) => (
                  <button
                    key={`focus-list-${camera.id}`}
                    type="button"
                    className={`focus-list-item ${camera.id === (focusedCamera?.id ?? '') ? 'active' : ''}`}
                    onClick={() => setFocusCameraId(camera.id)}
                  >
                    <span>{camera.id}</span>
                    <strong>{camera.name}</strong>
                    <small>{camera.area}, {camera.state}</small>
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
                  location={`${camera.area}, ${camera.state}`}
                  status={camera.status || 'loading'}
                  streamType={camera.stream_type}
                  streamUrl={camera.stream_url}
                  relayUrl={camera.stream_relay_url}
                  source={camera.source}
                  onClick={() => setFocusCameraId(camera.id)}
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
