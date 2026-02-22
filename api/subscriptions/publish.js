const { publishUpdate } = require("../_subscriptions");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const expectedToken = process.env.ADMIN_API_TOKEN || "local-dev-token";
  const providedToken = req.headers["x-admin-token"];

  if (providedToken !== expectedToken) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  try {
    const body = parseBody(req.body);
    const update = publishUpdate({
      title: body.title,
      body: body.body,
      category: body.category,
      countries: body.countries
    });

    return res.status(201).json({
      message: "Update published.",
      update
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Unable to publish update."
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
