import { useMemo } from 'react'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const buildSparklinePath = (values) => {
  if (!values.length) return 'M0 20 L100 20'
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) {
    return `M0 20 L100 20`
  }

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const normalized = (value - min) / (max - min)
      const y = 40 - normalized * 32 - 4
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

const Sparkline = ({ values, gradientId }) => {
  const path = useMemo(() => buildSparklinePath(values), [values])

  return (
    <svg className="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(217, 146, 82, 0.95)" />
          <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
        </linearGradient>
      </defs>
      <path className="sparkline-fill" d={`${path} L100 40 L0 40 Z`} fill={`url(#${gradientId})`} />
      <path className="sparkline-path" d={path} />
    </svg>
  )
}

function InsightsPanel({ herd, herdStats, sensors, gates, chuteLog, cameras, collapsed, onToggle }) {
  const averageWeight = useMemo(() => {
    if (!herd.length) return 0
    const total = herd.reduce((sum, cow) => sum + (cow.weight || 0), 0)
    return Math.round(total / herd.length)
  }, [herd])

  const averageTemp = useMemo(() => {
    if (!herd.length) return 0
    const total = herd.reduce((sum, cow) => sum + (cow.temperature || 0), 0)
    return (total / herd.length).toFixed(1)
  }, [herd])

  const chuteThroughput = useMemo(() => {
    if (chuteLog.length < 2) return 3
    const timestamps = chuteLog
      .slice(0, 5)
      .map((entry) => new Date(entry.last_weighed || entry.timestamp || entry.updated_at).getTime())
      .filter((time) => Number.isFinite(time))
      .sort((a, b) => a - b)
    if (timestamps.length < 2) return 4
    const minutes = (timestamps[timestamps.length - 1] - timestamps[0]) / 60000
    if (minutes <= 0) return 4
    return clamp(Math.round((timestamps.length / minutes) * 6), 2, 18)
  }, [chuteLog])

  const sensorHealth = useMemo(() => {
    if (!sensors.length) return { green: 0, total: 0 }
    const green = sensors.filter(([, reading]) => reading.status === 'green').length
    return { green, total: sensors.length }
  }, [sensors])

  const openGates = useMemo(() => gates.filter((gate) => gate.status === 'open').length, [gates])
  const onlineCameras = useMemo(() => cameras.filter((camera) => camera.status === 'online').length, [cameras])

  const weightTrend = useMemo(() => {
    const base = averageWeight || 1185
    return Array.from({ length: 12 }, (_, index) => base + Math.sin(index / 1.5) * 18 + index * 1.2)
  }, [averageWeight])

  const tempTrend = useMemo(() => {
    const base = Number(averageTemp) || 101.3
    return Array.from({ length: 12 }, (_, index) => base + Math.cos(index / 2.3) * 0.8 + (index % 3) * 0.15)
  }, [averageTemp])

  const chuteTrend = useMemo(
    () => Array.from({ length: 12 }, (_, index) => clamp(chuteThroughput + Math.sin(index / 2) * 1.5 + index * 0.2, 1, 20)),
    [chuteThroughput]
  )

  return (
    <section className={`details-card insights-card ${collapsed ? 'collapsed' : ''}`}>
      <div className="card-header-action">
        <h2>
          <button type="button" className="details-toggle" onClick={onToggle} aria-expanded={!collapsed}>
            Ranch Intelligence
            <span className="toggle-icon" aria-hidden="true" />
          </button>
        </h2>
        {!collapsed && <span className="badge subtle">Live demo snapshot</span>}
      </div>
      {!collapsed && (
        <div className="insights-grid">
          <article className="insight-panel">
            <header>
              <span className="metric-label">Average Weight</span>
            <span className="metric-value">{averageWeight ? `${averageWeight} lbs` : 'Loading…'}</span>
          </header>
          <Sparkline values={weightTrend} gradientId="weightTrend" />
          <p className="insight-footnote">+2.4% vs. last chute sync</p>
        </article>
        <article className="insight-panel">
          <header>
            <span className="metric-label">Core Temp</span>
            <span className="metric-value">{averageTemp ? `${averageTemp}°F` : 'Loading…'}</span>
          </header>
          <Sparkline values={tempTrend} gradientId="tempTrend" />
          <p className="insight-footnote">Stable across all lots</p>
        </article>
        <article className="insight-panel wide">
          <header>
            <span className="metric-label">Chute Throughput</span>
            <span className="metric-value">{chuteThroughput} head/hr</span>
          </header>
          <Sparkline values={chuteTrend} gradientId="chuteTrend" />
          <p className="insight-footnote">Logs refreshed from RFID scale</p>
        </article>
        <article className="insight-stats">
          <div>
            <span className="metric-label">Herd On Ranch</span>
            <span className="metric-value">{herdStats.total}</span>
            <p className="insight-footnote stray">{herdStats.strays} strays detected</p>
          </div>
          <div>
            <span className="metric-label">Sensor Uptime</span>
            <div className="insight-progress">
              <div
                className="insight-progress-bar"
                style={{ width: sensorHealth.total ? `${Math.round((sensorHealth.green / sensorHealth.total) * 100)}%` : '15%' }}
              />
            </div>
            <p className="insight-footnote">
              {sensorHealth.green}/{sensorHealth.total || '…'} systems operational
            </p>
          </div>
        </article>
        <article className="insight-stats">
          <div>
            <span className="metric-label">Perimeter</span>
            <span className="metric-value">{openGates === 0 ? 'Secure' : `${openGates} open`}</span>
            <p className={`insight-footnote ${openGates ? 'warning' : ''}`}>
              {openGates ? 'Dispatch crew to north line' : 'All gates locked'}
            </p>
          </div>
          <div>
            <span className="metric-label">Cameras Streaming</span>
            <span className="metric-value">{onlineCameras}/4</span>
            <p className="insight-footnote">Tap a feed to open live view</p>
          </div>
        </article>
        </div>
      )}
    </section>
  )
}

export default InsightsPanel
