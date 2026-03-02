// Single entrypoint to consolidate all API handlers for Vercel Hobby plan

const handlerPaths = {
  "vehicles": "../lib/api/vehicles",
  "location": "../lib/api/location",
  "health": "../lib/api/health",
  "track": "../lib/api/track",
  "shipments": "../lib/api/shipments",
  "shipments/request": "../lib/api/shipments/request",

  "admin/stats": "../lib/api/admin/stats",
  "admin/upsert": "../lib/api/admin/upsert",
  "admin/delete": "../lib/api/admin/delete",
  "admin/users": "../lib/api/admin/users",
  "admin/users/delete": "../lib/api/admin/users/delete",
  "admin/update-location": "../lib/api/admin/update-location",

  "auth/seed": "../lib/api/auth/seed",
  "auth/login": "../lib/api/auth/login",
  "auth/signup": "../lib/api/auth/signup",
  "auth/logout": "../lib/api/auth/logout",
  "auth/session": "../lib/api/auth/session",

  // keep internal helpers available if needed
  "_subscriptions": "../lib/api/_subscriptions"
};

const cache = {};

function loadHandler(path) {
  if (cache[path]) return cache[path];
  try {
    const h = require(path);
    cache[path] = h;
    return h;
  } catch (err) {
    console.error(`Failed to load handler from ${path}:`, err.message);
    return null;
  }
}

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
      return res.status(200).json({ message: "API index", available: Object.keys(handlerPaths) });
    }

    const handlerPath = handlerPaths[path];
    if (!handlerPath) {
      return res.status(404).json({ error: "API endpoint not found." });
    }

    const h = loadHandler(handlerPath);
    if (h && typeof h === "function") {
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
