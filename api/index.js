// Single entrypoint to consolidate all API handlers for Vercel Hobby plan.
// Keep requires static so Vercel's file tracer reliably bundles every handler.
const handlers = {
  "vehicles": require("../lib/api/vehicles"),
  "location": require("../lib/api/location"),
  "health": require("../lib/api/health"),
  "track": require("../lib/api/track"),
  "shipments": require("../lib/api/shipments"),
  "shipments/request": require("../lib/api/shipments/request"),
  "support": require("../lib/api/support"),

  "admin/stats": require("../lib/api/admin/stats"),
  "admin/upsert": require("../lib/api/admin/upsert"),
  "admin/delete": require("../lib/api/admin/delete"),
  "admin/users": require("../lib/api/admin/users"),
  "admin/users/delete": require("../lib/api/admin/users/delete"),
  "admin/update-location": require("../lib/api/admin/update-location"),

  "auth/seed": require("../lib/api/auth/seed"),
  "auth/login": require("../lib/api/auth/login"),
  "auth/signup": require("../lib/api/auth/signup"),
  "auth/logout": require("../lib/api/auth/logout"),
  "auth/session": require("../lib/api/auth/session")
};

function firstQueryValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value[0] : "";
  }
  return value || "";
}

function normalizePath(value) {
  return String(value || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function resolveEndpoint(req) {
  const requestUrl = String(req.url || "/api");
  const parsed = new URL(requestUrl, "http://localhost");

  let endpoint = normalizePath(parsed.pathname.replace(/^\/api\/?/, ""));

  if (endpoint === "" || endpoint === "index") {
    const hinted =
      firstQueryValue(req.query && (req.query.path || req.query.endpoint)) ||
      firstQueryValue(parsed.searchParams.getAll("path")) ||
      parsed.searchParams.get("path") ||
      parsed.searchParams.get("endpoint");

    endpoint = normalizePath(hinted);
  }

  return endpoint;
}

module.exports = async function handler(req, res) {
  // default caching policy
  res.setHeader("Cache-Control", "no-store");

  try {
    const path = resolveEndpoint(req);
    if (path === "") {
      return res.status(200).json({ message: "API index", available: Object.keys(handlers) });
    }

    const h = handlers[path];
    if (!h) {
      return res.status(404).json({ error: "API endpoint not found." });
    }

    if (typeof h === "function") {
      return h(req, res);
    }

    return res.status(500).json({ error: "Handler not found or failed to load." });
  } catch (err) {
    console.error("API router error", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  }
};
