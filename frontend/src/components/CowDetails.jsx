function CowDetails({ cow, collapsed, onToggle, onClearSelection = () => {} }) {
  return (
    <section className={`details-card ${collapsed ? 'collapsed' : ''}`}>
      <div className="card-header-action">
        <h2>
          <button type="button" className="details-toggle" onClick={onToggle} aria-expanded={!collapsed}>
            Selected Cow
            <span className="toggle-icon" aria-hidden="true" />
          </button>
        </h2>
        <div className="card-meta">
          {cow && <span className="badge subtle">Tag {cow.id}</span>}
          {cow && (
            <button type="button" className="ghost-link" onClick={onClearSelection}>
              Clear
            </button>
          )}
        </div>
      </div>
      {!collapsed && (
        <>
          {!cow ? (
            <div className="details-empty">Select a cow on the globe to review vitals.</div>
          ) : (
            <div className="details-content">
              <div className="details-row">
                <span>ID</span>
                <strong>{cow.id}</strong>
              </div>
              <div className="details-row">
                <span>Name</span>
                <strong>{cow.name}</strong>
              </div>
              <div className="details-row">
                <span>Weight</span>
                <strong>{cow.weight} lbs</strong>
              </div>
              <div className="details-row">
                <span>Body Temp</span>
                <strong>{cow.temperature}°F</strong>
              </div>
              <div className="details-row stack">
                <span>Vaccine Log</span>
                <ul>
                  {cow.vaccines?.map((entry) => (
                    <li key={`${entry.name}-${entry.date}`}>
                      <strong>{entry.name}</strong>
                      <span>{entry.date}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default CowDetails
