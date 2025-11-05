import { useEffect, useMemo, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

const STRAY_DISTANCE_THRESHOLD = 0.03

const toHerdGeoJson = (herd, center) => ({
  type: 'FeatureCollection',
  features: herd.map((cow) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [cow.lon, cow.lat],
    },
    properties: {
      id: cow.id,
      name: cow.name,
      weight: cow.weight,
      temperature: cow.temperature,
      vaccines: JSON.stringify(cow.vaccines || []),
      stray: center ? Math.sqrt((cow.lat - center.lat) ** 2 + (cow.lon - center.lon) ** 2) > STRAY_DISTANCE_THRESHOLD : false,
    },
  })),
})

const toGateGeoJson = (gates) => ({
  type: 'FeatureCollection',
  features: gates.map((gate) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [gate.lon, gate.lat],
    },
    properties: gate,
  })),
})

const toFenceGeoJson = (fence) => ({
  type: 'FeatureCollection',
  features: fence?.coordinates
    ? [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [fence.coordinates],
          },
        },
      ]
    : [],
})

function MapPanel({ token, center, herd, gates, fence, selectedCow, onSelectCow, stats }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!token || !center || mapRef.current || !mapContainerRef.current) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [center.lon, center.lat],
      zoom: 13,
      projection: 'globe',
      pitch: 55,
      bearing: -20,
      antialias: true,
    })

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-left')

    map.on('style.load', () => {
      map.setFog({
        color: '#111827',
        range: [0.5, 12],
        "horizon-blend": 0.2,
        "high-color": '#0ea5e9',
        "space-color": '#020617',
        "star-intensity": 0.15,
      })
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.7 })

      map.addSource('fence', {
        type: 'geojson',
        data: toFenceGeoJson(fence),
      })
      map.addLayer({
        id: 'fence-fill',
        type: 'fill',
        source: 'fence',
        paint: {
          'fill-color': '#facc15',
          'fill-opacity': 0.05,
        },
      })
      map.addLayer({
        id: 'fence-line',
        type: 'line',
        source: 'fence',
        paint: {
          'line-color': '#facc15',
          'line-width': 4,
          'line-dasharray': [2, 2],
          'line-opacity': 0.9,
        },
      })

      map.addSource('herd', {
        type: 'geojson',
        data: toHerdGeoJson(herd, center),
      })
      map.addLayer({
        id: 'herd-points',
        type: 'circle',
        source: 'herd',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10,
            5,
            16,
            12,
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'stray'], true],
            '#f97316',
            '#b87333',
          ],
          'circle-opacity': 0.85,
          'circle-stroke-color': '#0f172a',
          'circle-stroke-width': 1.5,
        },
      })

      map.addLayer({
        id: 'herd-selected',
        type: 'circle',
        source: 'herd',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10,
            7,
            16,
            15,
          ],
          'circle-color': '#f8fafc',
          'circle-opacity': 0.9,
          'circle-stroke-color': '#f97316',
          'circle-stroke-width': 3,
        },
        filter: ['==', ['get', 'id'], ''],
      })

      map.addSource('gates', {
        type: 'geojson',
        data: toGateGeoJson(gates),
      })
      map.addLayer({
        id: 'gate-circles',
        type: 'circle',
        source: 'gates',
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'match',
            ['get', 'status'],
            'open',
            '#facc15',
            'closed',
            '#38bdf8',
            '#38bdf8',
          ],
          'circle-stroke-color': '#020617',
          'circle-stroke-width': 2,
        },
      })
      map.addLayer({
        id: 'gate-labels',
        type: 'symbol',
        source: 'gates',
        layout: {
          'text-field': ['get', 'id'],
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
          'text-size': 12,
        },
        paint: {
          'text-color': '#f8fafc',
          'text-halo-color': '#020617',
          'text-halo-width': 1.5,
        },
      })

      map.on('click', 'herd-points', (event) => {
        const feature = event.features && event.features[0]
        if (!feature) return
        const coordinates = feature.geometry.coordinates
        const props = feature.properties
        let vaccines = []
        try {
          vaccines = JSON.parse(props.vaccines)
        } catch (error) {
          vaccines = []
        }
        onSelectCow({
          id: props.id,
          name: props.name,
          weight: Number(props.weight),
          temperature: Number(props.temperature),
          vaccines,
          lat: coordinates[1],
          lon: coordinates[0],
        })
      })
      map.on('mouseenter', 'herd-points', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'herd-points', () => {
        map.getCanvas().style.cursor = ''
      })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [token, center, onSelectCow])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getSource('herd')) {
      map.getSource('herd').setData(toHerdGeoJson(herd, center))
    }
  }, [herd, center])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getSource('gates')) {
      map.getSource('gates').setData(toGateGeoJson(gates))
    }
  }, [gates])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getSource('fence')) {
      map.getSource('fence').setData(toFenceGeoJson(fence))
    }
  }, [fence])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getLayer('herd-selected')) {
      map.setFilter('herd-selected', ['==', ['get', 'id'], selectedCow?.id ?? ''])
    }
    if (selectedCow) {
      map.flyTo({ center: [selectedCow.lon, selectedCow.lat], zoom: 14.5, speed: 0.6 })
    }
  }, [selectedCow])

  const handleRecenter = () => {
    const map = mapRef.current
    if (!map || !center) return
    map.flyTo({ center: [center.lon, center.lat], zoom: 13, pitch: 55, bearing: -20, speed: 0.5 })
  }

  const activeGates = useMemo(() => gates.filter((gate) => gate.status === 'open'), [gates])

  return (
    <>
      <div ref={mapContainerRef} className="mapbox-globe" />
      <div className="map-overlay">
        <div className="overlay-header">
          <h2>Herd Overview</h2>
          <button type="button" className="recenter-btn" onClick={handleRecenter}>
            Recenter Ranch
          </button>
        </div>
        <div className="overlay-metrics">
          <div>
            <span className="metric-label">Headcount</span>
            <span className="metric-value">{stats.total}</span>
          </div>
          <div>
            <span className="metric-label">Strays</span>
            <span className="metric-value stray">{stats.strays}</span>
          </div>
        </div>
        <div className="gate-summary">
          <h3>Gate Status</h3>
          <ul>
            {gates.length === 0 ? (
              <li className="gate-loading">
                <span>Loading gate telemetry…</span>
              </li>
            ) : (
              gates.map((gate) => (
                <li key={gate.id} className={gate.status === 'open' ? 'gate-open' : 'gate-closed'}>
                  <span>{gate.id}</span>
                  <span>{gate.status === 'open' ? 'Open' : 'Secured'}</span>
                </li>
              ))
            )}
          </ul>
          {gates.length > 0 && (
            activeGates.length === 0 ? (
              <p className="gate-note">Perimeter is secure.</p>
            ) : (
              <p className="gate-note warning">{activeGates.length} gate(s) currently open.</p>
            )
          )}
        </div>
      </div>
    </>
  )
}

export default MapPanel
