const { upsertShipment } = require("./_store");

// reuse admin token check from upsert
const { parseBody } = require("./_store");

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
    const update = { trackingNumber: body.trackingNumber };
    if (body.status) update.status = body.status;
    if (body.lastLocation) update.lastLocation = body.lastLocation;
    if (body.currentLat !== undefined) update.currentLat = body.currentLat;
    if (body.currentLng !== undefined) update.currentLng = body.currentLng;
    if (body.originLat !== undefined) update.originLat = body.originLat;
    if (body.originLng !== undefined) update.originLng = body.originLng;
    if (body.destinationLat !== undefined) update.destinationLat = body.destinationLat;
    if (body.destinationLng !== undefined) update.destinationLng = body.destinationLng;

    const result = await upsertShipment(update);
    return res.status(200).json({ action: result.action, shipment: result.shipment });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to update location." });
  }
};