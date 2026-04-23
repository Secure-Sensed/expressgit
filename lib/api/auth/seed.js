const {
  parseBody,
  normalizeEmail,
  isValidEmail,
  hashPassword,
  setUsers,
  setSession,
  toPublicUser
} = require("../_auth");

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
    const inputUsers = Array.isArray(body.users) && body.users.length
      ? body.users
      : [
          {
            name: "Demo User",
            email: "demo@example.com",
            password: "password123"
          }
        ];

    const users = [];

    for (const input of inputUsers) {
      const name = String(input.name || "").trim();
      const email = normalizeEmail(input.email);
      const password = String(input.password || "");

      if (!name || !email || password.length < 8) {
        return res.status(400).json({
          error: "Each seeded user needs name, email, and password (8+ chars)."
        });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({
          error: `Invalid email in seed payload: ${email}`
        });
      }

      users.push({
        name,
        email,
        passwordHash: hashPassword(email, password),
        createdAt: new Date().toISOString()
      });
    }

    setUsers(res, users);
    setSession(res, users[0]);

    return res.status(200).json({
      message: "Users seeded.",
      count: users.length,
      user: toPublicUser(users[0])
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Unable to seed users."
    });
  }
};
