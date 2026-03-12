const supportMessages = [];

function nowIso() {
  return new Date().toISOString();
}

function normalizeTracking(value) {
  return String(value || "").trim().toUpperCase();
}

function addMessage({ trackingNumber, from, body }) {
  const tracking = normalizeTracking(trackingNumber);
  if (!tracking) throw new Error("trackingNumber is required.");
  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    trackingNumber: tracking,
    from: from === "admin" ? "admin" : "user",
    body: String(body || "").trim(),
    timestamp: nowIso()
  };
  if (!message.body) throw new Error("message body is required.");
  supportMessages.push(message);
  return message;
}

function listMessages(trackingNumber) {
  const tracking = normalizeTracking(trackingNumber);
  return supportMessages
    .filter((m) => m.trackingNumber === tracking)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function listThreads(limit = 30) {
  const threads = new Map();
  for (const msg of supportMessages) {
    const existing = threads.get(msg.trackingNumber);
    if (!existing || new Date(msg.timestamp) > new Date(existing.timestamp)) {
      threads.set(msg.trackingNumber, msg);
    }
  }
  return Array.from(threads.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
    .map((msg) => ({
      trackingNumber: msg.trackingNumber,
      lastMessage: msg.body,
      from: msg.from,
      timestamp: msg.timestamp
    }));
}

module.exports = {
  addMessage,
  listMessages,
  listThreads
};
