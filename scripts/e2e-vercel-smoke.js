#!/usr/bin/env node
const assert = require("assert");
const { URL } = require("url");

const apiHandler = require("../api/index");

function normalizeHeaders(headers = {}) {
  return Object.entries(headers).reduce((acc, [key, value]) => {
    acc[String(key).toLowerCase()] = value;
    return acc;
  }, {});
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

function createMockResponse() {
  let statusCode = 200;
  const headers = {};
  let body = "";
  let ended = false;

  return {
    get headersSent() {
      return ended;
    },
    get statusCode() {
      return statusCode;
    },
    set statusCode(code) {
      statusCode = code;
    },
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
      return this;
    },
    getHeader(name) {
      return headers[String(name).toLowerCase()];
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      if (!headers["content-type"]) {
        headers["content-type"] = "application/json; charset=utf-8";
      }
      body = JSON.stringify(payload);
      ended = true;
      return this;
    },
    end(payload) {
      if (payload !== undefined) {
        body = typeof payload === "string" ? payload : String(payload);
      }
      ended = true;
      return this;
    },
    result() {
      let json = null;
      try {
        json = body ? JSON.parse(body) : null;
      } catch (_error) {
        json = null;
      }

      return {
        statusCode,
        headers,
        body,
        json
      };
    }
  };
}

function cookieHeaderFromJar(cookieJar) {
  const pairs = Object.entries(cookieJar).filter(([, value]) => value !== undefined && value !== null);
  if (!pairs.length) return "";
  return pairs.map(([name, value]) => `${name}=${encodeURIComponent(String(value))}`).join("; ");
}

function applySetCookieHeaders(cookieJar, headers) {
  const setCookie = headers["set-cookie"];
  if (!setCookie) return;

  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const cookie of cookies) {
    const pair = String(cookie).split(";", 1)[0];
    const index = pair.indexOf("=");
    if (index < 0) continue;
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    cookieJar[name] = decodeURIComponent(value);
  }
}

async function callApi(pathname, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const cookieJar = options.cookieJar || null;
  const headers = normalizeHeaders(options.headers || {});
  const body = options.body === undefined ? {} : options.body;

  if (cookieJar) {
    const cookieHeader = cookieHeaderFromJar(cookieJar);
    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }
  }

  const url = new URL(pathname, "http://localhost");
  const req = {
    method,
    url: `${url.pathname}${url.search}`,
    headers,
    query: parseQuery(url.searchParams),
    body
  };

  const res = createMockResponse();
  await apiHandler(req, res);

  const result = res.result();
  if (cookieJar) {
    applySetCookieHeaders(cookieJar, result.headers);
  }

  return result;
}

function assertStatus(result, expected, label) {
  assert.strictEqual(
    result.statusCode,
    expected,
    `${label}: expected HTTP ${expected}, got ${result.statusCode} with body ${result.body}`
  );
}

async function run() {
  const adminToken = process.env.ADMIN_API_TOKEN || "local-dev-token";
  const customerEmail = "qa-flow@example.com";
  const customerPassword = "password123";
  const trackingNumber = "TRK-QA-900";
  const userCookies = {};

  const health = await callApi("/api/health");
  assertStatus(health, 200, "health");
  assert.strictEqual(health.json.ok, true, "health: expected ok=true");

  const seeded = await callApi("/api/shipments");
  assertStatus(seeded, 200, "list seeded shipments");
  assert.ok(
    (seeded.json.shipments || []).some((item) => item.trackingNumber === "TRK-NYC-001"),
    "seeded shipments: expected TRK-NYC-001"
  );

  const trackSeeded = await callApi("/api/track?mode=tracking&q=TRK-NYC-001");
  assertStatus(trackSeeded, 200, "track seeded shipment");
  assert.strictEqual(trackSeeded.json.results[0].found, true, "track seeded: expected found=true");

  const upsertUnauthorized = await callApi("/api/admin/upsert", {
    method: "POST",
    body: {
      shipment: {
        trackingNumber: "TRK-UNAUTH-01",
        status: "in_transit",
        origin: "A",
        destination: "B",
        lastLocation: "C"
      }
    }
  });
  assertStatus(upsertUnauthorized, 401, "admin upsert unauthorized");

  const upsertAuthorized = await callApi("/api/admin/upsert", {
    method: "POST",
    headers: {
      "x-admin-token": adminToken
    },
    body: {
      shipment: {
        trackingNumber,
        status: "in_transit",
        origin: "Lagos, NG",
        destination: "Abuja, NG",
        lastLocation: "Ibadan, NG",
        customerEmail,
        customerName: "QA Flow User",
        currentLat: 7.3775,
        currentLng: 3.947
      }
    }
  });
  assertStatus(upsertAuthorized, 200, "admin upsert authorized");
  assert.strictEqual(upsertAuthorized.json.shipment.trackingNumber, trackingNumber);

  const updateLocation = await callApi("/api/admin/update-location", {
    method: "POST",
    headers: {
      "x-admin-token": adminToken
    },
    body: {
      trackingNumber,
      lastLocation: "Ilorin, NG",
      currentLat: 8.4966,
      currentLng: 4.5421
    }
  });
  assertStatus(updateLocation, 200, "admin update location");
  assert.strictEqual(updateLocation.json.shipment.lastLocation, "Ilorin, NG");

  const trackUpdated = await callApi(`/api/track?mode=tracking&q=${encodeURIComponent(trackingNumber)}`);
  assertStatus(trackUpdated, 200, "track updated shipment");
  assert.strictEqual(trackUpdated.json.results[0].shipment.lastLocation, "Ilorin, NG");

  const stats = await callApi("/api/admin/stats");
  assertStatus(stats, 200, "admin stats");
  assert.ok(stats.json.total >= 6, "admin stats: expected total >= 6");

  const signup = await callApi("/api/auth/signup", {
    method: "POST",
    cookieJar: userCookies,
    body: {
      name: "QA Flow User",
      email: customerEmail,
      password: customerPassword
    }
  });
  assertStatus(signup, 201, "signup");
  assert.strictEqual(signup.json.user.email, customerEmail);

  const session = await callApi("/api/auth/session", {
    method: "GET",
    cookieJar: userCookies
  });
  assertStatus(session, 200, "session");
  assert.strictEqual(session.json.user.email, customerEmail, "session: expected signed-in user");

  const mine = await callApi("/api/shipments?owner=me", {
    method: "GET",
    cookieJar: userCookies
  });
  assertStatus(mine, 200, "my parcels");
  assert.ok(
    (mine.json.shipments || []).some((item) => item.trackingNumber === trackingNumber),
    "my parcels: expected admin-created shipment assigned to user"
  );

  const requestNew = await callApi("/api/shipments/request", {
    method: "POST",
    cookieJar: userCookies,
    body: {
      origin: "Enugu, NG",
      destination: "Jos, NG",
      notes: "Fragile"
    }
  });
  assertStatus(requestNew, 201, "shipment request");
  assert.ok(requestNew.json.shipment && requestNew.json.shipment.trackingNumber, "shipment request: expected tracking");

  const usersBeforeDelete = await callApi("/api/admin/users", {
    method: "GET",
    cookieJar: userCookies
  });
  assertStatus(usersBeforeDelete, 200, "admin users list");
  assert.ok(
    (usersBeforeDelete.json.users || []).some((item) => item.email === customerEmail),
    "admin users list: expected signed-up user"
  );

  const deleteUser = await callApi("/api/admin/users/delete", {
    method: "POST",
    cookieJar: userCookies,
    body: { email: customerEmail }
  });
  assertStatus(deleteUser, 200, "admin delete user");

  const usersAfterDelete = await callApi("/api/admin/users", {
    method: "GET",
    cookieJar: userCookies
  });
  assertStatus(usersAfterDelete, 200, "admin users list after delete");
  assert.ok(
    !(usersAfterDelete.json.users || []).some((item) => item.email === customerEmail),
    "admin users list after delete: expected removed user"
  );

  const adminDelete = await callApi("/api/admin/delete", {
    method: "POST",
    headers: {
      "x-admin-token": adminToken
    },
    body: {
      trackingNumber
    }
  });
  assertStatus(adminDelete, 200, "admin delete shipment");
  assert.strictEqual(adminDelete.json.action, "deleted");

  const trackDeleted = await callApi(`/api/track?mode=tracking&q=${encodeURIComponent(trackingNumber)}`);
  assertStatus(trackDeleted, 200, "track deleted shipment");
  assert.strictEqual(trackDeleted.json.results[0].found, false, "deleted shipment should not be found");

  const logout = await callApi("/api/auth/logout", {
    method: "POST",
    cookieJar: userCookies
  });
  assertStatus(logout, 200, "logout");

  const mineAfterLogout = await callApi("/api/shipments?owner=me", {
    method: "GET",
    cookieJar: userCookies
  });
  assertStatus(mineAfterLogout, 200, "my parcels after logout");
  assert.strictEqual((mineAfterLogout.json.shipments || []).length, 0, "expected no shipments after logout");

  console.log("PASS: Vercel-style API smoke flow completed successfully.");
}

run().catch((error) => {
  console.error("FAIL:", error.message || error);
  process.exitCode = 1;
});
