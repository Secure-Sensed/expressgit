const { SAMPLE_SHIPMENTS } = require("./_shipments");
const { supabase } = require("./_supabase");

const TRACKING_MODES = new Set(["tracking", "reference", "tcn", "pod"]);

let shipmentStore = clone(SAMPLE_SHIPMENTS);

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getNowIso() {
  return new Date().toISOString();
}

function getLocalKeyForMode(mode) {
  if (mode === "reference") return "referenceNumber";
  if (mode === "tcn") return "tcn";
  return "trackingNumber";
}

function getDatabaseColumnForMode(mode) {
  if (mode === "reference") return "reference_number";
  if (mode === "tcn") return "tcn";
  return "tracking_number";
}

function formatLookupValue(mode, value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  // Keep identifiers consistent for case-insensitive matching.
  return (mode === "tracking" || mode === "reference" || mode === "tcn")
    ? trimmed.toUpperCase()
    : trimmed;
}

function generateIdentifier(prefix) {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return `${prefix}-${time}${rand}`;
}

function dbRowToShipment(row, events = []) {
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
    events,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function dbEventToEvent(row) {
  return {
    title: row.title,
    timestamp: row.timestamp,
    location: row.location,
    details: row.details
  };
}

async function fetchEventsByShipmentIds(shipmentIds) {
  const eventMap = new Map();

  if (!shipmentIds.length) {
    return eventMap;
  }

  const { data, error } = await supabase
    .from("shipment_events")
    .select("shipment_id,title,timestamp,location,details")
    .in("shipment_id", shipmentIds)
    .order("timestamp", { ascending: false });

  if (error) {
    throw new Error(`Unable to load shipment events: ${error.message}`);
  }

  for (const row of data || []) {
    if (!eventMap.has(row.shipment_id)) {
      eventMap.set(row.shipment_id, []);
    }
    eventMap.get(row.shipment_id).push(dbEventToEvent(row));
  }

  return eventMap;
}

async function hydrateShipments(rows) {
  if (!rows || !rows.length) return [];

  const eventMap = await fetchEventsByShipmentIds(rows.map((row) => row.id));
  return rows.map((row) => dbRowToShipment(row, eventMap.get(row.id) || []));
}

function assertRequiredField(input, field) {
  if (!String(input[field] || "").trim()) {
    throw new Error(`Missing required field: ${field}`);
  }
}

function toIsoOrNull(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date/time.`);
  }

  return parsed.toISOString();
}

function sanitizeProofOfDelivery(input) {
  if (input === null || input === undefined || input === "") {
    return null;
  }

  if (typeof input !== "object") {
    throw new Error("proofOfDelivery must be an object.");
  }

  const deliveredAt = toIsoOrNull(input.deliveredAt || input.delivered_at, "proofOfDelivery.deliveredAt");
  const receivedBy = String(input.receivedBy || input.received_by || "").trim();
  const signature = String(input.signature || "").trim();

  if (!deliveredAt && !receivedBy && !signature) {
    return null;
  }

  return {
    deliveredAt: deliveredAt || getNowIso(),
    receivedBy: receivedBy || null,
    signature: signature || null
  };
}

function sanitizeEvent(event, fallback) {
  const title = String(event.title || fallback.title || "Shipment updated").trim();
  const timestamp = toIsoOrNull(event.timestamp, "events.timestamp") || getNowIso();
  const location = String(event.location || fallback.location || "").trim();
  const details = String(event.details || fallback.details || "").trim();

  if (!title) {
    throw new Error("events.title is required when adding an event.");
  }

  if (!location) {
    throw new Error("events.location is required when adding an event.");
  }

  return {
    title,
    timestamp,
    location,
    details
  };
}

function sanitizeShipmentInput(input = {}) {
  assertRequiredField(input, "trackingNumber");
  assertRequiredField(input, "status");
  assertRequiredField(input, "origin");
  assertRequiredField(input, "destination");

  const trackingNumber = formatLookupValue("tracking", input.trackingNumber);
  const status = String(input.status).trim();
  const origin = String(input.origin).trim();
  const destination = String(input.destination).trim();
  const lastLocation = String(input.lastLocation || destination).trim();

  const fallbackEvent = {
    title: status,
    location: lastLocation,
    details: "Shipment updated"
  };

  const hasCustomEvents = Array.isArray(input.events) && input.events.length > 0;

  return {
    trackingNumber,
    referenceNumber: input.referenceNumber ? formatLookupValue("reference", input.referenceNumber) : "",
    tcn: input.tcn ? formatLookupValue("tcn", input.tcn) : "",
    status,
    origin,
    destination,
    estimatedDelivery: toIsoOrNull(input.estimatedDelivery, "estimatedDelivery"),
    lastLocation,
    proofOfDelivery: Object.prototype.hasOwnProperty.call(input, "proofOfDelivery")
      ? sanitizeProofOfDelivery(input.proofOfDelivery)
      : undefined,
    events: hasCustomEvents
      ? input.events.map((event) => sanitizeEvent(event || {}, fallbackEvent))
      : [sanitizeEvent({}, fallbackEvent)]
  };
}

function findShipmentInMemory(mode, query) {
  const key = getLocalKeyForMode(mode);
  const matchValue = normalize(formatLookupValue(mode, query));

  if (!matchValue) return null;

  return shipmentStore.find((shipment) => normalize(formatLookupValue(mode, shipment[key])) === matchValue) || null;
}

async function listShipments() {
  if (supabase) {
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Unable to load shipments: ${error.message}`);
    }

    return hydrateShipments(data || []);
  }

  return clone(shipmentStore);
}

async function trackShipments(mode, queries = []) {
  const safeMode = TRACKING_MODES.has(mode) ? mode : "tracking";
  const lookupMode = safeMode === "pod" ? "tracking" : safeMode;
  const cleanedQueries = queries
    .map((query) => String(query || "").trim())
    .filter(Boolean);

  if (!cleanedQueries.length) {
    return [];
  }

  if (!supabase) {
    return cleanedQueries.map((query) => {
      const shipment = findShipmentInMemory(lookupMode, query);
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

  const lookupColumn = getDatabaseColumnForMode(lookupMode);
  const formattedValues = cleanedQueries.map((query) => formatLookupValue(lookupMode, query));
  const uniqueLookupValues = [...new Set(formattedValues.filter(Boolean))];

  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .in(lookupColumn, uniqueLookupValues);

  if (error) {
    throw new Error(`Unable to fetch tracking data: ${error.message}`);
  }

  const hydrated = await hydrateShipments(data || []);
  const resultMap = new Map();

  for (const shipment of hydrated) {
    const lookupValue = shipment[getLocalKeyForMode(lookupMode)];
    resultMap.set(normalize(formatLookupValue(lookupMode, lookupValue)), shipment);
  }

  return cleanedQueries.map((query, index) => {
    const match = resultMap.get(normalize(formattedValues[index]));

    if (!match) {
      return {
        query,
        found: false,
        shipment: null
      };
    }

    return {
      query,
      found: true,
      shipment: match
    };
  });
}

async function upsertShipment(input) {
  const shipment = sanitizeShipmentInput(input);

  if (supabase) {
    const { data: existingRows, error: existingError } = await supabase
      .from("shipments")
      .select("id,reference_number,tcn,proof_of_delivery")
      .eq("tracking_number", shipment.trackingNumber)
      .limit(1);

    if (existingError) {
      throw new Error(`Unable to check existing shipment: ${existingError.message}`);
    }

    const existing = (existingRows && existingRows[0]) || null;

    const payload = {
      tracking_number: shipment.trackingNumber,
      reference_number: shipment.referenceNumber || (existing && existing.reference_number) || generateIdentifier("REF"),
      tcn: shipment.tcn || (existing && existing.tcn) || generateIdentifier("TCN"),
      status: shipment.status,
      origin: shipment.origin,
      destination: shipment.destination,
      estimated_delivery: shipment.estimatedDelivery,
      last_location: shipment.lastLocation,
      proof_of_delivery: shipment.proofOfDelivery !== undefined
        ? shipment.proofOfDelivery
        : ((existing && existing.proof_of_delivery) || null),
      updated_at: getNowIso()
    };

    const { data: upsertRows, error: upsertError } = await supabase
      .from("shipments")
      .upsert(payload, { onConflict: "tracking_number" })
      .select("*")
      .limit(1);

    if (upsertError) {
      throw new Error(`Unable to save shipment: ${upsertError.message}`);
    }

    const row = upsertRows && upsertRows[0];

    if (!row) {
      throw new Error("Shipment save succeeded but no row was returned.");
    }

    const eventsPayload = shipment.events.map((event) => ({
      shipment_id: row.id,
      title: event.title,
      timestamp: event.timestamp,
      location: event.location,
      details: event.details || ""
    }));

    if (eventsPayload.length) {
      const { error: eventsError } = await supabase
        .from("shipment_events")
        .insert(eventsPayload);

      if (eventsError) {
        throw new Error(`Shipment saved but events failed: ${eventsError.message}`);
      }
    }

    const hydrated = await hydrateShipments([row]);

    return {
      action: existing ? "updated" : "created",
      shipment: hydrated[0]
    };
  }

  const existingIndex = shipmentStore.findIndex(
    (item) => normalize(formatLookupValue("tracking", item.trackingNumber)) === normalize(shipment.trackingNumber)
  );

  if (existingIndex >= 0) {
    const current = shipmentStore[existingIndex];

    const nextShipment = {
      ...current,
      trackingNumber: shipment.trackingNumber,
      referenceNumber: shipment.referenceNumber || current.referenceNumber || generateIdentifier("REF"),
      tcn: shipment.tcn || current.tcn || generateIdentifier("TCN"),
      status: shipment.status,
      origin: shipment.origin,
      destination: shipment.destination,
      estimatedDelivery: shipment.estimatedDelivery,
      lastLocation: shipment.lastLocation,
      proofOfDelivery: shipment.proofOfDelivery !== undefined ? shipment.proofOfDelivery : (current.proofOfDelivery || null),
      events: [...shipment.events, ...(current.events || [])],
      updatedAt: getNowIso()
    };

    shipmentStore[existingIndex] = nextShipment;

    return {
      action: "updated",
      shipment: clone(nextShipment)
    };
  }

  const createdShipment = {
    trackingNumber: shipment.trackingNumber,
    referenceNumber: shipment.referenceNumber || generateIdentifier("REF"),
    tcn: shipment.tcn || generateIdentifier("TCN"),
    status: shipment.status,
    origin: shipment.origin,
    destination: shipment.destination,
    estimatedDelivery: shipment.estimatedDelivery,
    lastLocation: shipment.lastLocation,
    proofOfDelivery: shipment.proofOfDelivery || null,
    events: shipment.events,
    createdAt: getNowIso(),
    updatedAt: getNowIso()
  };

  shipmentStore.unshift(createdShipment);

  return {
    action: "created",
    shipment: clone(createdShipment)
  };
}

async function deleteShipment(trackingNumber) {
  const targetTrackingNumber = formatLookupValue("tracking", trackingNumber);

  if (!targetTrackingNumber) {
    throw new Error("trackingNumber is required.");
  }

  if (supabase) {
    const { data: rows, error: findError } = await supabase
      .from("shipments")
      .select("id,tracking_number")
      .eq("tracking_number", targetTrackingNumber)
      .limit(1);

    if (findError) {
      throw new Error(`Unable to find shipment: ${findError.message}`);
    }

    const existing = rows && rows[0];

    if (!existing) {
      return {
        action: "not_found",
        trackingNumber: targetTrackingNumber
      };
    }

    const { error: deleteError } = await supabase
      .from("shipments")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      throw new Error(`Unable to delete shipment: ${deleteError.message}`);
    }

    return {
      action: "deleted",
      trackingNumber: existing.tracking_number
    };
  }

  const existingIndex = shipmentStore.findIndex(
    (item) => normalize(formatLookupValue("tracking", item.trackingNumber)) === normalize(targetTrackingNumber)
  );

  if (existingIndex < 0) {
    return {
      action: "not_found",
      trackingNumber: targetTrackingNumber
    };
  }

  shipmentStore.splice(existingIndex, 1);

  return {
    action: "deleted",
    trackingNumber: targetTrackingNumber
  };
}

module.exports = {
  listShipments,
  trackShipments,
  upsertShipment,
  deleteShipment
};
