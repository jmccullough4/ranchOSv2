import { useCallback, useEffect, useMemo, useState } from 'react'
import MapPanel from './components/MapPanel'
import SensorBoard from './components/SensorBoard'
import CowDetails from './components/CowDetails'
import ChutePanel from './components/ChutePanel'
import CamerasPanel from './components/CamerasPanel'
import LoginOverlay from './components/LoginOverlay'
import Modal from './components/Modal'
import VaccinesPanel from './components/VaccinesPanel'

const SENSOR_REFRESH_MS = 5000
const HERD_REFRESH_MS = 4000
const GATE_REFRESH_MS = 6000
const CHUTE_REFRESH_MS = 8000
const CAMERA_REFRESH_MS = 10000

const STRAY_DISTANCE_THRESHOLD = 0.03
const MAX_CHUTE_LOG = 40

const OPERATORS = ['Jay', 'Kevin', 'April', 'Ashley']
const VACCINE_NOTES = [
  'Routine booster administered',
  'Respiratory booster recorded',
  'Vet follow-up scheduled',
  'Cleared for pasture rotation',
  'Immunity audit complete',
]

const distanceBetween = (cow, center) => {
  if (!cow || !center) return 0
  const latDiff = cow.lat - center.lat
  const lonDiff = cow.lon - center.lon
  return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff)
}

const buildVaccineLog = (herd) => {
  const entries = []
  herd.slice(0, 30).forEach((cow) => {
    const doses = cow.vaccines || []
    doses.forEach((dose, index) => {
      const admin = OPERATORS[(cow.id.length + index) % OPERATORS.length]
      const dayOffset = (index * 7 + cow.id.charCodeAt(cow.id.length - 1)) % 24
      const timestamp = new Date(`${dose.date}T0${(index + 7) % 9}:${(cow.id.length * 3) % 5}5:00`)
      timestamp.setDate(timestamp.getDate() - dayOffset)
      entries.push({
        id: `${cow.id}-${index}`,
        cowId: cow.id,
        cowName: cow.name,
        vaccine: dose.name,
        administeredBy: admin,
        timestamp: timestamp.toISOString(),
        note: VACCINE_NOTES[(index + cow.id.length) % VACCINE_NOTES.length],
      })
    })
  })
  entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return entries
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [sensors, setSensors] = useState({})
  const [herd, setHerd] = useState([])
  const [gates, setGates] = useState([])
  const [chute, setChute] = useState(null)
  const [chuteLog, setChuteLog] = useState([])
  const [cameras, setCameras] = useState([])
  const [selectedCow, setSelectedCow] = useState(null)
  const [config, setConfig] = useState({ token: '', center: null, fence: null })
  const [cameraViewing, setCameraViewing] = useState(null)
  const [showChuteModal, setShowChuteModal] = useState(false)
  const [showVaccineModal, setShowVaccineModal] = useState(false)
  const [vaccineLog, setVaccineLog] = useState([])

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
      setVaccineLog((previous) => (previous.length ? previous : buildVaccineLog(data.herd)))
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
      setChuteLog((previous) => {
        const filtered = previous.filter((entry) => entry.last_weighed !== data.chute.last_weighed)
        return [data.chute, ...filtered].slice(0, MAX_CHUTE_LOG)
      })
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
      setChuteLog([])
      setCameraViewing(null)
      setShowChuteModal(false)
      setShowVaccineModal(false)
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
          <div className="brand-text">
            <h1>3  S T R A N D S  C A T T L E  CO.</h1>
            <p>ranchOS Operations Console</p>
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
          <ChutePanel reading={chute} onOpenLog={() => setShowChuteModal(true)} logCount={chuteLog.length} />
          <VaccinesPanel onOpenLog={() => setShowVaccineModal(true)} upcomingCount={vaccineLog.length} />
          <CamerasPanel cameras={cameras} onOpenCamera={setCameraViewing} />
        </aside>
      </main>

      <LoginOverlay visible={!isAuthenticated} error={loginError} onSubmit={handleLogin} />

      <Modal open={!!cameraViewing} title={cameraViewing ? `${cameraViewing.camera.toUpperCase()} • ${cameraViewing.location}` : ''} onClose={() => setCameraViewing(null)} size="lg">
        {cameraViewing && cameraViewing.status === 'online' ? (
          <div className="camera-modal-player">
            <video controls autoPlay loop playsInline>
              <source src={`/media/cameras/${cameraViewing.camera}.mp4`} type="video/mp4" />
              {`Camera feed ${cameraViewing.camera.toUpperCase()} unavailable`}
            </video>
          </div>
        ) : (
          <p className="details-empty">Camera feed offline.</p>
        )}
      </Modal>

      <Modal open={showChuteModal} title="Chute Sync Log" onClose={() => setShowChuteModal(false)}>
        <div className="log-table">
          <header className="log-table-header">
            <span>Tag</span>
            <span>Weight</span>
            <span>Temp</span>
            <span>Operator</span>
            <span>Timestamp</span>
          </header>
          <div className="log-table-body">
            {chuteLog.length === 0 ? (
              <div className="details-empty">No chute records yet.</div>
            ) : (
              chuteLog.map((entry) => (
                <div key={entry.last_weighed} className="log-table-row">
                  <span>{entry.id}</span>
                  <span>{entry.weight} lbs</span>
                  <span>{entry.temperature}°F</span>
                  <span>{entry.operator}</span>
                  <span>{new Date(entry.last_weighed).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <Modal open={showVaccineModal} title="Vaccination Ledger" onClose={() => setShowVaccineModal(false)} size="lg">
        <div className="log-table">
          <header className="log-table-header">
            <span>Cattle</span>
            <span>Vaccine</span>
            <span>Admin</span>
            <span>Logged</span>
          </header>
          <div className="log-table-body">
            {vaccineLog.length === 0 ? (
              <div className="details-empty">Vaccine data not yet synchronized.</div>
            ) : (
              vaccineLog.map((entry) => (
                <div key={entry.id} className="log-table-row">
                  <span>
                    <strong>{entry.cowId}</strong>
                    <small>{entry.cowName}</small>
                  </span>
                  <span>{entry.vaccine}</span>
                  <span>{entry.administeredBy}</span>
                  <span>
                    {new Date(entry.timestamp).toLocaleDateString()} · {entry.note}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default App
