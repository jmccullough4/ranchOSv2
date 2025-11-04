const statusLabel = (status) => {
  switch (status) {
    case 'green':
      return 'Operational'
    case 'yellow':
      return 'Attention'
    case 'red':
      return 'Critical'
    default:
      return 'Unknown'
  }
}

const renderGlyph = (key, reading) => {
  if (key === 'NETWORK') {
    const bars = Number.isFinite(reading.bars) ? reading.bars : parseInt(reading.value, 10) || 0
    const clamped = Math.max(0, Math.min(5, bars))
    return (
      <div className="signal-bars" aria-hidden>
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={`signal-bar ${index < clamped ? 'active' : ''}`} />
        ))}
      </div>
    )
  }

  return <div className="sensor-dot" />
}

function SensorBoard({ sensors }) {
  if (!sensors.length) {
    return <div className="sensor-board">Loading sensors…</div>
  }

  return (
    <div className="sensor-board">
      {sensors.map(([key, reading]) => (
        <div key={key} className={`sensor-chip status-${reading.status}`}>
          {renderGlyph(key, reading)}
          <div className="sensor-info">
            <span className="sensor-name">{key}</span>
            <span className="sensor-value">{reading.value}</span>
          </div>
          <div className="sensor-tooltip">
            <strong>{key} – {statusLabel(reading.status)}</strong>
            <p>{reading.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default SensorBoard
