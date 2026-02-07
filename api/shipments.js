const { listShipments } = require("./_store");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const shipments = listShipments();

  return res.status(200).json({
    count: shipments.length,
    shipments
  });
};
