const STORAGE_KEY = "expressx-shipments";
const ADMIN_KEY = "expressx-admin-auth";
const PASS_PHRASE = "expressx-admin";

const STATUS_ORDER = [
  "Created",
  "In Transit",
  "At Destination",
  "Out for Delivery",
  "Delivered",
  "Exception"
];

const elements = {
  form: document.getElementById("trackForm"),
  trackingInput: document.getElementById("trackingInput"),
  resultTracking: document.getElementById("resultTracking"),
  resultStatus: document.getElementById("resultStatus"),
  resultDestination: document.getElementById("resultDestination"),
  resultEta: document.getElementById("resultEta"),
  resultLocation: document.getElementById("resultLocation"),
  progressBar: document.getElementById("progressBar"),
  timeline: document.getElementById("timeline"),
  inTransitCount: document.getElementById("inTransitCount"),
  outForDeliveryCount: document.getElementById("outForDeliveryCount"),
  deliveredCount: document.getElementById("deliveredCount"),
  laneList: document.getElementById("laneList"),
  refreshSeed: document.getElementById("refreshSeed"),
  openAdmin: document.getElementById("openAdmin"),
  createCTA: document.getElementById("createCTA"),
  closeAdmin: document.getElementById("closeAdmin"),
  adminDrawer: document.getElementById("adminDrawer"),
  scrim: document.getElementById("scrim"),
  authForm: document.getElementById("authForm"),
  adminPass: document.getElementById("adminPass"),
  adminAuth: document.getElementById("adminAuth"),
  adminBody: document.getElementById("adminBody"),
  createForm: document.getElementById("createForm"),
  adminList: document.getElementById("adminList")
};

let shipments = [];

init();

function init() {
  shipments = loadShipments();
  renderStats();
  renderLaneList();
  wireEvents();
}

function wireEvents() {
  elements.form.addEventListener("submit", handleTrack);
  elements.refreshSeed.addEventListener("click", resetSeed);
  elements.openAdmin.addEventListener("click", openDrawer);
  elements.createCTA.addEventListener("click", openDrawer);
  elements.closeAdmin.addEventListener("click", closeDrawer);
  elements.scrim.addEventListener("click", closeDrawer);
  elements.authForm.addEventListener("submit", handleAuth);
  elements.createForm.addEventListener("submit", handleCreate);
  renderAdminList();
  if (localStorage.getItem(ADMIN_KEY) === "true") unlockAdmin();
}

function handleTrack(e) {
  e.preventDefault();
  const id = elements.trackingInput.value.trim();
  if (!id) return;
  const shipment = shipments.find((s) => s.tracking.toLowerCase() === id.toLowerCase());
  if (!shipment) {
    renderNotFound(id);
    return;
  }
  renderResult(shipment);
}

function renderResult(shipment) {
  elements.resultTracking.textContent = shipment.tracking;
  elements.resultStatus.textContent = shipment.status;
  elements.resultDestination.textContent = shipment.destination;
  elements.resultEta.textContent = formatDate(shipment.eta);
  elements.resultLocation.textContent = shipment.location || "—";
  setStatusChip(elements.resultStatus, shipment.status);

  const statusIndex = STATUS_ORDER.indexOf(shipment.status);
  const pct = statusIndex >= 0 ? (statusIndex / (STATUS_ORDER.length - 1)) * 100 : 20;
  elements.progressBar.style.width = `${pct}%`;

  renderTimeline(shipment.events);
}

function renderTimeline(events = []) {
  if (!events.length) {
    elements.timeline.innerHTML = `<p class="muted">No events yet.</p>`;
    return;
  }
  const html = events
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .map(
      (ev) => `
      <div class="event">
        <span class="dot"></span>
        <div class="body">
          <p class="title">${ev.title}</p>
          <p class="meta">${formatDateTime(ev.time)} • ${ev.location}${ev.note ? " — " + ev.note : ""}</p>
        </div>
      </div>
    `
    )
    .join("");
  elements.timeline.innerHTML = html;
}

function renderNotFound(id) {
  elements.resultTracking.textContent = id;
  elements.resultStatus.textContent = "Not found";
  elements.resultDestination.textContent = "—";
  elements.resultEta.textContent = "—";
  elements.resultLocation.textContent = "—";
  setStatusChip(elements.resultStatus, "Exception");
  elements.progressBar.style.width = "12%";
  elements.timeline.innerHTML = `<p class="muted">We couldn't find this tracking number. Check the number or ask an admin to create it.</p>`;
}

function renderStats() {
  const inTransit = shipments.filter((s) => s.status === "In Transit").length;
  const ofd = shipments.filter((s) => s.status === "Out for Delivery").length;
  const delivered = shipments.filter((s) => s.status === "Delivered").length;
  elements.inTransitCount.textContent = inTransit;
  elements.outForDeliveryCount.textContent = ofd;
  elements.deliveredCount.textContent = delivered;
}

function renderLaneList() {
  const sorted = [...shipments].sort((a, b) => new Date(b.eta) - new Date(a.eta));
  elements.laneList.innerHTML = sorted
    .slice(0, 4)
    .map(
      (s) => `
      <div class="lane">
        <div>
          <strong>${s.origin} → ${s.destination}</strong>
          <div class="meta">${s.tracking} • ETA ${formatDate(s.eta)}</div>
        </div>
        <span class="badge ${s.status === "Delivered" ? "idle" : "live"}">${s.status}</span>
      </div>
    `
    )
    .join("");
}

function openDrawer() {
  elements.adminDrawer.classList.add("open");
  elements.scrim.classList.add("show");
}
function closeDrawer() {
  elements.adminDrawer.classList.remove("open");
  elements.scrim.classList.remove("show");
}

function handleAuth(e) {
  e.preventDefault();
  if (elements.adminPass.value === PASS_PHRASE) {
    unlockAdmin();
    localStorage.setItem(ADMIN_KEY, "true");
    elements.adminPass.value = "";
  } else {
    alert("Incorrect passphrase. Hint: expressx-admin");
  }
}

function unlockAdmin() {
  elements.adminAuth.classList.add("hidden");
  elements.adminBody.classList.remove("hidden");
}

function handleCreate(e) {
  e.preventDefault();
  const form = new FormData(elements.createForm);
  const payload = Object.fromEntries(form.entries());
  const existing = shipments.find((s) => s.tracking.toLowerCase() === payload.tracking.toLowerCase());
  const event = {
    title: payload.status,
    location: payload.location,
    note: payload.note || "",
    time: new Date().toISOString()
  };

  if (existing) {
    Object.assign(existing, {
      recipient: payload.recipient,
      origin: payload.origin,
      destination: payload.destination,
      eta: payload.eta,
      status: payload.status,
      location: payload.location
    });
    existing.events.unshift(event);
  } else {
    shipments.unshift({
      tracking: payload.tracking,
      recipient: payload.recipient,
      origin: payload.origin,
      destination: payload.destination,
      eta: payload.eta,
      status: payload.status,
      location: payload.location,
      events: [event]
    });
  }

  saveShipments();
  renderStats();
  renderLaneList();
  renderAdminList();
  renderResult(existing || shipments[0]);
  elements.createForm.reset();
}

function renderAdminList() {
  if (!shipments.length) {
    elements.adminList.innerHTML = `<p class="muted">No shipments yet.</p>`;
    return;
  }
  elements.adminList.innerHTML = shipments
    .map(
      (s) => `
      <div class="list-item">
        <strong>${s.tracking}</strong>
        <div class="mini">${s.origin} → ${s.destination} • ETA ${formatDate(s.eta)}</div>
        <div class="mini">Status: ${s.status} @ ${s.location || "—"}</div>
        <button class="ghost-btn small" data-track="${s.tracking}">Quick update</button>
      </div>
    `
    )
    .join("");

  elements.adminList.querySelectorAll("button[data-track]").forEach((btn) => {
    btn.addEventListener("click", () => quickUpdate(btn.dataset.track));
  });
}

function quickUpdate(tracking) {
  const shipment = shipments.find((s) => s.tracking === tracking);
  if (!shipment) return;
  const status = prompt("New status (Created / In Transit / At Destination / Out for Delivery / Delivered / Exception):", shipment.status);
  if (!status) return;
  const location = prompt("Current location:", shipment.location || "");
  const note = prompt("Note:", "");
  shipment.status = status;
  shipment.location = location;
  shipment.events.unshift({
    title: status,
    location,
    note,
    time: new Date().toISOString()
  });
  saveShipments();
  renderStats();
  renderLaneList();
  renderAdminList();
  renderResult(shipment);
}

function resetSeed() {
  shipments = seedData();
  saveShipments();
  renderStats();
  renderLaneList();
  renderTimeline(shipments[0].events);
  renderResult(shipments[0]);
}

function loadShipments() {
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (fromStorage) {
    try {
      return JSON.parse(fromStorage);
    } catch (err) {
      console.warn("Unable to parse stored shipments", err);
    }
  }
  const seeded = seedData();
  saveShipments(seeded);
  return seeded;
}

function saveShipments(data = shipments) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function seedData() {
  return [
    {
      tracking: "EXX123456789US",
      recipient: "Taylor Reed",
      origin: "Memphis SuperHub",
      destination: "Seattle, WA",
      eta: futureDate(2),
      status: "Out for Delivery",
      location: "Seattle - North Station",
      events: [
        { title: "Out for Delivery", location: "Seattle - North Station", note: "Courier assigned", time: isoHoursAgo(2) },
        { title: "At Destination", location: "Seattle, WA", note: "Arrived at destination ramp", time: isoHoursAgo(8) },
        { title: "In Transit", location: "Oakland, CA", note: "Linehaul scanned", time: isoHoursAgo(24) },
        { title: "Created", location: "Memphis SuperHub", note: "Label generated", time: isoHoursAgo(32) }
      ]
    },
    {
      tracking: "EXX987654321US",
      recipient: "Brooklyn Chavez",
      origin: "Newark, NJ",
      destination: "Austin, TX",
      eta: futureDate(3),
      status: "In Transit",
      location: "Louisville, KY",
      events: [
        { title: "In Transit", location: "Louisville, KY", note: "Departed ramp", time: isoHoursAgo(5) },
        { title: "Created", location: "Newark, NJ", note: "Picked up", time: isoHoursAgo(18) }
      ]
    },
    {
      tracking: "EXX555222888CA",
      recipient: "Noah Singh",
      origin: "Toronto, ON",
      destination: "Vancouver, BC",
      eta: futureDate(1),
      status: "Delivered",
      location: "Vancouver, BC",
      events: [
        { title: "Delivered", location: "Vancouver, BC", note: "Signed by S. Patel", time: isoHoursAgo(1) },
        { title: "Out for Delivery", location: "Vancouver - South Depot", note: "Vehicle loaded", time: isoHoursAgo(5) },
        { title: "At Destination", location: "Vancouver, BC", note: "Arrived destination sort", time: isoHoursAgo(10) },
        { title: "In Transit", location: "Calgary, AB", note: "Linehaul scan", time: isoHoursAgo(22) },
        { title: "Created", location: "Toronto, ON", note: "Shipment created", time: isoHoursAgo(30) }
      ]
    }
  ];
}

function setStatusChip(el, status) {
  el.classList.remove("exception");
  if (status === "Exception" || status === "Not found") {
    el.style.background = "rgba(255,99,132,0.18)";
    el.style.color = "#ffc8d6";
  } else {
    el.style.background = "rgba(255,255,255,0.08)";
    el.style.color = "#fff";
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
function isoHoursAgo(hours) {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}
