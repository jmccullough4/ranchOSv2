# 3 Strands Cattle Co. Smart Ranch Demo

This repository contains a demo web application that simulates a smart livestock ranch for **3 Strands Cattle Co., LLC**. The polished dashboard is powered by an Express simulation service and a React + Mapbox front end, orchestrated with **npm** inside Docker and exposed on port **8082**.

## Features

- **Authentication** – Login screen for operators `jay`, `kevin`, `april`, and `ashley` (password `3strands`).
- **Sensor Command Center** – Real-time indicators for SYSTEM, WATER, FENCE, GATE, NETWORK, and ALERTS with rich hover tooltips summarizing trends and advisories.
- **3D Globe Ranch View** – Mapbox satellite globe with live herd animation, stray detection, perimeter fence geometry, simulated gates, and a one-click ranch recenter action.
- **Perimeter Safeguards** – Herd movement stays inside the ranch boundary and automatically escalates perimeter breach alarms if any cow presses the fence.
- **Cow Insights** – Select any cow marker to view ID, weight, body temperature, and vaccine log in the insights panel.
- **Chute Sync** – Live chute readout showing the latest scale transaction, operator, and notes.
- **Security Cameras** – Quad camera wall for feeds `cam1`–`cam4` with predator alerts and offline states.

## Project Structure

```
server/                  # Express simulation service and REST endpoints
frontend/
  ├─ index.html          # Vite entry point
  ├─ vite.config.js      # React + Vite configuration
  ├─ public/
  │   └─ static/
  │       ├─ logo.png              # Company logo (copy in before building)
  │       └─ media/cameras/        # Place cam1.mp4 … cam4.mp4 here
  └─ src/                # React application source
      ├─ App.jsx
      ├─ components/
      ├─ styles/
      └─ main.jsx
Dockerfile
package.json             # npm scripts for build/start/dev
```

## Prerequisites

- Docker 24+
- A Mapbox access token with globe support (tileset: `mapbox.mapbox-terrain-dem-v1`).
- Project assets:
  - `frontend/public/static/logo.png` – Company logo (referenced in header, login overlay, and browser tab icon).
  - `frontend/public/static/media/cameras/cam1.mp4` … `cam4.mp4` – Security camera demo clips for the quad wall.

## Running with Docker + npm

1. **Populate assets**
   ```bash
    cp /path/to/logo.png frontend/public/static/logo.png
    mkdir -p frontend/public/static/media/cameras
    cp /path/to/cam1.mp4 frontend/public/static/media/cameras/
    cp /path/to/cam2.mp4 frontend/public/static/media/cameras/
    cp /path/to/cam3.mp4 frontend/public/static/media/cameras/
    cp /path/to/cam4.mp4 frontend/public/static/media/cameras/
   ```

2. **Launch the stack with Docker Compose** – The container builds the React UI via npm and starts the Express simulator on port 8082.
   ```bash
   docker compose up --build --remove-orphans
   # shorthand supported on recent Docker versions: docker compose up --build -r
   ```
   The compose file injects the provided Mapbox token by default (`pk.eyJ1Ijoiam1jY3VsbG91Z2g0IiwiYSI6ImNtMGJvOXh3cDBjNncya3B4cDg0MXFuYnUifQ.uDJKnqE9WgkvGXYGLge-NQ`). Override it by exporting `MAPBOX_TOKEN` before running the command if needed.

3. **Open the dashboard** – Visit [http://localhost:8082](http://localhost:8082) and log in with one of the operator accounts. The Node service continuously simulates sensor, herd, gate, chute, and security events.

## Development Notes

- `npm run build` compiles the React application into `frontend/dist`, which the Express server serves from `/` (hashed assets) and `/static` (logo/camera media).
- `npm run dev` starts a hot-reload environment with Vite for the UI and Nodemon for the Express simulator.
- Sensor and herd data are randomized on each request to emulate a living ranch environment while keeping cattle drift subtle.
- If the Mapbox token is not provided, the dashboard still loads but the globe remains inactive.
- Adjust simulation logic in `server/index.js` to tailor cattle counts, geography, or alert thresholds.

## License

This demo is provided for internal prototyping at 3 Strands Cattle Co., LLC.
