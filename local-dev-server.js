const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
    const pathname = decodeURIComponent(requestUrl.pathname);

    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname, requestUrl);
      return;
    }

    await handleStatic(req, res, pathname);
  } catch (error) {
    respondJson(res, 500, { error: "Internal server error", details: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Local server running at http://${HOST}:${PORT}`);
});

async function handleApi(req, res, pathname, requestUrl) {
  if (!["GET", "POST", "OPTIONS"].includes(req.method)) {
    respondJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const handlerPath = resolveApiHandler(pathname);

  if (!handlerPath) {
    respondJson(res, 404, { error: "API endpoint not found." });
    return;
  }

  const parsedBody = await parseBody(req);
  const query = parseQuery(requestUrl.searchParams);

  delete require.cache[require.resolve(handlerPath)];
  const handler = require(handlerPath);

  const reqLike = {
    method: req.method,
    headers: req.headers,
    body: parsedBody,
    query,
    url: req.url
  };

  const resLike = createVercelLikeResponse(res);
  await handler(reqLike, resLike);

  if (!res.writableEnded) {
    res.end();
  }
}

function resolveApiHandler(pathname) {
  const normalized = pathname.replace(/^\/api\//, "");
  const localPath = path.join(ROOT, "api", normalized);

  if (!isInsideRoot(localPath, path.join(ROOT, "api"))) return null;

  const candidate = localPath.endsWith(".js") ? localPath : `${localPath}.js`;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  // fallback: always handle through central api/index.js if it exists
  const fallback = path.join(ROOT, "api", "index.js");
  if (fs.existsSync(fallback)) {
    return fallback;
  }

  return null;
}

async function handleStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    respondText(res, 405, "Method not allowed.");
    return;
  }

  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(ROOT, requested);

  if (!isInsideRoot(filePath, ROOT)) {
    respondText(res, 403, "Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    respondText(res, 404, "Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const data = fs.readFileSync(filePath);

  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  res.end(data);
}

function createVercelLikeResponse(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    getHeader(name) {
      return res.getHeader(name);
    },
    json(payload) {
      if (!res.headersSent) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      res.end(JSON.stringify(payload));
      return this;
    },
    end(payload) {
      res.end(payload);
      return this;
    }
  };
}

function parseQuery(searchParams) {
  const query = {};

  for (const [key, value] of searchParams.entries()) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      if (Array.isArray(query[key])) {
        query[key].push(value);
      } else {
        query[key] = [query[key], value];
      }
    } else {
      query[key] = value;
    }
  }

  return query;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method !== "POST") {
      resolve({});
      return;
    }

    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      const contentType = req.headers["content-type"] || "";

      if (contentType.includes("application/json")) {
        try {
          resolve(JSON.parse(raw));
        } catch (_error) {
          resolve({});
        }
      } else {
        resolve(raw);
      }
    });

    req.on("error", reject);
  });
}

function isInsideRoot(targetPath, rootPath) {
  const relative = path.relative(rootPath, targetPath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative) || targetPath === rootPath;
}

function respondJson(res, code, payload) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function respondText(res, code, text) {
  res.statusCode = code;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(text);
}
