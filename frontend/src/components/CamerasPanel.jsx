const CAMERA_ORDER = ['cam1', 'cam2', 'cam3', 'cam4']

const CAMERA_MEDIA = {
  cam1: '/media/cameras/cam1.mp4',
  cam2: '/media/cameras/cam2.mp4',
  cam3: '/media/cameras/cam3.mp4',
  cam4: '/media/cameras/cam4.mp4',
}

function CamerasPanel({ cameras, onOpenCamera, collapsed, onToggle }) {
  const feeds = CAMERA_ORDER.map((id) =>
    cameras.find((camera) => camera.camera === id) || {
      camera: id,
      status: 'offline',
      predator_detected: false,
      location: 'unassigned',
    }
  )

  const onlineCount = feeds.filter((feed) => feed.status === 'online').length

  return (
    <section className={`details-card ${collapsed ? 'collapsed' : ''}`}>
      <div className="card-header-action">
        <h2>
          <button type="button" className="details-toggle" onClick={onToggle} aria-expanded={!collapsed}>
            Security &amp; Predator Watch
            <span className="toggle-icon" aria-hidden="true" />
          </button>
        </h2>
        <span className="badge subtle">{onlineCount}/4 online</span>
      </div>
      {!collapsed && (
        <div className="camera-grid">
          {feeds.map((feed) => {
            const isOnline = feed.status === 'online'
            return (
              <div key={feed.camera} className={`camera-tile ${feed.status}`}>
                <div className="camera-header">
                  <span className="camera-id">{feed.camera.toUpperCase()}</span>
                  <span className={`camera-status ${feed.status}`}>{feed.status}</span>
                </div>
                <div className="camera-body">
                  {isOnline ? (
                    <button
                      type="button"
                      className="camera-thumbnail"
                      onClick={() =>
                        onOpenCamera?.({
                          ...feed,
                          media: CAMERA_MEDIA[feed.camera] || `/media/cameras/${feed.camera}.mp4`,
                        })
                      }
                      aria-label={`View ${feed.camera} live stream`}
                    >
                      <video
                        key={feed.camera}
                        className="camera-preview"
                        src={CAMERA_MEDIA[feed.camera] || `/media/cameras/${feed.camera}.mp4`}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <span className="camera-thumbnail-overlay">
                        <span className="camera-thumbnail-icon" aria-hidden="true">
                          ▶
                        </span>
                        <span className="camera-thumbnail-copy">Expand live view</span>
                      </span>
                    </button>
                  ) : (
                    <div className="camera-offline">Feed unavailable</div>
                  )}
                </div>
                <div className="camera-footer">
                  <span className="camera-location">{feed.location}</span>
                  {feed.predator_detected ? (
                    <span className="predator-alert">Predator detected</span>
                  ) : (
                    <span className="predator-clear">Clear</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default CamerasPanel
