import type { Shipment, ShipmentPhase } from "@/types";

export type LatLng = { lat: number; lng: number };

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function pointOf(lat?: number | null, lng?: number | null): LatLng | null {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function distanceKm(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Point at fraction t along the great-circle arc a -> b.
export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  const d = distanceKm(a, b) / R;
  if (d < 1e-9) return a;
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(rad(a.lat)) * Math.cos(rad(a.lng)) + B * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng));
  const y = A * Math.cos(rad(a.lat)) * Math.sin(rad(a.lng)) + B * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng));
  const z = A * Math.sin(rad(a.lat)) + B * Math.sin(rad(b.lat));
  return { lat: deg(Math.atan2(z, Math.sqrt(x * x + y * y))), lng: deg(Math.atan2(y, x)) };
}

export function bearing(a: LatLng, b: LatLng) {
  const dLng = rad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dLng);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

// Evenly spaced points along the arc, used to draw the route as a curve.
export function arcPoints(a: LatLng, b: LatLng, steps = 64): LatLng[] {
  return Array.from({ length: steps + 1 }, (_, i) => interpolate(a, b, i / steps));
}

export interface LiveState {
  position: LatLng | null;
  heading: number;
  /** 0..1 along the moving leg (the part of the journey where the position changes). */
  fraction: number;
  /** 0..1 across the whole journey including handling, customs and last mile. */
  overall: number;
  phase: ShipmentPhase | string;
  etaMs: number | null;
  remainingMs: number | null;
  remainingKm: number | null;
}

// Where is this shipment *right now*? Uses the server's timestamps and the local clock, so
// the marker keeps moving between polls and the countdown stays exact.
export function liveState(shipment: Shipment, nowMs: number): LiveState {
  const origin = pointOf(shipment.originLat, shipment.originLng);
  const destination = pointOf(shipment.destinationLat, shipment.destinationLng);
  const stored = pointOf(shipment.currentLat, shipment.currentLng);
  const motion = shipment.motion;

  if (motion && origin && destination) {
    const departed = Date.parse(motion.departedAt);
    const legStart = Date.parse(motion.legStart);
    const legEnd = Date.parse(motion.legEnd);
    const customsEnd = Date.parse(motion.customsEnd);
    const arrives = Date.parse(motion.arrivesAt);

    const fraction = Math.min(1, Math.max(0, (nowMs - legStart) / (legEnd - legStart)));
    const overall = Math.min(1, Math.max(0, (nowMs - departed) / (arrives - departed)));

    let phase: ShipmentPhase = "in_transit";
    if (nowMs < departed) phase = "scheduled";
    else if (nowMs < legStart) phase = "processing";
    else if (nowMs < legEnd) phase = "in_transit";
    else if (nowMs < customsEnd) phase = "customs";
    else if (nowMs < arrives) phase = "out_for_delivery";
    else phase = "delivered";

    const position = phase === "scheduled" || phase === "processing" ? origin : interpolate(origin, destination, fraction);
    const lookAhead = interpolate(origin, destination, Math.min(1, fraction + 0.01));
    const heading = fraction >= 1 ? bearing(origin, destination) : bearing(position, lookAhead);

    return {
      position,
      heading,
      fraction,
      overall,
      phase,
      etaMs: arrives,
      remainingMs: Math.max(0, arrives - nowMs),
      remainingKm: Math.round(motion.distanceKm * (1 - fraction))
    };
  }

  // Manually-tracked shipment: trust the stored position.
  const position = stored || origin;
  const total = origin && destination ? distanceKm(origin, destination) : 0;
  const done = origin && position ? distanceKm(origin, position) : 0;
  const fraction = total > 0 ? Math.min(1, done / total) : 0;
  const eta = shipment.estimatedDelivery ? Date.parse(shipment.estimatedDelivery) : NaN;

  return {
    position,
    heading: position && destination ? bearing(position, destination) : 0,
    fraction,
    overall: /deliver(ed)?$/i.test(shipment.status) ? 1 : fraction,
    phase: shipment.status,
    etaMs: Number.isFinite(eta) ? eta : null,
    remainingMs: Number.isFinite(eta) ? Math.max(0, eta - nowMs) : null,
    remainingKm: position && destination ? Math.round(distanceKm(position, destination)) : null
  };
}

export function formatCountdown(ms: number | null) {
  if (ms === null) return "—";
  if (ms <= 0) return "Arrived";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${String(minutes).padStart(2, "0")}m`;
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}
