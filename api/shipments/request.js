const { parseBody, getSession, toPublicUser } = require("../_auth");
const { upsertShipment } = require("../_store");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const body = parseBody(req.body);
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Request body must include shipment details." });
    }

    // Associate requester information
    const shipmentInput = Object.assign({}, body, {
      origin: String(body.origin || "Unknown").trim(),
      destination: String(body.destination || "Unknown").trim(),
      status: String(body.status || "Created").trim(),
      lastLocation: String(body.lastLocation || body.destination || "").trim()
    });

    const result = await upsertShipment(shipmentInput);

    return res.status(201).json({
      action: result.action,
      shipment: result.shipment,
      message: "Shipment request created.",
      requester: toPublicUser(session),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to create shipment request." });
  }
};
