const { supabase } = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const payload = {
    ok: true,
    service: "fedex-tracking-clone-api",
    backend: supabase ? "supabase" : "in-memory",
    timestamp: new Date().toISOString()
  };

  if (supabase) {
    const { count, error } = await supabase
      .from("shipments")
      .select("id", { count: "exact", head: true });

    if (error) {
      return res.status(503).json({
        ok: false,
        service: payload.service,
        backend: payload.backend,
        error: `Supabase check failed: ${error.message}`,
        timestamp: payload.timestamp
      });
    }

    payload.shipmentCount = count || 0;
  }

  return res.status(200).json({
    ...payload
  });
};
