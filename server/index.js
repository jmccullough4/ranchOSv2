const express = require('express')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 8082

app.use(express.json())

const USERS = new Set(['jay', 'kevin', 'april', 'ashley'])
const PASSWORD = '3strands'
const USER_LIST = [...USERS]

const DEFAULT_MAPBOX_TOKEN =
  'pk.eyJ1Ijoiam1jY3VsbG91Z2g0IiwiYSI6ImNtMGJvOXh3cDBjNncya3B4cDg0MXFuYnUifQ.uDJKnqE9WgkvGXYGLge-NQ'

const RANCH_CENTER = { lat: 36.7783, lon: -119.4179 }

const CATTLE_COUNT = 50
const STRAY_COUNT = 5
const CLUSTER_RADIUS = 0.01
const STRAY_RADIUS = 0.05
const MOVEMENT_STEP = 0.00018
const MOVEMENT_LIMIT = 0.0025

const randomBetween = (min, max) => Math.random() * (max - min) + min
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const baseCattle = Array.from({ length: CATTLE_COUNT }, (_, index) => ({
  id: `3S-${String(index + 1).padStart(3, '0')}`,
  name: `Cow ${index + 1}`,
  weight: Math.floor(randomBetween(900, 1200)),
  temperature: Number(randomBetween(100, 102.5).toFixed(1)),
  vaccines: [
    { name: 'Bovine Respiratory', date: '2023-11-14' },
    { name: 'Blackleg', date: '2024-03-03' },
  ],
}))

const gates = [
  { id: 'North Gate', status: 'closed', lat: RANCH_CENTER.lat + 0.02, lon: RANCH_CENTER.lon },
  { id: 'South Gate', status: 'open', lat: RANCH_CENTER.lat - 0.02, lon: RANCH_CENTER.lon + 0.002 },
  { id: 'East Gate', status: 'closed', lat: RANCH_CENTER.lat + 0.002, lon: RANCH_CENTER.lon + 0.028 },
  { id: 'West Gate', status: 'closed', lat: RANCH_CENTER.lat - 0.004, lon: RANCH_CENTER.lon - 0.03 },
]

const fencePolygon = [
  [RANCH_CENTER.lon - 0.04, RANCH_CENTER.lat - 0.03],
  [RANCH_CENTER.lon + 0.045, RANCH_CENTER.lat - 0.025],
  [RANCH_CENTER.lon + 0.05, RANCH_CENTER.lat + 0.028],
  [RANCH_CENTER.lon - 0.035, RANCH_CENTER.lat + 0.035],
  [RANCH_CENTER.lon - 0.04, RANCH_CENTER.lat - 0.03],
]

const fenceBounds = fencePolygon.reduce(
  (acc, [lon, lat]) => ({
    minLon: Math.min(acc.minLon, lon),
    maxLon: Math.max(acc.maxLon, lon),
    minLat: Math.min(acc.minLat, lat),
    maxLat: Math.max(acc.maxLat, lat),
  }),
  {
    minLon: Infinity,
    maxLon: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity,
  }
)

const isPointInPolygon = (point, polygon) => {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]
    const yi = polygon[i][1]
    const xj = polygon[j][0]
    const yj = polygon[j][1]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

const randomPointWithinFence = (radius) => {
  const attempts = 60
  for (let attempt = 0; attempt < attempts; attempt++) {
    let lat
    let lon
    if (attempt < attempts / 2) {
      const angle = randomBetween(0, Math.PI * 2)
      const distance = Math.random() * radius
      lat = RANCH_CENTER.lat + Math.cos(angle) * distance
      lon = RANCH_CENTER.lon + Math.sin(angle) * distance
    } else {
      lat = randomBetween(fenceBounds.minLat, fenceBounds.maxLat)
      lon = randomBetween(fenceBounds.minLon, fenceBounds.maxLon)
    }
    if (isPointInPolygon([lon, lat], fencePolygon)) {
      return { lat, lon }
    }
  }
  return { lat: RANCH_CENTER.lat, lon: RANCH_CENTER.lon }
}

const constrainToFence = (lat, lon) => {
  if (isPointInPolygon([lon, lat], fencePolygon)) {
    return { lat, lon, breached: false }
  }

  let adjustedLat = lat
  let adjustedLon = lon
  for (let i = 0; i < 12; i++) {
    adjustedLat = (adjustedLat + RANCH_CENTER.lat) / 2
    adjustedLon = (adjustedLon + RANCH_CENTER.lon) / 2
    if (isPointInPolygon([adjustedLon, adjustedLat], fencePolygon)) {
      return { lat: adjustedLat, lon: adjustedLon, breached: true }
    }
  }
  return { lat: RANCH_CENTER.lat, lon: RANCH_CENTER.lon, breached: true }
}

const herdAnchors = baseCattle.map((cow, index) => {
  const isStray = index >= CATTLE_COUNT - STRAY_COUNT
  const radius = isStray ? STRAY_RADIUS : CLUSTER_RADIUS
  return randomPointWithinFence(radius)
})

let herdPositions = herdAnchors.map((anchor) => ({ ...anchor }))
let fenceBreachActiveUntil = 0

const randomVoltage = () => Number(randomBetween(6.5, 9.5).toFixed(2))
const randomTroughLevel = () => Number(randomBetween(65, 100).toFixed(1))
const randomNetworkStrength = () => Math.floor(randomBetween(3, 6))

const resolveMapboxToken = () => {
  if (process.env.MAPBOX_TOKEN) {
    return process.env.MAPBOX_TOKEN
  }
  try {
    const secretPath = '/run/secrets/mapbox_token'
    if (fs.existsSync(secretPath)) {
      return fs.readFileSync(secretPath, 'utf-8').trim()
    }
  } catch (error) {
    // ignore secret resolution errors
  }
  return DEFAULT_MAPBOX_TOKEN
}

const distDir = path.join(__dirname, '..', 'frontend', 'dist')
const staticDir = path.join(distDir, 'static')
const mediaDir = path.join(distDir, 'media')

const ensureStaticMounts = () => {
  if (fs.existsSync(staticDir)) {
    app.use('/static', express.static(staticDir, { fallthrough: true }))
  }
  if (fs.existsSync(mediaDir)) {
    app.use('/media', express.static(mediaDir, { fallthrough: true }))
  }
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { index: false }))
  }
}

ensureStaticMounts()

app.post('/api/login', (req, res) => {
  const username = String(req.body?.username ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')

  if (USERS.has(username) && password === PASSWORD) {
    return res.json({ status: 'ok', user: username })
  }

  return res.status(401).json({ detail: 'Invalid credentials' })
})

app.get('/api/sensors', (_req, res) => {
  const waterLevel = randomTroughLevel()
  const fenceVoltage = randomVoltage()
  const networkBars = randomNetworkStrength()
  const openGate = gates.some((gate) => gate.status === 'open')

  const breachActive = Date.now() < fenceBreachActiveUntil

  const sensors = {
    WATER: {
      status: waterLevel > 70 ? 'green' : 'yellow',
      value: `${waterLevel}% full`,
      detail:
        waterLevel > 70
          ? `Average trough level across 12 monitors is ${waterLevel}% with auto-fill holding.`
          : `Refill recommended: trough level dipping to ${waterLevel}% across the line.`,
    },
    FENCE: breachActive
      ? {
          status: 'red',
          value: 'breach',
          detail: 'Perimeter breach intercept triggered — verify herd containment.',
        }
      : {
          status: fenceVoltage >= 7.5 ? 'green' : 'red',
          value: `${fenceVoltage} kV`,
          detail:
            fenceVoltage >= 7.5
              ? `Perimeter voltage steady at ${fenceVoltage} kV; arcs synced.`
              : `Voltage dip detected: ${fenceVoltage} kV average across perimeter nodes.`,
        },
    GATE: {
      status: openGate ? 'yellow' : 'green',
      value: openGate ? 'open' : 'secured',
      detail: openGate
        ? 'One or more perimeter gates currently unlocked for ranch movement.'
        : 'All perimeter gates secured with remote actuators in standby.',
    },
    NETWORK: {
      status: networkBars >= 4 ? 'green' : 'yellow',
      value: `${networkBars} bars`,
      bars: networkBars,
      detail: `Uplink strength reading ${networkBars}/5 bars with LTE failover primed.`,
    },
  }

  if (breachActive) {
    sensors.ALERTS = {
      status: 'red',
      value: 'PERIMETER',
      detail: 'Perimeter intrusion alarm active — drones and strobes deployed to herd perimeter.',
    }
  }

  const allGreen = Object.values(sensors).every((sensor) => sensor.status === 'green')
  sensors.SYSTEM = {
    status: breachActive ? 'red' : allGreen ? 'green' : 'yellow',
    value: breachActive ? 'breach' : allGreen ? 'nominal' : 'review',
    detail: breachActive
      ? 'Perimeter breach alarms engaged; live response teams dispatched to pasture.'
      : allGreen
          ? 'Automation, analytics, and failsafes nominal across the ranch stack.'
          : 'System automation engaged with advisories from sub-systems.',
  }

  return res.json({ sensors })
})

app.get('/api/herd', (_req, res) => {
  herdPositions = herdPositions.map((position, index) => {
    const anchor = herdAnchors[index]
    const deltaLat = randomBetween(-MOVEMENT_STEP, MOVEMENT_STEP)
    const deltaLon = randomBetween(-MOVEMENT_STEP, MOVEMENT_STEP)

    const nextLat = clamp(position.lat + deltaLat, anchor.lat - MOVEMENT_LIMIT, anchor.lat + MOVEMENT_LIMIT)
    const nextLon = clamp(position.lon + deltaLon, anchor.lon - MOVEMENT_LIMIT, anchor.lon + MOVEMENT_LIMIT)

    const constrained = constrainToFence(nextLat, nextLon)
    if (constrained.breached) {
      fenceBreachActiveUntil = Date.now() + 120000
    }

    return { lat: constrained.lat, lon: constrained.lon }
  })

  const herd = baseCattle.map((cow, index) => ({
    ...cow,
    lat: herdPositions[index].lat,
    lon: herdPositions[index].lon,
  }))

  return res.json({ herd })
})

app.get('/api/gates', (_req, res) => {
  if (Math.random() > 0.6) {
    const gateIndex = Math.floor(Math.random() * gates.length)
    gates[gateIndex].status = gates[gateIndex].status === 'open' ? 'closed' : 'open'
  }

  return res.json({ gates })
})

app.get('/api/chute', (_req, res) => {
  const cow = baseCattle[Math.floor(Math.random() * baseCattle.length)]
  const reading = {
    id: cow.id,
    weight: cow.weight + Math.floor(randomBetween(-15, 16)),
    temperature: Number((cow.temperature + randomBetween(-0.4, 0.4)).toFixed(1)),
    last_weighed: new Date().toISOString(),
    operator: USER_LIST[Math.floor(Math.random() * USER_LIST.length)],
    note: ['Routine weight check', 'Post-vaccine observation', 'Health audit', 'Hoof inspection'][
      Math.floor(Math.random() * 4)
    ],
  }

  return res.json({ chute: reading })
})

app.get('/api/cameras', (_req, res) => {
  const locations = ['north pasture', 'feed station', 'south draw', 'equipment barn']
  const cameras = Array.from({ length: 4 }, (_, index) => ({
    camera: `cam${index + 1}`,
    status: Math.random() > 0.15 ? 'online' : 'offline',
    predator_detected: Math.random() > 0.82,
    location: locations[Math.floor(Math.random() * locations.length)],
  }))

  return res.json({ cameras })
})

app.get('/api/config', (_req, res) => {
  res.json({
    mapboxToken: resolveMapboxToken(),
    ranchCenter: RANCH_CENTER,
    fence: { coordinates: fencePolygon },
  })
})

app.get('*', (req, res, next) => {
  if (!req.path.startsWith('/api')) {
    const indexFile = path.join(distDir, 'index.html')
    if (fs.existsSync(indexFile)) {
      return res.sendFile(indexFile)
    }
  }
  return next()
})

app.listen(PORT, () => {
  console.log(`3 Strands Cattle Co. dashboard listening on port ${PORT}`)
  if (!fs.existsSync(distDir)) {
    console.warn('Warning: frontend build not found. Run "npm run build" before starting the server.')
  }
})
