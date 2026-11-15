#!/usr/bin/env node
// Seeds a spread of live shipments around the world, timed relative to *now*, so the map is
// busy whenever you run it. Safe to re-run: the same tracking numbers are overwritten.
//
//   API_BASE=https://api.supportupgrade.com ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-world.js
//
// Each entry says which phase the shipment should be in right now; the departure time is
// back-calculated from the same motion model the server uses to play it forward.

const { buildPlan } = require("../lib/api/_motion");
const { geocode } = require("../lib/api/_geo");

const API_BASE = (process.env.API_BASE || "http://127.0.0.1:4180").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

const H = 3600 * 1000;

// `at` is where the shipment is right now:
//   { move: 0.4 }   40% along its moving leg
//   { stage: "processing" | "customs" | "last-mile" | "delivered", into: 0..1 }
const SHIPMENTS = [
  // Continental road freight
  { id: "TRK-NYC-001", from: "New York, NY", to: "Boston, MA", mode: "ground", at: { move: 0.55 }, name: "Harbor Books" },
  { id: "TRK-LA-002", from: "Los Angeles, CA", to: "San Francisco, CA", mode: "ground", at: { stage: "last-mile", into: 0.4 }, name: "Pacific Ceramics" },
  { id: "TRK-CHI-003", from: "Chicago, IL", to: "Denver, CO", mode: "ground", at: { move: 0.7 }, name: "Prairie Foods" },
  { id: "TRK-MIA-004", from: "Miami, FL", to: "Atlanta, GA", mode: "ground", at: { stage: "delivered", into: 3 }, name: "Gulf Textiles" },
  { id: "TRK-SEA-005", from: "Seattle, WA", to: "Portland, OR", mode: "ground", at: { stage: "processing", into: 0.4 }, name: "Cascade Outdoor" },

  // Intercontinental air
  { id: "TRK-LOS-101", from: "Lagos, Nigeria", to: "London, United Kingdom", mode: "air", at: { move: 0.45 }, name: "Adire House" },
  { id: "TRK-SHA-102", from: "Shanghai, China", to: "Los Angeles, CA", mode: "express", at: { move: 0.3 }, name: "Lumen Electronics" },
  { id: "TRK-DXB-103", from: "Dubai, UAE", to: "Sydney, Australia", mode: "air", at: { move: 0.6 }, name: "Gulf Jewellers" },
  { id: "TRK-NBO-104", from: "Nairobi, Kenya", to: "Frankfurt, Germany", mode: "air", at: { move: 0.82 }, name: "Rift Valley Flowers" },
  { id: "TRK-GRU-105", from: "Sao Paulo, Brazil", to: "Miami, FL", mode: "express", at: { move: 0.5 }, name: "Verde Coffee" },
  { id: "TRK-SIN-106", from: "Singapore", to: "Amsterdam, Netherlands", mode: "air", at: { move: 0.2 }, name: "Orchid Labs" },
  { id: "TRK-JNB-107", from: "Johannesburg, South Africa", to: "Dubai, UAE", mode: "express", at: { stage: "customs", into: 0.5 }, name: "Kgosi Mining Supply" },
  { id: "TRK-TYO-108", from: "Tokyo, Japan", to: "San Francisco, CA", mode: "express", at: { move: 0.86 }, name: "Kanto Precision" },
  { id: "TRK-DEL-109", from: "Delhi, India", to: "Toronto, ON", mode: "air", at: { move: 0.35 }, name: "Saffron Exports" },
  { id: "TRK-CAI-110", from: "Cairo, Egypt", to: "Istanbul, Turkey", mode: "express", at: { stage: "last-mile", into: 0.5 }, name: "Nile Linens" },
  { id: "TRK-ACC-111", from: "Accra, Ghana", to: "New York, NY", mode: "air", at: { stage: "processing", into: 0.7 }, name: "Gold Coast Cocoa" },
  { id: "TRK-SYD-112", from: "Sydney, Australia", to: "Singapore", mode: "air", at: { stage: "delivered", into: 2 }, name: "Southern Wool" },
  { id: "TRK-MEX-113", from: "Mexico City, Mexico", to: "Madrid, Spain", mode: "air", at: { move: 0.55 }, name: "Azteca Silver" },
  { id: "TRK-HKG-114", from: "Hong Kong", to: "Dubai, UAE", mode: "express", at: { move: 0.7 }, name: "Victoria Watches" },
  { id: "TRK-LHR-115", from: "London, United Kingdom", to: "Cape Town, South Africa", mode: "air", at: { move: 0.12 }, name: "Thames Pharma" },
  { id: "TRK-LIM-116", from: "Lima, Peru", to: "Paris, France", mode: "air", at: { move: 0.4 }, name: "Andes Alpaca" },
  { id: "TRK-BOM-117", from: "Mumbai, India", to: "Nairobi, Kenya", mode: "express", at: { move: 0.65 }, name: "Konkan Spices" }
];

async function api(path, options = {}, cookie) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...(options.headers || {}) }
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_error) {
    // non-JSON body
  }
  if (!response.ok) throw new Error(`${path} -> HTTP ${response.status} ${data.error || text.slice(0, 120)}`);
  return { data, response };
}

function departureFor(plan, at) {
  const now = Date.now();
  if (at.move !== undefined) return now - (plan.moveStart - plan.departed) - at.move * (plan.moveEnd - plan.moveStart);

  const into = at.into ?? 0.5;
  if (at.stage === "processing") return now - into * (plan.moveStart - plan.departed);
  if (at.stage === "customs") return now - (plan.moveEnd - plan.departed) - into * (plan.customsEnd - plan.moveEnd);
  if (at.stage === "last-mile") return now - (plan.customsEnd - plan.departed) - into * (plan.delivered - plan.customsEnd);
  if (at.stage === "delivered") return now - (plan.delivered - plan.departed) - into * H;
  throw new Error(`Unknown position: ${JSON.stringify(at)}`);
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (and API_BASE if not running on the API host).");
    process.exit(1);
  }

  const login = await api("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const setCookie = login.response.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0];
  if (!cookie) throw new Error("Login did not return a session cookie.");

  for (const item of SHIPMENTS) {
    const origin = await geocode(item.from);
    const destination = await geocode(item.to);
    if (!origin || !destination) throw new Error(`Cannot place ${item.from} or ${item.to}`);

    const plan = buildPlan({ mode: item.mode, departedAt: new Date().toISOString(), origin, destination });
    const departedAt = new Date(departureFor(plan, item.at)).toISOString();

    const { data } = await api(
      "/api/admin/upsert",
      {
        method: "POST",
        body: JSON.stringify({
          shipment: {
            trackingNumber: item.id,
            status: "in_transit",
            origin: item.from,
            destination: item.to,
            originLat: origin.lat,
            originLng: origin.lng,
            destinationLat: destination.lat,
            destinationLng: destination.lng,
            lastLocation: item.from,
            customerName: item.name,
            transportMode: item.mode,
            departedAt,
            liveRoute: true
          }
        })
      },
      cookie
    );

    const s = data.shipment;
    console.log(`${data.action.padEnd(8)} ${item.id.padEnd(12)} ${item.mode.padEnd(8)} ${s.status.padEnd(17)} ${item.from} -> ${item.to}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
