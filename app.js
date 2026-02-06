const STORAGE_KEY = "expressx-shipments";
const PICKUP_KEY = "expressx-pickups";
const NOTIFY_KEY = "expressx-notify";
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

const LOCATIONS = [
  { name: "ExpressX Hub - Memphis SuperHub", city: "Memphis", zip: "38118", type: "Hub", hours: "24/7" },
  { name: "ExpressX ShipCenter - Seattle North", city: "Seattle", zip: "98109", type: "ShipCenter", hours: "8a-8p" },
  { name: "ExpressX Office - Austin Domain", city: "Austin", zip: "78758", type: "Office", hours: "9a-7p" },
  { name: "ExpressX OnSite - Brooklyn Atlantic", city: "Brooklyn", zip: "11217", type: "OnSite", hours: "9a-9p" },
  { name: "ExpressX ShipCenter - Vancouver South", city: "Vancouver", zip: "V5X", type: "ShipCenter", hours: "8a-6p" },
  { name: "ExpressX Office - Toronto West", city: "Toronto", zip: "M5V", type: "Office", hours: "9a-7p" }
];

const elements = {
  form: document.getElementById("trackForm"),
  trackingInput: document.getElementById("trackingInput"),
  trackingMulti: document.getElementById("trackingMulti"),
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
  multiList: document.getElementById("multiList"),
  refreshLane: document.getElementById("refreshLane"),
  resetSeed: document.getElementById("resetSeed"),
  refreshSeed: document.getElementById("refreshSeed"),
  rateForm: document.getElementById("rateForm"),
  rateOrigin: document.getElementById("rateOrigin"),
  rateDest: document.getElementById("rateDest"),
  rateWeight: document.getElementById("rateWeight"),
  rateService: document.getElementById("rateService"),
  ratePrice: document.getElementById("ratePrice"),
  rateEta: document.getElementById("rateEta"),
  pickupForm: document.getElementById("pickupForm"),
  pickupName: document.getElementById("pickupName"),
  pickupAddr: document.getElementById("pickupAddr"),
  pickupDate: document.getElementById("pickupDate"),
  pickupWindow: document.getElementById("pickupWindow"),
  pickupList: document.getElementById("pickupList"),
  holdForm: document.getElementById("holdForm"),
  holdTracking: document.getElementById("holdTracking"),
  holdLocation: document.getElementById("holdLocation"),
  instructionForm: document.getElementById("instructionForm"),
  instTracking: document.getElementById("instTracking"),
  instNote: document.getElementById("instNote"),
  returnForm: document.getElementById("returnForm"),
  returnTracking: document.getElementById("returnTracking"),
  returnEmail: document.getElementById("returnEmail"),
  manageFeed: document.getElementById("manageFeed"),
  locForm: document.getElementById("locForm"),
  locQuery: document.getElementById("locQuery"),
  locList: document.getElementById("locList"),
  notifyForm: document.getElementById("notifyForm"),
  notifyTracking: document.getElementById("notifyTracking"),
  notifyEmail: document.getElementById("notifyEmail"),
  notifyPhone: document.getElementById("notifyPhone"),
  notifyList: document.getElementById("notifyList"),
  openAdmin: document.getElementById("openAdmin"),
  createCTA: document.getElementById("createCTA"),
  actionCreate: document.getElementById("actionCreate"),
  scrollPickup: document.getElementById("scrollPickup"),
  scrollHold: document.getElementById("scrollHold"),
  scrollInstructions: document.getElementById("scrollInstructions"),
  scrollNotify: document.getElementById("scrollNotify"),
  makeReturn: document.getElementById("makeReturn"),
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
let pickups = [];
let notifications = [];
let manageEvents = [];
let map;
let markerLayer;

init();

function init() {
  shipments = loadShipments();
  pickups = loadJson(PICKUP_KEY, []);
  notifications = loadJson(NOTIFY_KEY, []);

  renderStats();
  renderLaneList();
  renderMultiList();
  renderPickups();
  renderNotifications();
  renderLocations(LOCATIONS);
  initMap();
  wireEvents();
}

function wireEvents() {
  elements.form.addEventListener("submit", handleTrack);
  elements.refreshLane.addEventListener("click", () => renderLaneList());
  elements.resetSeed.addEventListener("click", resetSeed);
  elements.refreshSeed.addEventListener("click", resetSeed);

  elements.rateForm.addEventListener("submit", handleRate);

  elements.pickupForm.addEventListener("submit", handlePickup);
  elements.holdForm.addEventListener("submit", handleHold);
  elements.instructionForm.addEventListener("submit", handleInstruction);
  elements.returnForm.addEventListener("submit", handleReturn);

  elements.locForm.addEventListener("submit", handleLocationSearch);
  elements.notifyForm.addEventListener("submit", handleNotify);

  elements.openAdmin.addEventListener("click", openDrawer);
  elements.createCTA.addEventListener("click", openDrawer);
  elements.actionCreate.addEventListener("click", openDrawer);
  elements.closeAdmin.addEventListener("click", closeDrawer);
  elements.scrim.addEventListener("click", closeDrawer);
  elements.authForm.addEventListener("submit", handleAuth);
  elements.createForm.addEventListener("submit", handleCreate);

  elements.scrollPickup.addEventListener("click", () => scrollToId("pickup"));
  elements.scrollHold.addEventListener("click", () => scrollToId("manage"));
  elements.scrollInstructions.addEventListener("click", () => scrollToId("manage"));
  elements.scrollNotify.addEventListener("click", () => scrollToId("locations"));
  elements.makeReturn.addEventListener("click", () => scrollToId("manage"));

  if (localStorage.getItem(ADMIN_KEY) === "true") unlockAdmin();
}

function handleTrack(e) {
  e.preventDefault();
  const single = elements.trackingInput.value.trim();
  const multi = elements.trackingMulti.value.trim();

  if (single) {
    const shipment = findShipment(single);
    shipment ? renderResult(shipment) : renderNotFound(single);
  }

  if (multi) {
    const ids = multi.split(",").map((s) => s.trim()).filter(Boolean);
    renderMultiList(ids.map(findShipment).filter(Boolean), ids);
  }
}

function findShipment(id) {
  return shipments.find((s) => s.tracking.toLowerCase() === id.toLowerCase());
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
  updateMapMarkers();
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
    .slice(0, 5)
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

function renderMultiList(list = shipments, ids) {
  const html = list
    .map(
      (s) => `
      <div class="list-item">
        <strong>${s.tracking}</strong>
        <div class="mini">Dest: ${s.destination} • Status: ${s.status} • ETA ${formatDate(s.eta)}</div>
      </div>
    `
    )
    .join("");
  elements.multiList.innerHTML = html || `<p class="muted">No matches${ids ? " for " + ids.join(", ") : ""}.</p>`;
  updateMapMarkers();
}

function handleRate(e) {
  e.preventDefault();
  const origin = elements.rateOrigin.value.trim();
  const dest = elements.rateDest.value.trim();
  const weight = parseFloat(elements.rateWeight.value) || 0;
  const service = elements.rateService.value;
  const quote = computeRate(origin, dest, weight, service);
  elements.ratePrice.textContent = `$${quote.price.toFixed(2)}`;
  elements.rateEta.textContent = quote.eta;
}

function computeRate(origin, dest, weight, service) {
  const zone = origin.slice(0, 3).toUpperCase() === dest.slice(0, 3).toUpperCase() ? 2 : 5;
  const base = service === "Priority Overnight" ? 24 : service === "2Day" ? 14 : 8;
  const factor = service === "Priority Overnight" ? 1.2 : service === "2Day" ? 0.9 : 0.65;
  const price = base + weight * factor + zone * 0.7;
  const days = service === "Priority Overnight" ? 1 : service === "2Day" ? 2 : 5;
  return {
    price,
    eta: `Est. transit: ${days}-${days + 1} business days`
  };
}

function handlePickup(e) {
  e.preventDefault();
  const item = {
    name: elements.pickupName.value,
    addr: elements.pickupAddr.value,
    date: elements.pickupDate.value,
    window: elements.pickupWindow.value
  };
  pickups.unshift(item);
  saveJson(PICKUP_KEY, pickups);
  renderPickups();
  addManageEvent(`Pickup scheduled for ${item.date} at ${item.window}`, item.addr);
  elements.pickupForm.reset();
}

function renderPickups() {
  if (!pickups.length) {
    elements.pickupList.innerHTML = `<p class="muted">No pickups scheduled.</p>`;
    return;
  }
  elements.pickupList.innerHTML = pickups
    .slice(0, 5)
    .map((p) => `<div class="mini-item">Pickup ${p.date} (${p.window}) — ${p.addr} • ${p.name}</div>`)
    .join("");
}

function handleHold(e) {
  e.preventDefault();
  const track = elements.holdTracking.value.trim();
  const loc = elements.holdLocation.value.trim();
  const shipment = findShipment(track);
  if (!shipment) return alert("Tracking not found.");
  shipment.status = "Exception";
  shipment.location = `Hold at ${loc}`;
  shipment.events.unshift({ title: "Hold at Location", location: loc, note: "Customer requested hold", time: new Date().toISOString() });
  saveShipments();
  renderResult(shipment);
  renderLaneList();
  updateMapMarkers();
  addManageEvent(`Hold at location set for ${track}`, loc);
  elements.holdForm.reset();
}

function handleInstruction(e) {
  e.preventDefault();
  const track = elements.instTracking.value.trim();
  const note = elements.instNote.value.trim();
  const shipment = findShipment(track);
  if (!shipment) return alert("Tracking not found.");
  shipment.events.unshift({ title: "Delivery Instructions", location: shipment.location || shipment.destination, note, time: new Date().toISOString() });
  saveShipments();
  renderResult(shipment);
  addManageEvent(`Instructions added for ${track}`, note);
  elements.instructionForm.reset();
}

function handleReturn(e) {
  e.preventDefault();
  const track = elements.returnTracking.value.trim();
  const email = elements.returnEmail.value.trim();
  const shipment = findShipment(track);
  if (!shipment) return alert("Tracking not found.");
  shipment.events.unshift({ title: "Return Label Sent", location: shipment.destination, note: `Sent to ${email}`, time: new Date().toISOString() });
  saveShipments();
  renderResult(shipment);
  updateMapMarkers();
  addManageEvent(`Return label sent for ${track}`, email);
  elements.returnForm.reset();
}

function handleLocationSearch(e) {
  e.preventDefault();
  const query = elements.locQuery.value.trim().toLowerCase();
  if (!query) return renderLocations(LOCATIONS);
  const matches = LOCATIONS.filter((loc) => loc.city.toLowerCase().includes(query) || loc.zip.toLowerCase().includes(query));
  renderLocations(matches);
}

function renderLocations(list) {
  elements.locList.innerHTML =
    list
      .map(
        (l) => `
      <div class="list-item">
        <strong>${l.name}</strong>
        <div class="mini">${l.city} ${l.zip} • ${l.type} • Hours ${l.hours}</div>
      </div>
    `
      )
      .join("") || `<p class="muted">No locations match.</p>`;
}

function handleNotify(e) {
  e.preventDefault();
  const item = {
    tracking: elements.notifyTracking.value.trim(),
    email: elements.notifyEmail.value.trim(),
    phone: elements.notifyPhone.value.trim()
  };
  notifications.unshift(item);
  saveJson(NOTIFY_KEY, notifications);
  renderNotifications();
  addManageEvent(`Alerts set for ${item.tracking || "all shipments"}`, item.email || item.phone);
  elements.notifyForm.reset();
}

function renderNotifications() {
  if (!notifications.length) {
    elements.notifyList.innerHTML = `<p class="muted">No notification rules.</p>`;
    return;
  }
  elements.notifyList.innerHTML = notifications
    .slice(0, 5)
    .map(
      (n) => `<div class="mini-item">Alerts: ${n.tracking || "All"} → ${n.email}${n.phone ? " / " + n.phone : ""}</div>`
    )
    .join("");
}

function addManageEvent(title, detail) {
  manageEvents.unshift({ title, detail, time: new Date().toISOString() });
  elements.manageFeed.innerHTML = manageEvents
    .slice(0, 5)
    .map((m) => `<div class="mini-item">${formatDateTime(m.time)} — ${m.title}${m.detail ? " • " + m.detail : ""}</div>`)
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
  const sendEmail = form.get("sendEmail") === "on";
  const existing = findShipment(payload.tracking);
  const event = {
    title: payload.status,
    location: payload.location,
    note: payload.note || "",
    time: new Date().toISOString()
  };

  if (existing) {
    Object.assign(existing, {
      recipient: payload.recipient,
      recipientEmail: payload.email,
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
      recipientEmail: payload.email,
      origin: payload.origin,
      destination: payload.destination,
      eta: payload.eta,
      status: payload.status,
      location: payload.location,
      events: [event]
    });
  }

  if (sendEmail) {
    sendTrackingEmail(payload.tracking, payload.email, payload.destination);
  }

  saveShipments();
  renderStats();
  renderLaneList();
  renderMultiList();
  renderAdminList();
  renderResult(existing || shipments[0]);
  updateMapMarkers();
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
        <div class="mini">Recipient: ${s.recipient || "—"} • ${s.recipientEmail || "no email"}</div>
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
  const shipment = findShipment(tracking);
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
  renderMultiList();
  renderAdminList();
  renderResult(shipment);
  updateMapMarkers();
}

function resetSeed() {
  shipments = seedData();
  saveShipments();
  renderStats();
  renderLaneList();
  renderTimeline(shipments[0].events);
  renderResult(shipments[0]);
  renderMultiList();
  updateMapMarkers();
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

function initMap() {
  const mapContainer = document.getElementById("liveMap");
  if (!mapContainer || typeof L === "undefined") return;
  map = L.map("liveMap", { zoomControl: false }).setView([39.5, -98.35], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  updateMapMarkers();
  setInterval(updateMapMarkers, 10000);
}

function updateMapMarkers() {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  const points = [];
  shipments.forEach((s) => {
    const coords = guessCoords(s.location || s.destination || s.origin);
    if (!coords) return;
    const marker = L.circleMarker(coords, {
      radius: 7,
      color: s.status === "Delivered" ? "#9be28a" : "#ff6600",
      fillOpacity: 0.85,
      weight: 2
    }).bindPopup(`<strong>${s.tracking}</strong><br>${s.status}<br>${s.location || s.destination}`);
    marker.addTo(markerLayer);
    points.push(coords);
  });
  if (points.length) {
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.2), { animate: true });
  }
}

const CITY_COORDS = {
  memphis: [35.0456, -89.98],
  seattle: [47.6062, -122.3321],
  oakland: [37.8044, -122.2711],
  newark: [40.7357, -74.1724],
  austin: [30.2672, -97.7431],
  louisville: [38.2527, -85.7585],
  toronto: [43.6532, -79.3832],
  vancouver: [49.2827, -123.1207],
  los: [34.0522, -118.2437],
  angeles: [34.0522, -118.2437],
  denver: [39.7392, -104.9903],
  phoenix: [33.4484, -112.074],
  calgary: [51.0447, -114.0719],
  brooklyn: [40.6782, -73.9442]
};

function guessCoords(text = "") {
  const lower = text.toLowerCase();
  const key = Object.keys(CITY_COORDS).find((k) => lower.includes(k));
  if (key) return CITY_COORDS[key];
  const lat = 25 + Math.random() * 24;
  const lng = -124 + Math.random() * 57;
  return [lat, lng];
}

function sendTrackingEmail(tracking, email, destination) {
  if (!email) return;
  const subject = encodeURIComponent(`Your ExpressX tracking number ${tracking}`);
  const body = encodeURIComponent(
    `Hi,\n\nYour shipment is on the way.\nTracking: ${tracking}\nDestination: ${destination || "—"}\nTrack here: ${location.href} (enter the number on the page)\n\nThank you,\nExpressX`
  );
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  const a = document.createElement("a");
  a.href = mailto;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (err) {
    return fallback;
  }
}

function saveJson(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function seedData() {
  return [
    {
      tracking: "EXX123456789US",
      recipient: "Taylor Reed",
      recipientEmail: "taylor@example.com",
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
      recipientEmail: "brooklyn@example.com",
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
      recipientEmail: "noah@example.com",
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
    },
    {
      tracking: "EXX741852963US",
      recipient: "Imani Scott",
      recipientEmail: "imani@example.com",
      origin: "Los Angeles, CA",
      destination: "Denver, CO",
      eta: futureDate(4),
      status: "In Transit",
      location: "Phoenix, AZ",
      events: [
        { title: "In Transit", location: "Phoenix, AZ", note: "Linehaul scanned", time: isoHoursAgo(7) },
        { title: "Created", location: "Los Angeles, CA", note: "Label generated", time: isoHoursAgo(16) }
      ]
    }
  ];
}

function setStatusChip(el, status) {
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

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
