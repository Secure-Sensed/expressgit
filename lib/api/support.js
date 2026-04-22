const { addMessage, listMessages, listThreads } = require("./_support");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET,POST,OPTIONS");
    return res.status(204).end();
  }

  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET,POST,OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    if (req.method === "GET") {
      const tracking = firstQueryValue(req.query && req.query.tracking);
      const listAll = firstQueryValue(req.query && (req.query.all || "")) === "1";

      if (listAll) {
        return res.status(200).json({ threads: listThreads(50) });
      }

      if (!tracking) {
        return res.status(400).json({ error: "tracking query parameter is required." });
      }

      return res.status(200).json({ messages: listMessages(tracking) });
    }

    // POST
    const body = parseBody(req.body);
    const trackingNumber = String(body.trackingNumber || "").trim();
    const message = String(body.message || "").trim();
    const from = body.from === "admin" ? "admin" : "user";

    if (!trackingNumber || !message) {
      return res.status(400).json({ error: "trackingNumber and message are required." });
    }

    const saved = addMessage({ trackingNumber, from, body: message });
    return res.status(200).json({ message: saved });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Support request failed." });
  }
};

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try { return JSON.parse(body); } catch (_err) { return {}; }
  }
  return body;
}

function firstQueryValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}
