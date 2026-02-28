const { upsertShipment, trackShipments } = require("../_store");

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

  const expectedToken = process.env.ADMIN_API_TOKEN || "local-dev-token";
  const providedToken = req.headers["x-admin-token"];
  if (providedToken !== expectedToken) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  try {
    const body = parseBody(req.body);
    if (!body.trackingNumber) {
      return res.status(400).json({ error: "trackingNumber required" });
    }

    const lookup = await trackShipments("tracking", [body.trackingNumber]);
    const existing = lookup && lookup[0] && lookup[0].found ? lookup[0].shipment : null;
    if (!existing) {
      return res.status(404).json({ error: "Shipment not found." });
    }

    const update = {
      trackingNumber: existing.trackingNumber,
      status: body.status || existing.status || "in_transit",
      origin: body.origin || existing.origin || "Unknown",
      destination: body.destination || existing.destination || "Unknown",
      lastLocation: body.lastLocation || existing.lastLocation || existing.destination || existing.origin || "Unknown",
      estimatedDelivery: body.estimatedDelivery !== undefined ? body.estimatedDelivery : existing.estimatedDelivery,
      currentLat: body.currentLat !== undefined ? body.currentLat : existing.currentLat,
      currentLng: body.currentLng !== undefined ? body.currentLng : existing.currentLng,
      originLat: body.originLat !== undefined ? body.originLat : existing.originLat,
      originLng: body.originLng !== undefined ? body.originLng : existing.originLng,
      destinationLat: body.destinationLat !== undefined ? body.destinationLat : existing.destinationLat,
      destinationLng: body.destinationLng !== undefined ? body.destinationLng : existing.destinationLng,
      customerEmail: body.customerEmail || existing.customerEmail,
      customerName: body.customerName || existing.customerName
    };

    const result = await upsertShipment(update);
    return res.status(200).json({ action: result.action, shipment: result.shipment });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to update location." });
  }
};

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    return JSON.parse(body);
  }
  return body;
}
