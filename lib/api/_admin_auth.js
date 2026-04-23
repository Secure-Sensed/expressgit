const crypto = require("crypto");

const ADMIN_SESSION_COOKIE = "fdx_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  return process.env.AUTH_SECRET || "change-this-auth-secret";
}

function getAdminEmail() {
  return normalizeEmail(process.env.ADMIN_EMAIL || "admin@fedex.local");
}

function getAdminPassword() {
  return String(process.env.ADMIN_PASSWORD || "admin12345");
}

function getAdminName() {
  return String(process.env.ADMIN_NAME || "FedEx Admin");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function parseCookies(req) {
  const raw = req.headers && req.headers.cookie ? req.headers.cookie : "";
  return raw.split(";").reduce((cookies, pair) => {
    const index = pair.indexOf("=");
    if (index < 0) return cookies;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || "/"}`);
  parts.push(`SameSite=${options.sameSite || "Lax"}`);

  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }

  const isSecure = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (isSecure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function appendSetCookie(res, cookie) {
  const existing = res.getHeader ? res.getHeader("Set-Cookie") : undefined;
  if (!existing) {
    res.setHeader("Set-Cookie", [cookie]);
    return;
  }

  const current = Array.isArray(existing) ? existing : [existing];
  res.setHeader("Set-Cookie", [...current, cookie]);
}

function signValue(data) {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("hex");
}

function createSignedPayload(payload) {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json, "utf8").toString("base64url");
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

function verifySignedPayload(token) {
  if (!token || typeof token !== "string") return null;

  const split = token.lastIndexOf(".");
  if (split < 1) return null;

  const encoded = token.slice(0, split);
  const signature = token.slice(split + 1);
  const expected = signValue(encoded);
  const isValid = safeEqual(signature, expected);
  if (!isValid) return null;

  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    return JSON.parse(json);
  } catch (_error) {
    return null;
  }
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") return JSON.parse(body);
  return body;
}

function setAdminSession(res, user) {
  const payload = createSignedPayload({
    email: normalizeEmail(user.email),
    name: String(user.name || "").trim(),
    exp: Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000
  });

  appendSetCookie(
    res,
    serializeCookie(ADMIN_SESSION_COOKIE, payload, {
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      httpOnly: true
    })
  );
}

function clearAdminSession(res) {
  appendSetCookie(
    res,
    serializeCookie(ADMIN_SESSION_COOKIE, "", {
      maxAge: 0,
      httpOnly: true
    })
  );
}

function getAdminSession(req) {
  const cookies = parseCookies(req);
  const payload = verifySignedPayload(cookies[ADMIN_SESSION_COOKIE]);

  if (!payload || !payload.email || !payload.exp) return null;
  if (Date.now() > Number(payload.exp)) return null;

  return {
    email: normalizeEmail(payload.email),
    name: String(payload.name || "").trim()
  };
}

function verifyAdminCredentials(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const expectedEmail = getAdminEmail();
  const expectedPassword = getAdminPassword();
  return normalizedEmail === expectedEmail && String(password || "") === expectedPassword;
}

function toPublicAdmin() {
  return {
    email: getAdminEmail(),
    name: getAdminName()
  };
}

function requireAdmin(req, res) {
  const session = getAdminSession(req);
  if (!session) {
    res.status(401).json({ error: "Admin authentication required." });
    return null;
  }
  return session;
}

module.exports = {
  parseBody,
  normalizeEmail,
  verifyAdminCredentials,
  toPublicAdmin,
  setAdminSession,
  getAdminSession,
  clearAdminSession,
  requireAdmin
};
