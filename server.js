// Production API server. Serves every /api/* route through api/index.js
// (the same handlers Vercel used) so the frontend can stay on Vercel and proxy here.
const http = require("http");
const { URL } = require("url");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 4180);
const MAX_BODY_BYTES = 1024 * 1024;

const apiHandler = require("./api/index.js");

// In-memory rate limits. The API runs as a single process, so a per-process counter is enough.
// Login and signup are limited tightly to slow password guessing; lookups are limited so tracking
// numbers cannot be enumerated.
const LIMITS = [
  { test: (path) => /^\/api\/(admin\/auth\/login|auth\/(login|signup|register))/.test(path), max: 10, windowMs: 15 * 60 * 1000, name: "auth" },
  { test: (path) => path === "/api/track", max: 60, windowMs: 60 * 1000, name: "track" },
  { test: (path) => /^\/api\/(support|shipments\/request)/.test(path), max: 30, windowMs: 60 * 1000, name: "write" }
];
const hits = new Map();

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "unknown";
}

function rateLimited(req, path) {
  const rule = LIMITS.find((item) => item.test(path));
  if (!rule) return 0;
  const key = `${rule.name}|${clientIp(req)}`;
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset <= now) {
    hits.set(key, { count: 1, reset: now + rule.windowMs });
    return 0;
  }
  entry.count += 1;
  return entry.count > rule.max ? Math.ceil((entry.reset - now) / 1000) : 0;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
}, 60 * 1000).unref();

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.url.split("?")[0]} ${res.statusCode} ${Date.now() - started}ms`);
  });

  try {
    const url = new URL(req.url, "http://localhost");

    if (!url.pathname.startsWith("/api/") && url.pathname !== "/api") {
      return sendJson(res, 404, { error: "Not found." });
    }

    const wait = req.method === "OPTIONS" ? 0 : rateLimited(req, url.pathname);
    if (wait) {
      res.setHeader("Retry-After", String(wait));
      return sendJson(res, 429, { error: "Too many requests. Try again in a few minutes." });
    }

    const body = await readBody(req);
    const query = {};
    for (const [key, value] of url.searchParams.entries()) {
      query[key] = Object.prototype.hasOwnProperty.call(query, key)
        ? [].concat(query[key], value)
        : value;
    }

    await apiHandler(
      { method: req.method, headers: req.headers, body, query, url: req.url },
      wrapResponse(res)
    );

    if (!res.writableEnded) res.end();
  } catch (error) {
    console.error("Request failed:", error);
    if (!res.headersSent) {
      sendJson(res, error.statusCode || 500, { error: error.statusCode ? error.message : "Internal server error" });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`TransitLink API listening on http://${HOST}:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") return resolve({});
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY_BYTES) {
        const error = new Error("Payload too large.");
        error.statusCode = 413;
        req.destroy();
        reject(error);
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (_error) {
        const error = new Error("Invalid JSON body.");
        error.statusCode = 400;
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function wrapResponse(res) {
  return {
    status(code) { res.statusCode = code; return this; },
    setHeader(name, value) { res.setHeader(name, value); return this; },
    getHeader(name) { return res.getHeader(name); },
    get headersSent() { return res.headersSent; },
    json(payload) {
      if (!res.headersSent) res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(payload));
      return this;
    },
    end(payload) { res.end(payload); return this; }
  };
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
