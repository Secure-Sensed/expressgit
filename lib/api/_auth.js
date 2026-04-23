const crypto = require("crypto");

const SESSION_COOKIE = "fdx_session";
const USERS_COOKIE = "fdx_users";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const USERS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSecret() {
  return process.env.AUTH_SECRET || "change-this-auth-secret";
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (_error) {
      throw new Error("Invalid JSON payload.");
    }
  }
  return body;
}

function parseCookies(req) {
  const raw = req.headers && req.headers.cookie ? req.headers.cookie : "";

  return raw.split(";").reduce((cookies, pair) => {
    const index = pair.indexOf("=");
    if (index < 0) return cookies;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    try {
      cookies[key] = decodeURIComponent(value);
    } catch (_error) {
      cookies[key] = value;
    }
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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return EMAIL_REGEX.test(normalizeEmail(value));
}

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function hashPassword(email, password) {
  return crypto
    .createHash("sha256")
    .update(`${getSecret()}|${normalizeEmail(email)}|${String(password || "")}`)
    .digest("hex");
}

async function getUsers(req) {
  // Try to get users from database first
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("email, name, created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data.map(user => ({
          name: String(user.name || "").trim(),
          email: normalizeEmail(user.email),
          createdAt: user.created_at
        }));
      }
    } catch (error) {
      console.error("Database getUsers failed:", error);
    }
  }

  // Fallback to cookies if database is not available
  const cookies = parseCookies(req);
  const payload = verifySignedPayload(cookies[USERS_COOKIE]);

  if (!payload || !Array.isArray(payload.users)) {
    return [];
  }

  return payload.users
    .map((user) => ({
      name: String(user && user.name ? user.name : "").trim(),
      email: normalizeEmail(user && user.email ? user.email : ""),
      passwordHash: String(user && user.passwordHash ? user.passwordHash : ""),
      createdAt: String(user && user.createdAt ? user.createdAt : "")
    }))
    .filter((user) => user.name && isValidEmail(user.email) && user.passwordHash);
}

async function setUsers(res, users) {
  // Try to save users to database first
  if (supabase) {
    try {
      const dbUsers = users.map(user => ({
        email: user.email,
        name: user.name,
        created_at: user.createdAt
      }));

      const { error } = await supabase
        .from("users")
        .upsert(dbUsers, { onConflict: "email" });

      if (!error) {
        // Successfully saved to database, no need for cookies
        return;
      }
    } catch (error) {
      console.error("Database setUsers failed:", error);
    }
  }

  // Fallback to cookies if database is not available
  const payload = createSignedPayload({ users });
  appendSetCookie(
    res,
    serializeCookie(USERS_COOKIE, payload, {
      maxAge: USERS_MAX_AGE_SECONDS,
      httpOnly: true
    })
  );
}

function setSession(res, user) {
  const payload = createSignedPayload({
    email: user.email,
    name: user.name,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  });

  appendSetCookie(
    res,
    serializeCookie(SESSION_COOKIE, payload, {
      maxAge: SESSION_MAX_AGE_SECONDS,
      httpOnly: true
    })
  );
}

function clearSession(res) {
  appendSetCookie(
    res,
    serializeCookie(SESSION_COOKIE, "", {
      maxAge: 0,
      httpOnly: true
    })
  );
}

function getSession(req) {
  const cookies = parseCookies(req);
  const payload = verifySignedPayload(cookies[SESSION_COOKIE]);

  if (!payload || !payload.email || !payload.exp) return null;
  if (Date.now() > Number(payload.exp)) return null;

  const email = normalizeEmail(payload.email);
  if (!isValidEmail(email)) return null;

  const users = getUsers(req);
  const existing = users.find((user) => user.email === email);
  if (!existing) return null;

  return {
    email: existing.email,
    name: existing.name
  };
}

function toPublicUser(user) {
  return {
    email: normalizeEmail(user.email),
    name: String(user.name || "").trim()
  };
}

module.exports = {
  parseBody,
  normalizeEmail,
  isValidEmail,
  hashPassword,
  getUsers,
  setUsers,
  getSession,
  setSession,
  clearSession,
  toPublicUser
};
