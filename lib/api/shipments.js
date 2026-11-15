const { listShipments } = require("./_store");
const { toPublicShipment } = require("./_public");
const { getAdminSession } = require("./_admin_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    let shipments = await listShipments();
    const isAdmin = Boolean(getAdminSession(req));
    let ownerView = false;

    // Filter by owner. "me" is the signed-in customer; an explicit address is admin-only,
    // otherwise anyone could list another customer's shipments by guessing their email.
    if (req.query && req.query.owner === "me") {
      const { getSession } = require("./_auth");
      const session = await getSession(req);
      ownerView = Boolean(session && session.email);
      shipments = ownerView
        ? shipments.filter((s) => String(s.customerEmail || "").toLowerCase() === String(session.email).toLowerCase())
        : [];
    } else if (req.query && req.query.owner) {
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required." });
      }
      const owner = String(req.query.owner).toLowerCase();
      shipments = shipments.filter((s) => String(s.customerEmail || "").toLowerCase() === owner);
    }

    if (!isAdmin && !ownerView) {
      shipments = shipments.map(toPublicShipment);
    }

    return res.status(200).json({
      count: shipments.length,
      shipments
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unable to load shipments."
    });
  }
};
