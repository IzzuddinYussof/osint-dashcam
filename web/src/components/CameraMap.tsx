import './CameraMap.css'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { CameraMetadata } from '../data/camerasDataset'

interface CameraMapProps {
  cameras: CameraMetadata[]
  activeCameraId?: string | null
  hoveredCameraId?: string | null
  isMountFujiMap?: boolean
  onSelectCamera: (cameraId: string) => void
  onHoverCamera?: (cameraId: string | null) => void
}

const MOUNT_FUJI_SUMMIT: [number, number] = [35.3606, 138.7274]

function getMarkerLabel(camera: CameraMetadata, isMountFujiMap: boolean): string {
  return isMountFujiMap ? camera.id.slice(-2) : camera.id
}

function buildMarkerIcon(
  camera: CameraMetadata,
  isMountFujiMap: boolean,
  isActive: boolean,
  isHovered: boolean
): L.DivIcon {
  const classes = [
    'camera-map-pin',
    isMountFujiMap ? 'mount-fuji' : '',
    isActive ? 'active' : '',
    isHovered ? 'hovered' : '',
  ].filter(Boolean).join(' ')

  return L.divIcon({
    className: 'camera-map-icon-wrap',
    html: `<div class="${classes}"><span>${getMarkerLabel(camera, isMountFujiMap)}</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

function CameraMap({
  cameras,
  activeCameraId = null,
  hoveredCameraId = null,
  isMountFujiMap = false,
  onSelectCamera,
  onHoverCamera,
}: CameraMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: true,
      minZoom: 2,
      worldCopyJump: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 20,
      subdomains: 'abc',
    }).addTo(map)

    mapRef.current = map
    markersLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const markersLayer = markersLayerRef.current
    if (!map || !markersLayer) return

    markersLayer.clearLayers()

    if (isMountFujiMap) {
      const summitMarker = L.marker(MOUNT_FUJI_SUMMIT, {
        interactive: false,
        icon: L.divIcon({
          className: 'camera-map-icon-wrap',
          html: '<div class="camera-map-pin summit"><span>FUJI</span></div>',
          iconSize: [54, 54],
          iconAnchor: [27, 27],
        }),
      })

      summitMarker.bindTooltip('Mount Fuji Summit', {
        direction: 'top',
        opacity: 0.95,
        offset: [0, -16],
      })

      summitMarker.addTo(markersLayer)
    }

    cameras.forEach((camera) => {
      if (typeof camera.lat !== 'number' || typeof camera.lon !== 'number') return

      const latLng: L.LatLngExpression = [camera.lat, camera.lon]

      if (isMountFujiMap) {
        L.polyline([latLng, MOUNT_FUJI_SUMMIT], {
          color: '#65d88a',
          weight: 1,
          opacity: 0.28,
          dashArray: '4 6',
          interactive: false,
        }).addTo(markersLayer)
      }

      const marker = L.marker(latLng, {
        keyboard: true,
        riseOnHover: true,
        icon: buildMarkerIcon(
          camera,
          isMountFujiMap,
          camera.id === activeCameraId,
          camera.id === hoveredCameraId
        ),
      })

      const tooltipLines = [camera.name]
      if (camera.view_hint) tooltipLines.push(camera.view_hint)

      marker.bindTooltip(tooltipLines.join('<br />'), {
        direction: 'top',
        opacity: 0.95,
        offset: [0, -14],
      })

      marker.on('click', () => onSelectCamera(camera.id))
      marker.on('mouseover', () => onHoverCamera?.(camera.id))
      marker.on('mouseout', () => onHoverCamera?.(null))
      marker.on('focus', () => onHoverCamera?.(camera.id))
      marker.on('blur', () => onHoverCamera?.(null))

      marker.addTo(markersLayer)
    })
  }, [activeCameraId, cameras, hoveredCameraId, isMountFujiMap, onHoverCamera, onSelectCamera])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const markerLatLngs: L.LatLngExpression[] = cameras
      .filter((camera) => typeof camera.lat === 'number' && typeof camera.lon === 'number')
      .map((camera) => [camera.lat as number, camera.lon as number])

    if (isMountFujiMap) {
      markerLatLngs.push(MOUNT_FUJI_SUMMIT)
    }

    if (markerLatLngs.length === 0) {
      map.setView([20, 120], 4, { animate: false })
      return
    }

    const bounds = L.latLngBounds(markerLatLngs)
    map.fitBounds(bounds.pad(isMountFujiMap ? 0.28 : 0.16), {
      animate: false,
      padding: [36, 36],
    })
  }, [cameras, isMountFujiMap])

  return <div ref={containerRef} className="camera-map-canvas" />
}

export default CameraMap
