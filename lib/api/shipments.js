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
    const all = await listShipments();
    const isAdmin = Boolean(getAdminSession(req));
    const { getSession } = require("./_auth");
    const owner = req.query && req.query.owner;
    let shipments = [];
    let ownerView = false;

    // The full list is never public: a tracking number is all it takes to read a shipment,
    // so anonymous callers get nothing here and must look a shipment up by its number.
    if (owner && owner !== "me") {
      // An explicit address is admin-only, otherwise anyone could read another customer's parcels.
      if (!isAdmin) return res.status(403).json({ error: "Admin access required." });
      shipments = all.filter((s) => String(s.customerEmail || "").toLowerCase() === String(owner).toLowerCase());
    } else if (isAdmin && !owner) {
      shipments = all;
    } else {
      const session = await getSession(req);
      ownerView = Boolean(session && session.email);
      if (ownerView) {
        shipments = all.filter((s) => String(s.customerEmail || "").toLowerCase() === String(session.email).toLowerCase());
      }
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
