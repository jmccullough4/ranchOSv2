const CAMERA_ORDER = ['cam1', 'cam2', 'cam3', 'cam4']

function CamerasPanel({ cameras }) {
  const feeds = CAMERA_ORDER.map((id) => cameras.find((camera) => camera.camera === id) || {
    camera: id,
    status: 'offline',
    predator_detected: false,
    location: 'unassigned',
  })

  return (
    <section className="details-card">
      <h2>Security &amp; Predator Watch</h2>
      <div className="camera-grid">
        {feeds.map((feed) => (
          <div key={feed.camera} className={`camera-tile ${feed.status}`}>
            <div className="camera-header">
              <span className="camera-id">{feed.camera.toUpperCase()}</span>
              <span className={`camera-status ${feed.status}`}>{feed.status}</span>
            </div>
            <div className="camera-body">
              {feed.status === 'offline' ? (
                <div className="camera-offline">Feed unavailable</div>
              ) : (
                <video muted autoPlay loop playsInline>
                  <source src={`/media/cameras/${feed.camera}.mp4`} type="video/mp4" />
                  {`Camera feed ${feed.camera.toUpperCase()} unavailable`}
                </video>
              )}
            </div>
            <div className="camera-footer">
              <span className="camera-location">{feed.location}</span>
              {feed.predator_detected ? <span className="predator-alert">Predator detected</span> : <span className="predator-clear">Clear</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default CamerasPanel
