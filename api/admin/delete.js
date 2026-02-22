const { deleteShipment } = require("../_store");

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
    const trackingNumber = String(body.trackingNumber || "").trim();

    if (!trackingNumber) {
      return res.status(400).json({ error: "trackingNumber is required." });
    }

    const result = await deleteShipment(trackingNumber);

    return res.status(200).json({
      action: result.action,
      trackingNumber: result.trackingNumber,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Unable to delete shipment."
    });
  }
};

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") return JSON.parse(body);
  return body;
}
