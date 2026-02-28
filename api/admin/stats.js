const { stats } = require("../_store");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const data = await stats();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to compute stats." });
  }
};