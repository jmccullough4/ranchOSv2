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

function SensorBoard({ sensors }) {
  if (!sensors.length) {
    return <div className="sensor-board">Loading sensors…</div>
  }

  return (
    <div className="sensor-board">
      {sensors.map(([key, reading]) => (
        <div key={key} className={`sensor-chip status-${reading.status}`}>
          <div className="sensor-dot" />
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
