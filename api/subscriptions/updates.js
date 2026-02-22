const { getUpdatesForEmail, isEmail } = require("../_subscriptions");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const email = String((req.query && (req.query.email || req.query.e)) || "").trim().toLowerCase();

  if (!isEmail(email)) {
    return res.status(400).json({ error: "Valid email is required." });
  }

  const updates = getUpdatesForEmail(email);

  return res.status(200).json({
    email,
    updates,
    timestamp: new Date().toISOString()
  });
};
