const { getAdminSession } = require("../../_admin_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const session = getAdminSession(req);
  return res.status(200).json({ admin: session || null });
};
