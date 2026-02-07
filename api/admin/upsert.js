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

  const expectedToken = process.env.ADMIN_API_TOKEN || "local-dev-token";
  const providedToken = req.headers["x-admin-token"];

  if (providedToken !== expectedToken) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  try {
    const body = parseBody(req.body);
    if (!body.shipment || typeof body.shipment !== "object") {
      return res.status(400).json({ error: "Request body must include a shipment object." });
    }

    const result = upsertShipment(body.shipment);

    return res.status(200).json({
      action: result.action,
      shipment: result.shipment,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Unable to upsert shipment."
    });
  }
};

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    return JSON.parse(body);
  }
  return body;
}
