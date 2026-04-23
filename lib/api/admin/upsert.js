const { upsertShipment } = require("../_store");
const { sendShipmentReceiverNotification } = require("../_mailer");
const { requireAdmin } = require("../_admin_auth");

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

  if (!requireAdmin(req, res)) {
    return;
  }

  try {
    const body = parseBody(req.body);
    if (!body.shipment || typeof body.shipment !== "object") {
      return res.status(400).json({ error: "Request body must include a shipment object." });
    }

    const result = await upsertShipment(body.shipment);
    let notification = { sent: false, skipped: "not-attempted" };

    try {
      notification = await sendShipmentReceiverNotification({
        shipment: result.shipment,
        action: result.action
      });
    } catch (mailError) {
      notification = {
        sent: false,
        error: mailError.message || "Unable to send notification."
      };
    }

    return res.status(200).json({
      action: result.action,
      shipment: result.shipment,
      notification,
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
