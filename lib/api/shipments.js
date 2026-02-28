const { listShipments } = require("./_store");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    let shipments = await listShipments();

    // filter by owner if requested and session available
    if (req.query && req.query.owner && req.query.owner === "me") {
      const { getSession } = require("./_auth");
      const session = getSession(req);
      if (session && session.email) {
        shipments = shipments.filter(s => String(s.customerEmail || "").toLowerCase() === session.email);
      } else {
        shipments = [];
      }
    } else if (req.query && req.query.owner) {
      const owner = String(req.query.owner).toLowerCase();
      shipments = shipments.filter(s => String(s.customerEmail || "").toLowerCase() === owner);
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
