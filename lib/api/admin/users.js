const { listUsers } = require("./_store");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const users = listUsers(req);
    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to list users." });
  }
};