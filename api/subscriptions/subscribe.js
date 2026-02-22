const { subscribe, getUpdatesForEmail } = require("../_subscriptions");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const body = parseBody(req.body);
    const record = subscribe({
      country: body.country,
      email: body.email,
      categories: body.categories
    });

    const updates = getUpdatesForEmail(record.email);

    return res.status(200).json({
      message: "Subscription successful. You will now receive updates in real time.",
      subscriber: record,
      updates
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Unable to process subscription."
    });
  }
};

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    return JSON.parse(body);
  }
  return body;
}
