const {
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
    const adminEmail = "fedex@admin.com";
    const adminPassword = "Usermain12";
    const adminName = "FedEx Admin";

    const users = getUsers(req);

    // Check if admin already exists
    const existing = users.find((user) => normalizeEmail(user.email) === normalizeEmail(adminEmail));
    if (existing) {
      return res.status(200).json({
        message: "Admin user already exists.",
        user: toPublicUser(existing)
      });
    }

    // Create admin user
    const adminUser = {
      name: adminName,
      email: adminEmail,
      passwordHash: hashPassword(adminEmail, adminPassword),
      createdAt: new Date().toISOString()
    };

    users.push(adminUser);
    setUsers(res, users);
    setSession(res, adminUser);

    return res.status(201).json({
      message: "Admin user created successfully.",
      user: toPublicUser(adminUser),
      credentials: {
        email: adminEmail,
        password: adminPassword
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to seed admin user." });
  }
};
