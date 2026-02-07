const {
  parseBody,
  normalizeEmail,
  hashPassword,
  getUsers,
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
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!isEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const users = getUsers(req);
    const user = users.find((item) => normalizeEmail(item.email) === email);

    if (!user) {
      return res.status(401).json({ error: "No account found. Sign up first." });
    }

    const passwordHash = hashPassword(email, password);
    if (passwordHash !== user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    setSession(res, user);

    return res.status(200).json({
      message: "Logged in successfully.",
      user: toPublicUser(user)
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to login." });
  }
};

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}
