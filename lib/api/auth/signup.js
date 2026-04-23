const {
  parseBody,
  normalizeEmail,
  isValidEmail,
  hashPassword,
  getUsers,
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
    const name = String(body.name || "").trim();
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    if (name.length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    if (password.length > 128) {
      return res.status(400).json({ error: "Password must be 128 characters or fewer." });
    }

    const users = await getUsers(req);
    const exists = users.some((user) => normalizeEmail(user.email) === email);
    if (exists) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const user = {
      name,
      email,
      passwordHash: hashPassword(email, password),
      createdAt: new Date().toISOString()
    };

    await setUsers(res, [user, ...users]);
    setSession(res, user);

    return res.status(201).json({
      message: "Account created.",
      user: toPublicUser(user)
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Unable to create account."
    });
  }
};
