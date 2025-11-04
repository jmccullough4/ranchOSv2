const loginOverlay = document.getElementById("login-overlay");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

const sensorBoard = document.getElementById("sensor-board");
const herdCount = document.getElementById("herd-count");
const herdStrays = document.getElementById("herd-strays");
const gateStatus = document.getElementById("gate-status");
const cowDetails = document.getElementById("cow-details");
const chuteEl = document.getElementById("chute");
const camerasEl = document.getElementById("cameras");

let map;
let cowMarkers = {};
let selectedCowId = null;
let mapboxToken = null;

async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

async function initMap() {
  if (!mapboxToken) {
    console.warn("Missing Mapbox token. Add MAPBOX_TOKEN environment variable or Docker secret.");
    return;
  }

  mapboxgl.accessToken = mapboxToken;
  map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/satellite-streets-v12",
    center: [-119.4179, 36.7783],
    zoom: 11,
    projection: "globe",
    pitch: 55,
    bearing: 20,
  });

  map.on("style.load", () => {
    map.setFog({ "range": [-1, 3], "color": "#152238", "high-color": "#245b7c" });
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });
    map.setTerrain({ source: "mapbox-dem", exaggeration: 1.4 });
  });
}

function renderSensors(payload) {
  sensorBoard.innerHTML = "";
  Object.entries(payload.sensors).forEach(([key, info]) => {
    const pill = document.createElement("div");
    pill.className = "sensor-pill";
    const status = document.createElement("span");
    status.className = `status-dot status-${info.status}`;
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = key;
    const value = document.createElement("span");
    value.className = "value";
    value.textContent = info.value;
    pill.append(status, label, value);
    sensorBoard.appendChild(pill);
  });
}

function renderGates(payload) {
  gateStatus.innerHTML = "";
  payload.gates.forEach((gate) => {
    const pill = document.createElement("div");
    pill.className = "gate-pill";
    const name = document.createElement("span");
    name.textContent = gate.id;
    const status = document.createElement("span");
    status.textContent = gate.status.toUpperCase();
    status.className = gate.status === "open" ? "status-yellow" : "status-green";
    pill.append(name, status);
    gateStatus.appendChild(pill);
  });
}

function renderCowDetails(cow) {
  const wrapper = document.createElement("div");
  wrapper.className = "details-content";

  const title = document.createElement("h3");
  title.textContent = `${cow.name} (${cow.id})`;

  const meta = document.createElement("div");
  meta.className = "cow-meta";
  meta.innerHTML = `
    <div class="meta-block"><span>Weight</span>${cow.weight} lbs</div>
    <div class="meta-block"><span>Temp</span>${cow.temperature}&deg;F</div>
    <div class="meta-block"><span>Latitude</span>${cow.lat.toFixed(4)}</div>
    <div class="meta-block"><span>Longitude</span>${cow.lon.toFixed(4)}</div>
  `;

  const vaccines = document.createElement("div");
  vaccines.innerHTML = "<h4>Vaccine Log</h4>";
  const list = document.createElement("ul");
  list.className = "vaccine-log";
  cow.vaccines.forEach((dose) => {
    const item = document.createElement("li");
    item.textContent = `${dose.name} • ${dose.date}`;
    list.appendChild(item);
  });
  vaccines.appendChild(list);

  wrapper.append(title, meta, vaccines);

  const container = cowDetails.querySelector(".details-content");
  if (container) {
    cowDetails.replaceChild(wrapper, container);
  } else {
    cowDetails.appendChild(wrapper);
  }
}

function resetCowDetails() {
  const placeholder = document.createElement("div");
  placeholder.className = "details-content empty";
  placeholder.textContent = "Select a cow on the globe to view details.";
  const current = cowDetails.querySelector(".details-content");
  if (current) {
    cowDetails.replaceChild(placeholder, current);
  } else {
    cowDetails.appendChild(placeholder);
  }
}

function updateMarkers(herd) {
  const strayThreshold = 0.03;
  const center = { lat: 36.7783, lon: -119.4179 };
  const computeDistance = (a, b) => {
    const dx = a.lon - b.lon;
    const dy = a.lat - b.lat;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const seen = new Set();
  herd.forEach((cow) => {
    seen.add(cow.id);
    const distance = computeDistance(cow, center);
    if (!cowMarkers[cow.id]) {
      const el = document.createElement("div");
      el.className = "cow-marker";
      el.dataset.id = cow.id;
      el.innerHTML = `<span>${cow.id.replace('3S-', '')}</span>`;
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        selectedCowId = cow.id;
        renderCowDetails(cow);
        highlightMarker(cow.id);
      });
      cowMarkers[cow.id] = {
        element: el,
        marker: new mapboxgl.Marker({ element: el }).setLngLat([cow.lon, cow.lat]).addTo(map),
      };
    } else {
      cowMarkers[cow.id].marker.setLngLat([cow.lon, cow.lat]);
    }
    cowMarkers[cow.id].element.classList.toggle("stray", distance > strayThreshold);
    if (selectedCowId === cow.id) {
      renderCowDetails(cow);
    }
  });

  Object.keys(cowMarkers).forEach((id) => {
    if (!seen.has(id)) {
      cowMarkers[id].marker.remove();
      delete cowMarkers[id];
    }
  });

  const strayCount = herd.filter((cow) => computeDistance(cow, center) > strayThreshold).length;
  herdCount.textContent = herd.length;
  herdStrays.textContent = strayCount;
}

function highlightMarker(id) {
  Object.values(cowMarkers).forEach(({ element }) => {
    element.classList.toggle("selected", element.dataset.id === id);
  });
}

function renderChute(payload) {
  chuteEl.innerHTML = `
    <div><span class="label">Tag</span><div class="value">${payload.chute.id}</div></div>
    <div><span class="label">Weight</span><div class="value">${payload.chute.weight} lbs</div></div>
    <div><span class="label">Temperature</span><div class="value">${payload.chute.temperature}&deg;F</div></div>
    <div><span class="label">Last Weighed</span><div class="value">${new Date(payload.chute.last_weighed).toLocaleString()}</div></div>
    <div><span class="label">Operator</span><div class="value">${payload.chute.operator}</div></div>
    <div><span class="label">Note</span><div class="value">${payload.chute.note}</div></div>
  `;
}

function renderCameras(payload) {
  camerasEl.innerHTML = "";
  payload.cameras.forEach((camera) => {
    const card = document.createElement("div");
    card.className = "camera-card";
    card.innerHTML = `
      <h3>${camera.camera.toUpperCase()}</h3>
      <p>Status: <strong>${camera.status}</strong></p>
      <p>Location: ${camera.location}</p>
      ${camera.predator_detected ? '<p class="predator-flag">Predator detected!</p>' : '<p>No threats.</p>'}
      <video controls muted loop preload="metadata" src="/media/cameras/${camera.camera}.mp4"></video>
    `;
    camerasEl.appendChild(card);
  });
}

async function hydrateDashboard() {
  try {
    const [sensors, herd, gates, chute, cameras] = await Promise.all([
      fetchJSON("/api/sensors"),
      fetchJSON("/api/herd"),
      fetchJSON("/api/gates"),
      fetchJSON("/api/chute"),
      fetchJSON("/api/cameras"),
    ]);
    renderSensors(sensors);
    renderGates(gates);
    if (map) {
      updateMarkers(herd.herd);
    }
    renderChute(chute);
    renderCameras(cameras);
  } catch (error) {
    console.error("Failed to hydrate dashboard", error);
  }
}

async function startPolling() {
  hydrateDashboard();
  setInterval(async () => {
    try {
      const data = await fetchJSON("/api/sensors");
      renderSensors(data);
    } catch (error) {
      console.error(error);
    }
  }, 5000);

  setInterval(async () => {
    if (!map) return;
    try {
      const herd = await fetchJSON("/api/herd");
      updateMarkers(herd.herd);
    } catch (error) {
      console.error(error);
    }
  }, 7000);

  setInterval(async () => {
    try {
      const gates = await fetchJSON("/api/gates");
      renderGates(gates);
    } catch (error) {
      console.error(error);
    }
  }, 8000);

  setInterval(async () => {
    try {
      const chute = await fetchJSON("/api/chute");
      renderChute(chute);
    } catch (error) {
      console.error(error);
    }
  }, 6000);

  setInterval(async () => {
    try {
      const cameras = await fetchJSON("/api/cameras");
      renderCameras(cameras);
    } catch (error) {
      console.error(error);
    }
  }, 10000);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const payload = Object.fromEntries(formData.entries());
  try {
    const response = await fetchJSON("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    loginOverlay.classList.add("hidden");
    document.body.classList.add("authenticated");
    selectedCowId = null;
    resetCowDetails();

    if (!map) {
      try {
        const config = await fetchJSON("/api/config");
        mapboxToken = config.mapboxToken;
        await initMap();
      } catch (error) {
        console.error("Failed to configure map", error);
      }
    }

    startPolling();
  } catch (error) {
    loginError.textContent = "Invalid credentials. Try again.";
  }
});

window.addEventListener("load", resetCowDetails);

