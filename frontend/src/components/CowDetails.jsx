function CowDetails({ cow }) {
  return (
    <section className="details-card">
      <h2>Selected Cow</h2>
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
    </section>
  )
}

export default CowDetails
