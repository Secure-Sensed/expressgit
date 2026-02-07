const { clearSession } = require("../_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  clearSession(res);

  return res.status(200).json({
    message: "Logged out successfully."
  });
};
