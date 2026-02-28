const { deleteUser } = require("./_store");
const { setUsers } = require("./_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const users = deleteUser(req, email);
    // persist new user list in cookie
    setUsers(res, users);

    return res.status(200).json({ action: "deleted", email });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to remove user." });
  }
};