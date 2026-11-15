const nodemailer = require("nodemailer");

const BRAND_NAME = process.env.BRAND_NAME || "TransitLink";

function getConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host,
    port,
    // 465 = implicit TLS; 587/25 = STARTTLS upgrade
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: { user, pass },
    from: process.env.MAIL_FROM || `${BRAND_NAME} <${user}>`
  };
}

let cachedTransport = null;
let cachedKey = "";

function getTransport(config) {
  const key = `${config.host}:${config.port}:${config.auth.user}`;
  if (!cachedTransport || cachedKey !== key) {
    cachedTransport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      connectionTimeout: 10000,
      socketTimeout: 15000
    });
    cachedKey = key;
  }
  return cachedTransport;
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toUTCString();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function trackingUrl(trackingNumber) {
  const base = String(process.env.APP_URL || "").replace(/\/+$/, "");
  if (!base) return "";
  return `${base}/track?mode=tracking&q=${encodeURIComponent(trackingNumber)}`;
}

async function sendShipmentReceiverNotification({ shipment, action }) {
  const recipient = String(shipment && shipment.customerEmail ? shipment.customerEmail : "")
    .trim()
    .toLowerCase();

  if (!recipient) {
    return { sent: false, skipped: "missing-recipient" };
  }

  const config = getConfig();
  if (!config) {
    return { sent: false, skipped: "email-not-configured" };
  }

  const trackingNumber = String(shipment.trackingNumber || "").trim();
  const status = String(shipment.status || "Updated");
  const location = String(shipment.lastLocation || "Unknown");
  const eta = formatDate(shipment.estimatedDelivery);
  const actionLabel = action === "created" ? "created" : "updated";
  const link = trackingUrl(trackingNumber);
  const subject = `Shipment ${trackingNumber} ${actionLabel}`;

  const text = [
    `Tracking Number: ${trackingNumber}`,
    `Status: ${status}`,
    `Current Location: ${location}`,
    `Estimated Delivery: ${eta}`,
    link ? `\nTrack live: ${link}` : "",
    "",
    `This is an automated shipment update from ${BRAND_NAME}.`
  ].join("\n");

  const html = [
    "<div style=\"font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#222;max-width:520px;\">",
    `<h2 style="margin:0 0 12px;color:#0f3d5e;">Shipment ${actionLabel}</h2>`,
    `<p><strong>Tracking Number:</strong> ${escapeHtml(trackingNumber)}</p>`,
    `<p><strong>Status:</strong> ${escapeHtml(status)}</p>`,
    `<p><strong>Current Location:</strong> ${escapeHtml(location)}</p>`,
    `<p><strong>Estimated Delivery:</strong> ${escapeHtml(eta)}</p>`,
    link
      ? `<p style="margin:18px 0;"><a href="${escapeHtml(link)}" style="background:#0f3d5e;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px;display:inline-block;">Track live on map</a></p>`
      : "",
    `<p style="margin-top:18px;color:#6a6a6a;font-size:12px;">This is an automated shipment update from ${escapeHtml(BRAND_NAME)}.</p>`,
    "</div>"
  ].join("");

  const info = await getTransport(config).sendMail({
    from: config.from,
    to: recipient,
    subject,
    text,
    html
  });

  return {
    sent: true,
    provider: "smtp",
    id: info && info.messageId ? info.messageId : null,
    to: recipient
  };
}

module.exports = {
  sendShipmentReceiverNotification
};
