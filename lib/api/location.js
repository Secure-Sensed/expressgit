const { supabase } = require("./_supabase");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "POST") {
    return handleLocationUpdate(req, res);
  } else if (req.method === "GET") {
    return handleGetLocation(req, res);
  } else {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
};

// POST /api/location - Update vehicle/shipment location
async function handleLocationUpdate(req, res) {
  try {
    const body = JSON.parse(req.body || "{}");
    const { shipmentId, vehicleId, latitude, longitude, accuracy, heading, speed, address } = body;

    if (!shipmentId && !vehicleId) {
      return res.status(400).json({ error: "shipmentId or vehicleId required." });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "latitude and longitude required." });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: "Invalid coordinates." });
    }

    // If using Supabase, insert location event
    if (supabase) {
      const { data, error } = await supabase
        .from("location_events")
        .insert([
          {
            shipment_id: shipmentId,
            vehicle_id: vehicleId,
            latitude,
            longitude,
            accuracy_meters: accuracy,
            heading,
            speed_kmh: speed,
            address,
            timestamp: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      return res.status(201).json({
        message: "Location updated successfully.",
        event: data?.[0]
      });
    }

    // Fallback: in-memory tracking for demo
    const event = {
      id: Date.now(),
      shipmentId,
      vehicleId,
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      address,
      timestamp: new Date().toISOString()
    };

    return res.status(201).json({
      message: "Location updated successfully.",
      event
    });
  } catch (error) {
    return res
      .status(400)
      .json({ error: error.message || "Failed to update location." });
  }
}

// GET /api/location?shipmentId=XXX or vehicleId=XXX
async function handleGetLocation(req, res) {
  try {
    const { shipmentId, vehicleId } = req.query;

    if (!shipmentId && !vehicleId) {
      return res.status(400).json({ error: "shipmentId or vehicleId required." });
    }

    // If using Supabase
    if (supabase) {
      let query = supabase
        .from("location_events")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(1);

      if (shipmentId) {
        query = query.eq("shipment_id", shipmentId);
      } else if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ error: "No location data found." });
      }

      return res.status(200).json({
        location: data[0]
      });
    }

    // Fallback: return mock data
    return res.status(200).json({
      location: {
        id: Date.now(),
        shipmentId,
        vehicleId,
        latitude: 40.7128,
        longitude: -74.006,
        address: "New York, NY",
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return res
      .status(400)
      .json({ error: error.message || "Failed to fetch location." });
  }
}
