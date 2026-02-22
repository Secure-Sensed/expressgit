const { SAMPLE_SHIPMENTS } = require("./_shipments");
const { supabase } = require("./_supabase");

let shipmentStore = clone(SAMPLE_SHIPMENTS);

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function dbRowToShipment(row) {
  if (!row) return null;
  return {
    id: row.id,
    trackingNumber: row.tracking_number,
    referenceNumber: row.reference_number,
    tcn: row.tcn,
    status: row.status,
    origin: row.origin,
    destination: row.destination,
    estimatedDelivery: row.estimated_delivery,
    lastLocation: row.last_location,
    proofOfDelivery: row.proof_of_delivery || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function listShipments() {
  if (supabase) {
    const { data, error } = await supabase.from("shipments").select("*").order("created_at", { ascending: false });
    if (error) throw error;

    const shipments = await Promise.all(
      (data || []).map(async (row) => {
        const s = dbRowToShipment(row);
        const { data: events } = await supabase.from("shipment_events").select("*").eq("shipment_id", row.id).order("timestamp", { ascending: false });
        s.events = (events || []).map((ev) => ({
          title: ev.title,
          timestamp: ev.timestamp,
          location: ev.location,
          details: ev.details
        }));
        return s;
      })
    );

    return shipments;
  }

  return clone(shipmentStore);
}

async function findShipment(mode, query) {
  const matchValue = normalize(query);

  if (!matchValue) return null;

  const key = mode === "reference" ? "reference_number" : mode === "tcn" ? "tcn" : "tracking_number";

  if (supabase) {
    const { data, error } = await supabase.from("shipments").select("*").ilike(key, matchValue).limit(1);
    if (error) throw error;
    const row = (data && data[0]) || null;
    if (!row) return null;

    const s = dbRowToShipment(row);
    const { data: events } = await supabase.from("shipment_events").select("*").eq("shipment_id", row.id).order("timestamp", { ascending: false });
    s.events = (events || []).map((ev) => ({ title: ev.title, timestamp: ev.timestamp, location: ev.location, details: ev.details }));
    return s;
  }

  const lookupKey = key === "tracking_number" ? "trackingNumber" : key === "reference_number" ? "referenceNumber" : "tcn";
  return shipmentStore.find((shipment) => normalize(shipment[lookupKey]) === matchValue) || null;
}

async function trackShipments(mode, queries = []) {
  const safeMode = ["tracking", "reference", "tcn", "pod"].includes(mode) ? mode : "tracking";
  const lookupMode = safeMode === "pod" ? "tracking" : safeMode;

  const results = [];
  for (const query of queries) {
    const shipment = await findShipment(lookupMode, query);
    if (!shipment) {
      results.push({ query, found: false, shipment: null });
      continue;
    }

    results.push({ query, found: true, shipment: clone(shipment) });
  }

  return results;
}

async function upsertShipment(input) {
  const shipment = sanitizeShipmentInput(input);

  if (supabase) {
    // check existing by tracking number
    const { data: existingRows } = await supabase.from("shipments").select("*").eq("tracking_number", shipment.trackingNumber).limit(1);
    const exists = existingRows && existingRows.length;

    const payload = {
      tracking_number: shipment.trackingNumber,
      reference_number: shipment.referenceNumber,
      tcn: shipment.tcn,
      status: shipment.status,
      origin: shipment.origin,
      destination: shipment.destination,
      estimated_delivery: shipment.estimatedDelivery || null,
      last_location: shipment.lastLocation,
      proof_of_delivery: shipment.proofOfDelivery || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from("shipments").upsert(payload, { onConflict: "tracking_number" }).select().limit(1);
    if (error) throw error;
    const row = data && data[0];

    // insert events if provided
    if (Array.isArray(shipment.events) && shipment.events.length) {
      const eventsPayload = shipment.events.map((ev) => ({
        shipment_id: row.id,
        title: ev.title,
        timestamp: ev.timestamp || new Date().toISOString(),
        location: ev.location || shipment.lastLocation,
        details: ev.details || ""
      }));
      const { error: evErr } = await supabase.from("shipment_events").insert(eventsPayload);
      if (evErr) throw evErr;
    }

    return {
      action: exists ? "updated" : "created",
      shipment: dbRowToShipment(row)
    };
  }

  const existingIndex = shipmentStore.findIndex((item) => normalize(item.trackingNumber) === normalize(shipment.trackingNumber));

  if (existingIndex >= 0) {
    const current = shipmentStore[existingIndex];
    const nextEvents = Array.isArray(shipment.events) && shipment.events.length ? shipment.events : current.events || [];

    shipmentStore[existingIndex] = {
      ...current,
      ...shipment,
      events: nextEvents
    };

    return {
      action: "updated",
      shipment: clone(shipmentStore[existingIndex])
    };
  }

  shipmentStore.unshift(shipment);

  return {
    action: "created",
    shipment: clone(shipment)
  };
}

function sanitizeShipmentInput(input = {}) {
  const required = ["trackingNumber", "status", "origin", "destination"];

  required.forEach((field) => {
    if (!String(input[field] || "").trim()) {
      throw new Error(`Missing required field: ${field}`);
    }
  });

  const next = {
    trackingNumber: String(input.trackingNumber).trim(),
    referenceNumber: String(input.referenceNumber || `REF-${Date.now()}`).trim(),
    tcn: String(input.tcn || `TCN-${Date.now()}`).trim(),
    status: String(input.status).trim(),
    origin: String(input.origin).trim(),
    destination: String(input.destination).trim(),
    estimatedDelivery: input.estimatedDelivery || null,
    lastLocation: String(input.lastLocation || input.destination).trim(),
    proofOfDelivery: input.proofOfDelivery || null,
    events: Array.isArray(input.events) && input.events.length
      ? input.events.map((event) => ({
        title: String(event.title || input.status).trim(),
        timestamp: event.timestamp || new Date().toISOString(),
        location: String(event.location || input.lastLocation || input.destination).trim(),
        details: event.details ? String(event.details) : ""
      }))
      : [
        {
          title: String(input.status).trim(),
          timestamp: new Date().toISOString(),
          location: String(input.lastLocation || input.destination).trim(),
          details: "Shipment updated"
        }
      ]
  };

  return next;
}

module.exports = {
  listShipments,
  trackShipments,
  upsertShipment
};
