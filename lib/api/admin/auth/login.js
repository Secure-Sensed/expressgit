const {
  parseBody,
  normalizeEmail,
  verifyAdminCredentials,
  toPublicAdmin,
  setAdminSession
} = require("../../_admin_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const body = parseBody(req.body);
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    if (!verifyAdminCredentials(email, password)) {
      return res.status(401).json({ error: "Invalid admin credentials." });
    }

    const admin = toPublicAdmin();
    setAdminSession(res, admin);

    return res.status(200).json({
      message: "Admin logged in.",
      admin
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Unable to log in."
    });
  }
};
