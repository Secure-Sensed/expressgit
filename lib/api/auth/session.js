const { getSession, toPublicUser } = require("../_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const session = getSession(req);

  return res.status(200).json({
    user: session ? toPublicUser(session) : null
  });
};
