const { supabase } = require("./_supabase");
const { requireAdmin } = require("./_admin_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    return handleListVehicles(req, res);
  } else if (req.method === "POST") {
    return handleCreateVehicle(req, res);
  } else {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
};

async function handleListVehicles(req, res) {
  try {
    // If using Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          *,
          driver:users(id, name, email, phone)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        message: "Vehicles retrieved.",
        vehicles: data || [],
        count: (data || []).length
      });
    }

    return res.status(200).json({ message: "Vehicles retrieved.", vehicles: [], count: 0 });
  } catch (error) {
    return res
      .status(400)
      .json({ error: error.message || "Failed to list vehicles." });
  }
}

async function handleCreateVehicle(req, res) {
  try {
    const body = JSON.parse(req.body || "{}");
    const { vehicleNumber, vehicleType, driverId } = body;

    if (!vehicleNumber || !vehicleType) {
      return res
        .status(400)
        .json({ error: "vehicleNumber and vehicleType required." });
    }

    // If using Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from("vehicles")
        .insert([
          {
            vehicle_number: vehicleNumber,
            vehicle_type: vehicleType,
            driver_id: driverId,
            status: "available",
            last_location_lat: 0,
            last_location_lng: 0
          }
        ])
        .select();

      if (error) throw error;

      return res.status(201).json({
        message: "Vehicle created.",
        vehicle: data?.[0]
      });
    }

    // Fallback: Mock response
    return res.status(201).json({
      message: "Vehicle created.",
      vehicle: {
        id: Date.now(),
        vehicleNumber,
        vehicleType,
        driverId,
        status: "available",
        lastLocationLat: 0,
        lastLocationLng: 0,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    return res
      .status(400)
      .json({ error: error.message || "Failed to create vehicle." });
  }
}
