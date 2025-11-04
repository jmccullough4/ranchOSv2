# 3 Strands Cattle Co. Smart Ranch Demo

This repository contains a demo web application that simulates a smart livestock ranch for **3 Strands Cattle Co., LLC**. The dashboard showcases satellite monitoring, herd tracking, chute synchronization, sensor health, and predator detection feeds. The full stack (FastAPI backend + static Mapbox-powered frontend) is orchestrated with **npm** inside Docker and exposed on port **8082**.

## Features

- **Authentication** – Login screen for operators `jay`, `kevin`, `april`, and `ashley` (password `3strands`).
- **Sensor Board** – Real-time status indicators for SYSTEM, WATER, FENCE, GATE, and NETWORK sensors with color-coded health states.
- **3D Globe Map** – Mapbox satellite globe with terrain exaggeration, 50 simulated cattle, stray detection, and gate overlays.
- **Cow Insights** – Select any cow marker to view ID, weight, body temperature, and vaccine log.
- **Chute Sync** – Live chute readout showing the latest scale transaction, operator, and notes.
- **Security Cameras** – Four simulated camera feeds (`cam1`–`cam4`) with predator alerts.

## Project Structure

```
backend/         # FastAPI application with simulation endpoints
frontend/        # Static assets served by FastAPI
  ├─ index.html  # Dashboard shell
  ├─ app.js      # Frontend logic + Mapbox integration
  ├─ styles.css  # Dashboard styling
  └─ media/
      └─ cameras/   # Place cam1.mp4 … cam4.mp4 here (copied before building)
requirements.txt
Dockerfile
```

## Prerequisites

- Docker 24+
- A Mapbox access token with globe support (tileset: `mapbox.mapbox-terrain-dem-v1`).
- Project assets:
  - `frontend/logo.png` – Company logo (referenced twice in the UI).
  - `frontend/media/cameras/cam1.mp4` … `cam4.mp4` – Security camera demo clips.

## Running with Docker + npm

1. **Populate assets**
   ```bash
   cp /path/to/logo.png frontend/logo.png
   cp /path/to/cam1.mp4 frontend/media/cameras/
   cp /path/to/cam2.mp4 frontend/media/cameras/
   cp /path/to/cam3.mp4 frontend/media/cameras/
   cp /path/to/cam4.mp4 frontend/media/cameras/
   ```

2. **Launch the stack with Docker Compose** – The container uses npm scripts to start the FastAPI server. Build and run everything with:
   ```bash
   docker compose up --build --remove-orphans
   # shorthand supported on recent Docker versions: docker compose up --build -r
   ```
   The compose file injects the provided Mapbox token by default (`pk.eyJ1Ijoiam1jY3VsbG91Z2g0IiwiYSI6ImNtMGJvOXh3cDBjNncya3B4cDg0MXFuYnUifQ.uDJKnqE9WgkvGXYGLge-NQ`). Override it by exporting `MAPBOX_TOKEN` before running the command if needed.

3. **Open the dashboard** – Visit [http://localhost:8082](http://localhost:8082) and log in with one of the operator accounts. The backend continuously simulates sensor, herd, gate, chute, and security events.

## Development Notes

- The FastAPI app exposes JSON APIs under `/api/*` and serves static files at `/static` and `/media`.
- Sensor and herd data are randomized on each request to emulate a living ranch environment.
- If the Mapbox token is not provided, the dashboard still loads but the globe remains inactive.
- Adjust simulation logic in `backend/app.py` to tailor cattle counts, geography, or alert thresholds.
- `npm run dev` can be used for a hot-reload experience outside Docker if you have Python 3.11 locally.

## License

This demo is provided for internal prototyping at 3 Strands Cattle Co., LLC.
