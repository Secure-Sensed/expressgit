const {
  parseBody,
  normalizeEmail,
  hashPassword,
  getUsers,
  setUsers,
  setSession,
  toPublicUser
} = require("../_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const body = parseBody(req.body);
    const name = String(body.name || "").trim();
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (name.length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters." });
    }

    if (!isEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const users = getUsers(req);

    if (users.length >= 25) {
      return res.status(400).json({ error: "User limit reached for this session." });
    }

    const existing = users.find((user) => normalizeEmail(user.email) === email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const user = {
      name,
      email,
      passwordHash: hashPassword(email, password),
      createdAt: new Date().toISOString()
    };

    users.push(user);
    setUsers(res, users);
    setSession(res, user);

    return res.status(201).json({
      message: "Account created successfully.",
      user: toPublicUser(user)
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to create account." });
  }
};

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}
