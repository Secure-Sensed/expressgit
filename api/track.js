const { trackShipments } = require("./_store");

const VALID_MODES = new Set(["tracking", "reference", "tcn", "pod"]);

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET,POST,OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET,POST,OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const payload = req.method === "POST" ? parseBody(req.body) : parseQuery(req.query);
    const mode = VALID_MODES.has(payload.mode) ? payload.mode : "tracking";
    const queries = sanitizeQueries(payload.queries);

    if (!queries.length) {
      return res.status(400).json({ error: "Provide at least one tracking value." });
    }

    if (queries.length > 30) {
      return res.status(400).json({ error: "Maximum 30 queries per request." });
    }

    const results = trackShipments(mode, queries);

    return res.status(200).json({
      mode,
      queries,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Unable to process tracking request."
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

function parseQuery(query = {}) {
  return {
    mode: query.mode,
    queries: query.queries || query.q || ""
  };
}

function sanitizeQueries(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
