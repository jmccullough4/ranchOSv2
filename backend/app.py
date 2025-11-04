from __future__ import annotations

import os
import random
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="3 Strands Cattle Co. Smart Ranch")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
STATIC_DIR = FRONTEND_DIR / "dist"
INDEX_FILE = STATIC_DIR / "index.html"
MEDIA_DIR = STATIC_DIR / "media"
MEDIA_CAM_DIR = MEDIA_DIR / "cameras"

STATIC_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_CAM_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


USERS = {"jay", "kevin", "april", "ashley"}
PASSWORD = "3strands"

DEFAULT_MAPBOX_TOKEN = (
    "pk.eyJ1Ijoiam1jY3VsbG91Z2g0IiwiYSI6ImNtMGJvOXh3cDBjNncya3B4cDg0MXFuYnUifQ.uDJKnqE9WgkvGXYGLge-NQ"
)

RANCH_CENTER = {"lat": 36.7783, "lon": -119.4179}

CATTLE_COUNT = 50

BASE_CATTLE = [
    {
        "id": f"3S-{str(i).zfill(3)}",
        "name": f"Cow {i}",
        "weight": random.randint(900, 1200),
        "temperature": round(random.uniform(100.0, 102.5), 1),
        "vaccines": [
            {"name": "Bovine Respiratory", "date": "2023-11-14"},
            {"name": "Blackleg", "date": "2024-03-03"},
        ],
    }
    for i in range(1, CATTLE_COUNT + 1)
]


# Pre-calculate cattle positions - cluster majority and a few strays
random.seed(42)

CLUSTER_RADIUS = 0.01
STRAY_RADIUS = 0.05
STRAY_COUNT = 5

herd_positions: List[Dict[str, float]] = []
for idx, cattle in enumerate(BASE_CATTLE):
    if idx < CATTLE_COUNT - STRAY_COUNT:
        # clustered animals
        delta_lat = random.uniform(-CLUSTER_RADIUS, CLUSTER_RADIUS)
        delta_lon = random.uniform(-CLUSTER_RADIUS, CLUSTER_RADIUS)
    else:
        delta_lat = random.uniform(-STRAY_RADIUS, STRAY_RADIUS)
        delta_lon = random.uniform(-STRAY_RADIUS, STRAY_RADIUS)
    herd_positions.append(
        {
            "lat": RANCH_CENTER["lat"] + delta_lat,
            "lon": RANCH_CENTER["lon"] + delta_lon,
        }
    )

for cattle, position in zip(BASE_CATTLE, herd_positions):
    cattle.update(position)


GATES = [
    {
        "id": "North Gate",
        "status": "closed",
        "lat": RANCH_CENTER["lat"] + 0.02,
        "lon": RANCH_CENTER["lon"],
    },
    {
        "id": "South Gate",
        "status": "open",
        "lat": RANCH_CENTER["lat"] - 0.02,
        "lon": RANCH_CENTER["lon"] + 0.002,
    },
    {
        "id": "East Gate",
        "status": "closed",
        "lat": RANCH_CENTER["lat"] + 0.002,
        "lon": RANCH_CENTER["lon"] + 0.028,
    },
    {
        "id": "West Gate",
        "status": "closed",
        "lat": RANCH_CENTER["lat"] - 0.004,
        "lon": RANCH_CENTER["lon"] - 0.03,
    },
]

FENCE_POLYGON = [
    [RANCH_CENTER["lon"] - 0.04, RANCH_CENTER["lat"] - 0.03],
    [RANCH_CENTER["lon"] + 0.045, RANCH_CENTER["lat"] - 0.025],
    [RANCH_CENTER["lon"] + 0.05, RANCH_CENTER["lat"] + 0.028],
    [RANCH_CENTER["lon"] - 0.035, RANCH_CENTER["lat"] + 0.035],
    [RANCH_CENTER["lon"] - 0.04, RANCH_CENTER["lat"] - 0.03],
]


def _random_voltage() -> float:
    return round(random.uniform(6.5, 9.5), 2)


def _random_trough_level() -> float:
    return round(random.uniform(65, 100), 1)


def _network_strength() -> int:
    return random.randint(3, 5)


@app.post("/api/login")
def login(payload: Dict[str, str]):
    username = payload.get("username", "").strip().lower()
    password = payload.get("password", "")
    if username in USERS and password == PASSWORD:
        return {"status": "ok", "user": username}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.get("/api/sensors")
def sensors():
    water_level = _random_trough_level()
    fence_voltage = _random_voltage()
    gate_open = any(gate["status"] == "open" for gate in GATES)
    network = _network_strength()

    sensors_status = {
        "WATER": {
            "status": "green" if water_level > 70 else "yellow",
            "value": f"{water_level}%",
            "detail": f"Average trough level across 12 sensors is {water_level}% full."
            if water_level > 70
            else f"Refill recommended: trough levels down to {water_level}% across 12 monitoring points.",
        },
        "FENCE": {
            "status": "green" if fence_voltage >= 7.5 else "red",
            "value": f"{fence_voltage} kV",
            "detail": f"Perimeter electric fence holding steady at {fence_voltage} kV."
            if fence_voltage >= 7.5
            else f"Voltage dip detected: {fence_voltage} kV average across fence segments.",
        },
        "GATE": {
            "status": "green" if not gate_open else "yellow",
            "value": "open" if gate_open else "secured",
            "detail": "All four perimeter gates are secured."
            if not gate_open
            else "One or more perimeter gates currently open for ranch operations.",
        },
        "NETWORK": {
            "status": "green" if network >= 4 else "yellow",
            "value": network,
            "detail": f"Uplink strength is {network}/5 bars with redundant LTE failover armed.",
        },
    }
    overall_green = all(item["status"] == "green" for key, item in sensors_status.items())
    sensors_status["SYSTEM"] = {
        "status": "green" if overall_green else "yellow",
        "value": "nominal" if overall_green else "review",
        "detail": "Automation, analytics, and failovers are nominal across the ranch stack."
        if overall_green
        else "System automation engaged with advisories pending from sub-systems.",
    }
    return {"sensors": sensors_status}


@app.get("/api/herd")
def herd():
    # simulate slight movement
    herd_view = []
    for cow in BASE_CATTLE:
        jitter_lat = random.uniform(-0.0008, 0.0008)
        jitter_lon = random.uniform(-0.0008, 0.0008)
        herd_view.append({**cow, "lat": cow["lat"] + jitter_lat, "lon": cow["lon"] + jitter_lon})
    return {"herd": herd_view}


@app.get("/api/gates")
def gates():
    # Toggle one gate occasionally for simulation
    gate_to_toggle = random.choice(GATES)
    gate_to_toggle["status"] = "open" if gate_to_toggle["status"] == "closed" else "closed"
    return {"gates": GATES}


@app.get("/api/chute")
def chute():
    cow = random.choice(BASE_CATTLE)
    reading = {
        "id": cow["id"],
        "weight": cow["weight"] + random.randint(-15, 15),
        "temperature": round(cow["temperature"] + random.uniform(-0.4, 0.4), 1),
        "last_weighed": datetime.utcnow().isoformat() + "Z",
        "operator": random.choice(list(USERS)),
        "note": random.choice(
            [
                "Routine weight check",
                "Post-vaccine observation",
                "Health audit",
                "Hoof inspection",
            ]
        ),
    }
    return {"chute": reading}


@app.get("/api/cameras")
def cameras():
    detections = []
    for camera_id in range(1, 5):
        detections.append(
            {
                "camera": f"cam{camera_id}",
                "status": random.choice(["online", "online", "offline"]),
                "predator_detected": random.choice([False, False, False, True]),
                "location": random.choice([
                    "north pasture",
                    "feed station",
                    "south draw",
                    "equipment barn",
                ]),
            }
        )
    return {"cameras": detections}


@app.get("/api/config")
def config():
    token = (Path("/run/secrets/mapbox_token").read_text().strip() if Path("/run/secrets/mapbox_token").exists() else None)
    if token is None:
        token = os.getenv("MAPBOX_TOKEN")
    if not token:
        token = DEFAULT_MAPBOX_TOKEN
    return {
        "mapboxToken": token,
        "ranchCenter": RANCH_CENTER,
        "fence": {"coordinates": FENCE_POLYGON},
    }


@app.get("/", include_in_schema=False)
def index():
    if not INDEX_FILE.exists():
        raise HTTPException(status_code=500, detail="Dashboard assets missing")
    return FileResponse(INDEX_FILE)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app:app", host="0.0.0.0", port=8082, reload=True)
