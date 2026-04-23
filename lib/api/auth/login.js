const {
  parseBody,
  normalizeEmail,
  isValidEmail,
  hashPassword,
  getUsers,
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
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (password.length > 128) {
      return res.status(400).json({ error: "Password must be 128 characters or fewer." });
    }

    const users = getUsers(req);
    const foundUser = users.find((item) => normalizeEmail(item.email) === email);

    if (!foundUser) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordHash = hashPassword(email, password);
    const user = foundUser.passwordHash === passwordHash ? foundUser : null;

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    setSession(res, user);

    return res.status(200).json({
      message: "Logged in.",
      user: toPublicUser(user)
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Unable to log in."
    });
  }
};
