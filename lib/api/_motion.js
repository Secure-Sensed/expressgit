// Real-time shipment motion.
//
// A "live" shipment stores only: transport mode, departure time, origin and destination.
// Everything else (where it is right now, which phase it is in, the event timeline, the ETA)
// is derived from the wall clock, so the map moves without anybody touching it.
//
// Timeline for one shipment:
//   departure -> origin handling -> [ moving leg ] -> destination handling -> last mile -> delivered
// Only the moving leg changes the shipment's position.

const EARTH_RADIUS_KM = 6371;
const HOUR = 3600 * 1000;

const MODES = {
  air: {
    label: "Air freight",
    cruiseKmh: 830,
    originHandlingH: 5,
    customsH: 6,
    lastMileH: 3
  },
  express: {
    label: "Express air",
    cruiseKmh: 880,
    originHandlingH: 2.5,
    customsH: 2.5,
    lastMileH: 2
  },
  ground: {
    label: "Road freight",
    cruiseKmh: 62,
    originHandlingH: 1.5,
    customsH: 0.5,
    lastMileH: 1.5
  },
  sea: {
    label: "Ocean freight",
    cruiseKmh: 36,
    originHandlingH: 24,
    customsH: 18,
    lastMileH: 8
  }
};

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

function hasPoint(lat, lng) {
  return lat !== null && lat !== undefined && lng !== null && lng !== undefined && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Point at fraction t (0..1) along the great-circle arc a -> b.
function interpolate(a, b, t) {
  const d = distanceKm(a, b) / EARTH_RADIUS_KM;
  if (d < 1e-9) return { lat: a.lat, lng: a.lng };

  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(toRad(a.lat)) * Math.cos(toRad(a.lng)) + B * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng));
  const y = A * Math.cos(toRad(a.lat)) * Math.sin(toRad(a.lng)) + B * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng));
  const z = A * Math.sin(toRad(a.lat)) + B * Math.sin(toRad(b.lat));

  return { lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), lng: toDeg(Math.atan2(y, x)) };
}

function bearing(a, b) {
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function movingLabel(mode) {
  if (mode === "ground") return "On the road";
  if (mode === "sea") return "At sea";
  return "In flight";
}

function buildPlan({ mode, departedAt, origin, destination }) {
  const spec = MODES[mode];
  if (!spec) return null;

  const departed = new Date(departedAt).getTime();
  if (!Number.isFinite(departed)) return null;

  const km = distanceKm(origin, destination);
  // Real routes are longer than the arc: add 8% for air corridors, 25% for roads, 15% for sea lanes.
  const detour = mode === "ground" ? 1.25 : mode === "sea" ? 1.15 : 1.08;
  const movingH = Math.max(0.5, (km * detour) / spec.cruiseKmh);

  const moveStart = departed + spec.originHandlingH * HOUR;
  const moveEnd = moveStart + movingH * HOUR;
  const customsEnd = moveEnd + spec.customsH * HOUR;
  const delivered = customsEnd + spec.lastMileH * HOUR;

  return { spec, km, movingH, departed, moveStart, moveEnd, customsEnd, delivered };
}

// Phase names double as the status values stored on the shipment.
function phaseAt(plan, now) {
  if (now < plan.departed) return "scheduled";
  if (now < plan.moveStart) return "processing";
  if (now < plan.moveEnd) return "in_transit";
  if (now < plan.customsEnd) return "customs";
  if (now < plan.delivered) return "out_for_delivery";
  return "delivered";
}

function buildEvents(plan, shipment, now) {
  const { spec } = plan;
  const air = shipment.transportMode === "air" || shipment.transportMode === "express";
  const origin = shipment.origin;
  const destination = shipment.destination;
  const moveVerb = air ? "Departed on flight" : shipment.transportMode === "sea" ? "Vessel departed" : "Departed on road";
  const arriveVerb = air ? "Landed" : shipment.transportMode === "sea" ? "Vessel berthed" : "Arrived at hub";
  const midpoint = plan.moveStart + (plan.moveEnd - plan.moveStart) / 2;
  const middle = interpolate(
    { lat: Number(shipment.originLat), lng: Number(shipment.originLng) },
    { lat: Number(shipment.destinationLat), lng: Number(shipment.destinationLng) },
    0.5
  );

  const milestones = [
    { at: plan.departed, title: "Shipment picked up", location: origin, details: "Collected from sender and scanned" },
    {
      at: plan.departed + (plan.moveStart - plan.departed) * 0.55,
      title: "Processed at origin facility",
      location: origin,
      details: `Cleared export screening — ${spec.label.toLowerCase()}`
    },
    { at: plan.moveStart, title: moveVerb, location: origin, details: `${spec.label} to ${destination}` },
    {
      at: midpoint,
      title: air ? "In flight — cruising" : "In transit — mid route",
      location: `Over ${middle.lat.toFixed(1)}°, ${middle.lng.toFixed(1)}°`,
      details: `${Math.round(plan.km / 2).toLocaleString("en-US")} km covered`
    },
    { at: plan.moveEnd, title: arriveVerb, location: destination, details: "Arrived at destination gateway" },
    { at: plan.customsEnd, title: "Customs cleared", location: destination, details: "Released for local delivery" },
    {
      at: plan.customsEnd + (plan.delivered - plan.customsEnd) * 0.2,
      title: "Out for delivery",
      location: destination,
      details: "On the vehicle for final delivery"
    },
    { at: plan.delivered, title: "Delivered", location: destination, details: "Delivered and signed for" }
  ];

  // Newest first, same order the rest of the app already shows events in.
  return milestones
    .filter((milestone) => milestone.at <= now)
    .map((milestone) => ({
      title: milestone.title,
      timestamp: new Date(milestone.at).toISOString(),
      location: milestone.location,
      details: milestone.details
    }))
    .reverse();
}

// Returns the shipment with live fields applied, or the shipment unchanged when it is not live.
function applyMotion(shipment, nowMs = Date.now()) {
  if (!shipment || !shipment.liveRoute || !shipment.transportMode || !shipment.departedAt) {
    return shipment;
  }

  if (!hasPoint(shipment.originLat, shipment.originLng) || !hasPoint(shipment.destinationLat, shipment.destinationLng)) {
    return shipment;
  }

  const origin = { lat: Number(shipment.originLat), lng: Number(shipment.originLng) };
  const destination = { lat: Number(shipment.destinationLat), lng: Number(shipment.destinationLng) };
  const plan = buildPlan({ mode: shipment.transportMode, departedAt: shipment.departedAt, origin, destination });
  if (!plan) return shipment;

  const phase = phaseAt(plan, nowMs);
  const fraction = Math.min(1, Math.max(0, (nowMs - plan.moveStart) / (plan.moveEnd - plan.moveStart)));

  let position = interpolate(origin, destination, fraction);
  if (phase === "scheduled" || phase === "processing") position = origin;
  if (phase === "customs" || phase === "out_for_delivery" || phase === "delivered") position = destination;

  const ahead = interpolate(origin, destination, Math.min(1, fraction + 0.01));
  const heading = fraction >= 1 ? bearing(origin, destination) : bearing(position, ahead);

  const moving = phase === "in_transit";
  const progress = Math.min(1, Math.max(0, (nowMs - plan.departed) / (plan.delivered - plan.departed)));
  const atOrigin = phase === "scheduled" || phase === "processing";
  const label = moving
    ? `${movingLabel(shipment.transportMode)} · ${Math.round(fraction * 100)}% of the way`
    : atOrigin
      ? shipment.origin
      : shipment.destination;

  const events = buildEvents(plan, shipment, nowMs);
  const proofOfDelivery =
    phase === "delivered"
      ? shipment.proofOfDelivery || {
          deliveredAt: new Date(plan.delivered).toISOString(),
          receivedBy: shipment.customerName || "Recipient",
          signature: "On file"
        }
      : shipment.proofOfDelivery;

  return {
    ...shipment,
    status: phase,
    lastLocation: label,
    currentLat: Number(position.lat.toFixed(5)),
    currentLng: Number(position.lng.toFixed(5)),
    estimatedDelivery: new Date(plan.delivered).toISOString(),
    proofOfDelivery,
    events,
    motion: {
      mode: shipment.transportMode,
      modeLabel: plan.spec.label,
      phase,
      progress: Number(progress.toFixed(4)),
      legProgress: Number(fraction.toFixed(4)),
      heading: Number(heading.toFixed(1)),
      distanceKm: Math.round(plan.km),
      remainingKm: Math.round(plan.km * (1 - fraction)),
      speedKmh: moving ? Math.round(plan.spec.cruiseKmh) : 0,
      departedAt: new Date(plan.departed).toISOString(),
      legStart: new Date(plan.moveStart).toISOString(),
      legEnd: new Date(plan.moveEnd).toISOString(),
      customsEnd: new Date(plan.customsEnd).toISOString(),
      arrivesAt: new Date(plan.delivered).toISOString()
    }
  };
}

// For callers creating a shipment: the arrival time a plan implies, so the admin form can show it.
function estimateArrival({ mode, departedAt, origin, destination }) {
  const plan = buildPlan({ mode, departedAt, origin, destination });
  return plan ? new Date(plan.delivered).toISOString() : null;
}

module.exports = {
  MODES,
  distanceKm,
  interpolate,
  bearing,
  applyMotion,
  estimateArrival,
  buildPlan
};
