import { useCallback, useEffect, useMemo, useState } from 'react'
import MapPanel from './components/MapPanel'
import SensorBoard from './components/SensorBoard'
import CowDetails from './components/CowDetails'
import ChutePanel from './components/ChutePanel'
import CamerasPanel from './components/CamerasPanel'
import LoginOverlay from './components/LoginOverlay'

const SENSOR_REFRESH_MS = 5000
const HERD_REFRESH_MS = 4000
const GATE_REFRESH_MS = 6000
const CHUTE_REFRESH_MS = 8000
const CAMERA_REFRESH_MS = 10000

const STRAY_DISTANCE_THRESHOLD = 0.03

const distanceBetween = (cow, center) => {
  if (!cow || !center) return 0
  const latDiff = cow.lat - center.lat
  const lonDiff = cow.lon - center.lon
  return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff)
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [sensors, setSensors] = useState({})
  const [herd, setHerd] = useState([])
  const [gates, setGates] = useState([])
  const [chute, setChute] = useState(null)
  const [cameras, setCameras] = useState([])
  const [selectedCow, setSelectedCow] = useState(null)
  const [config, setConfig] = useState({ token: '', center: null, fence: null })

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/config')
      if (!response.ok) throw new Error('Unable to load map configuration')
      const data = await response.json()
      setConfig({
        token: data.mapboxToken,
        center: data.ranchCenter,
        fence: data.fence,
      })
    } catch (error) {
      console.error(error)
    }
  }, [])

  const fetchSensors = useCallback(async () => {
    try {
      const response = await fetch('/api/sensors')
      if (!response.ok) throw new Error('Sensor endpoint failed')
      const data = await response.json()
      setSensors(data.sensors)
    } catch (error) {
      console.error(error)
    }
  }, [])

  const fetchHerd = useCallback(async () => {
    try {
      const response = await fetch('/api/herd')
      if (!response.ok) throw new Error('Herd endpoint failed')
      const data = await response.json()
      setHerd(data.herd)
    } catch (error) {
      console.error(error)
    }
  }, [])

  const fetchGates = useCallback(async () => {
    try {
      const response = await fetch('/api/gates')
      if (!response.ok) throw new Error('Gates endpoint failed')
      const data = await response.json()
      setGates(data.gates)
    } catch (error) {
      console.error(error)
    }
  }, [])

  const fetchChute = useCallback(async () => {
    try {
      const response = await fetch('/api/chute')
      if (!response.ok) throw new Error('Chute endpoint failed')
      const data = await response.json()
      setChute(data.chute)
    } catch (error) {
      console.error(error)
    }
  }, [])

  const fetchCameras = useCallback(async () => {
    try {
      const response = await fetch('/api/cameras')
      if (!response.ok) throw new Error('Camera endpoint failed')
      const data = await response.json()
      setCameras(data.cameras)
    } catch (error) {
      console.error(error)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchSensors()
    const interval = setInterval(fetchSensors, SENSOR_REFRESH_MS)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchSensors])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchHerd()
    const interval = setInterval(fetchHerd, HERD_REFRESH_MS)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchHerd])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchGates()
    const interval = setInterval(fetchGates, GATE_REFRESH_MS)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchGates])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchChute()
    const interval = setInterval(fetchChute, CHUTE_REFRESH_MS)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchChute])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchCameras()
    const interval = setInterval(fetchCameras, CAMERA_REFRESH_MS)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchCameras])

  const handleLogin = useCallback(async ({ username, password }) => {
    try {
      setLoginError('')
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!response.ok) {
        throw new Error('Invalid credentials')
      }
      setIsAuthenticated(true)
    } catch (error) {
      setLoginError(error.message)
      setIsAuthenticated(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedCow(null)
    }
  }, [isAuthenticated])

  const herdStats = useMemo(() => {
    if (!herd.length || !config.center) {
      return { total: herd.length, strays: 0 }
    }
    const strays = herd.filter((cow) => distanceBetween(cow, config.center) > STRAY_DISTANCE_THRESHOLD)
    return { total: herd.length, strays: strays.length }
  }, [herd, config.center])

  const sensorEntries = useMemo(() => Object.entries(sensors ?? {}), [sensors])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img src="/static/logo.png" alt="3 Strands Cattle Co." className="brand-logo" />
          <div>
            <h1>3 Strands Cattle Co., LLC</h1>
            <p>Smart Ranch Operations Center</p>
          </div>
        </div>
        <SensorBoard sensors={sensorEntries} />
      </header>

      <main className="app-main">
        <section className="map-panel">
          <MapPanel
            token={config.token}
            center={config.center}
            fence={config.fence}
            herd={herd}
            gates={gates}
            selectedCow={selectedCow}
            onSelectCow={setSelectedCow}
            stats={herdStats}
          />
        </section>
        <aside className="details-panel">
          <CowDetails cow={selectedCow} />
          <ChutePanel reading={chute} />
          <CamerasPanel cameras={cameras} />
        </aside>
      </main>

      <LoginOverlay visible={!isAuthenticated} error={loginError} onSubmit={handleLogin} />
    </div>
  )
}

export default App
