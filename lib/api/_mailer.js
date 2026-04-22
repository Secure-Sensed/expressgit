const https = require("https");

function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

function postJson(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    }, (response) => {
      let raw = "";
      response.on("data", (chunk) => {
        raw += chunk;
      });
      response.on("end", () => {
        const statusCode = response.statusCode || 500;
        const parsed = raw ? parseJson(raw) : {};
        if (statusCode >= 200 && statusCode < 300) {
          resolve(parsed);
          return;
        }
        const message = parsed && parsed.message ? parsed.message : `Email API error: ${statusCode}`;
        reject(new Error(message));
      });
    });

    request.on("error", reject);
    request.write(JSON.stringify(payload));
    request.end();
  });
}

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return {};
  }
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toUTCString();
}

async function sendShipmentReceiverNotification({ shipment, action }) {
  const recipient = String(shipment && shipment.customerEmail ? shipment.customerEmail : "")
    .trim()
    .toLowerCase();

  if (!recipient) {
    return { sent: false, skipped: "missing-recipient" };
  }

  if (!hasResendConfig()) {
    return { sent: false, skipped: "email-not-configured" };
  }

  const trackingNumber = String(shipment.trackingNumber || "").trim();
  const status = String(shipment.status || "Updated");
  const location = String(shipment.lastLocation || "Unknown");
  const eta = formatDate(shipment.estimatedDelivery);
  const actionLabel = action === "created" ? "created" : "updated";
  const subject = `Shipment ${trackingNumber} ${actionLabel}`;

  const text = [
    `Tracking Number: ${trackingNumber}`,
    `Status: ${status}`,
    `Current Location: ${location}`,
    `Estimated Delivery: ${eta}`,
    "",
    "This is an automated shipment update."
  ].join("\n");

  const html = [
    "<div style=\"font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#222;\">",
    `<h2 style="margin:0 0 12px;color:#4d148c;">Shipment ${actionLabel}</h2>`,
    `<p><strong>Tracking Number:</strong> ${escapeHtml(trackingNumber)}</p>`,
    `<p><strong>Status:</strong> ${escapeHtml(status)}</p>`,
    `<p><strong>Current Location:</strong> ${escapeHtml(location)}</p>`,
    `<p><strong>Estimated Delivery:</strong> ${escapeHtml(eta)}</p>`,
    "<p style=\"margin-top:18px;\">This is an automated shipment update.</p>",
    "</div>"
  ].join("");

  const response = await postJson("https://api.resend.com/emails", {
    from: process.env.MAIL_FROM,
    to: [recipient],
    subject,
    text,
    html
  }, {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`
  });

  return {
    sent: true,
    provider: "resend",
    id: response && response.id ? response.id : null,
    to: recipient
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = {
  sendShipmentReceiverNotification
};
