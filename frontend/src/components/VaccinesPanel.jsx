function VaccinesPanel({ onOpenLog, upcomingCount, collapsed, onToggle }) {
  const formattedCount = new Intl.NumberFormat('en-US').format(upcomingCount ?? 0)

  return (
    <section className={`details-card ${collapsed ? 'collapsed' : ''}`}>
      <div className="card-header-action">
        <h2>
          <button type="button" className="details-toggle" onClick={onToggle} aria-expanded={!collapsed}>
            Vaccination Program
            <span className="toggle-icon" aria-hidden="true" />
          </button>
        </h2>
        <button type="button" className="text-button" onClick={onOpenLog}>
          View log
          <span className="badge subtle">{formattedCount}</span>
        </button>
      </div>
      {!collapsed && (
        <div className="details-content">
          <div className="details-row">
            <span>Next clinic</span>
            <strong>June 18 · Dawn chute</strong>
          </div>
          <div className="details-row">
            <span>Doses staged</span>
            <strong>Tri-shield respiratory (40)</strong>
          </div>
          <div className="details-row">
            <span>Handlers</span>
            <strong>Jay · April</strong>
          </div>
          <p className="details-note">Live log updates stream from chute scans to keep the vaccine ledger audit-ready.</p>
        </div>
      )}
    </section>
  )
}

export default VaccinesPanel
