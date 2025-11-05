function ChutePanel({ reading, onOpenLog, logCount }) {
  const formattedCount = new Intl.NumberFormat('en-US').format(logCount ?? 0)

  return (
    <section className="details-card">
      <div className="card-header-action">
        <h2>Chute Sync</h2>
        <button type="button" className="text-button" onClick={onOpenLog}>
          View log
          <span className="badge subtle">{formattedCount}</span>
        </button>
      </div>
      {!reading ? (
        <div className="details-empty">Awaiting chute synchronization…</div>
      ) : (
        <div className="details-content">
          <div className="details-row">
            <span>Tag</span>
            <strong>{reading.id}</strong>
          </div>
          <div className="details-row">
            <span>Weight</span>
            <strong>{reading.weight} lbs</strong>
          </div>
          <div className="details-row">
            <span>Body Temp</span>
            <strong>{reading.temperature}°F</strong>
          </div>
          <div className="details-row">
            <span>Timestamp</span>
            <strong>{new Date(reading.last_weighed).toLocaleString()}</strong>
          </div>
          <div className="details-row">
            <span>Operator</span>
            <strong className="badge">{reading.operator}</strong>
          </div>
          <div className="details-row">
            <span>Note</span>
            <strong>{reading.note}</strong>
          </div>
        </div>
      )}
    </section>
  )
}

export default ChutePanel
