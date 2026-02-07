const { SAMPLE_SHIPMENTS } = require("./_shipments");

let shipmentStore = clone(SAMPLE_SHIPMENTS);

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function listShipments() {
  return clone(shipmentStore);
}

function findShipment(mode, query) {
  const matchValue = normalize(query);

  if (!matchValue) return null;

  const key = mode === "reference" ? "referenceNumber" : mode === "tcn" ? "tcn" : "trackingNumber";

  return shipmentStore.find((shipment) => normalize(shipment[key]) === matchValue) || null;
}

function trackShipments(mode, queries = []) {
  const safeMode = ["tracking", "reference", "tcn", "pod"].includes(mode) ? mode : "tracking";
  const lookupMode = safeMode === "pod" ? "tracking" : safeMode;

  return queries.map((query) => {
    const shipment = findShipment(lookupMode, query);

    if (!shipment) {
      return {
        query,
        found: false,
        shipment: null
      };
    }

    return {
      query,
      found: true,
      shipment: clone(shipment)
    };
  });
}

function upsertShipment(input) {
  const shipment = sanitizeShipmentInput(input);

  const existingIndex = shipmentStore.findIndex(
    (item) => normalize(item.trackingNumber) === normalize(shipment.trackingNumber)
  );

  if (existingIndex >= 0) {
    const current = shipmentStore[existingIndex];
    const nextEvents = Array.isArray(shipment.events) && shipment.events.length
      ? shipment.events
      : current.events || [];

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
