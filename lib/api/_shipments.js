const SAMPLE_SHIPMENTS = [
  {
    trackingNumber: "TRK-NYC-001",
    referenceNumber: "REF-2024-NYC-001",
    tcn: "TCN-2024-001",
    origin: "New York, NY",
    originLat: 40.7128,
    originLng: -74.006,
    destination: "Boston, MA",
    destinationLat: 42.3601,
    destinationLng: -71.0589,
    status: "in_transit",
    currentLat: 41.5034,
    currentLng: -72.5555,
    lastLocation: "New Haven, CT",
    estimatedDelivery: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    events: [
      {
        title: "Package picked up",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        location: "New York, NY",
        details: "Picked up from shipper"
      }
    ]
  },
  {
    trackingNumber: "TRK-LA-002",
    referenceNumber: "REF-2024-LA-002",
    tcn: "TCN-2024-002",
    origin: "Los Angeles, CA",
    originLat: 34.0522,
    originLng: -118.2437,
    destination: "San Francisco, CA",
    destinationLat: 37.7749,
    destinationLng: -122.4194,
    status: "out_for_delivery",
    currentLat: 37.3382,
    currentLng: -121.8863,
    lastLocation: "San Jose, CA",
    estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    events: [
      {
        title: "Out for delivery",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        location: "San Jose, CA",
        details: "Package in delivery vehicle"
      }
    ]
  },
  {
    trackingNumber: "TRK-CHI-003",
    referenceNumber: "REF-2024-CHI-003",
    tcn: "TCN-2024-003",
    origin: "Chicago, IL",
    originLat: 41.8781,
    originLng: -87.6298,
    destination: "Denver, CO",
    destinationLat: 39.7392,
    destinationLng: -104.9903,
    status: "in_transit",
    currentLat: 40.437664,
    currentLng: -104.984853,
    lastLocation: "Fort Collins, CO",
    estimatedDelivery: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    events: [
      {
        title: "In transit",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        location: "Fort Collins, CO",
        details: "Package in delivery vehicle"
      }
    ]
  },
  {
    trackingNumber: "TRK-MIA-004",
    referenceNumber: "REF-2024-MIA-004",
    tcn: "TCN-2024-004",
    origin: "Miami, FL",
    originLat: 25.7617,
    originLng: -80.1918,
    destination: "Atlanta, GA",
    destinationLat: 33.749,
    destinationLng: -84.388,
    status: "delivered",
    currentLat: 33.749,
    currentLng: -84.388,
    lastLocation: "Atlanta, GA",
    estimatedDelivery: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    proofOfDelivery: {
      deliveredAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      receivedBy: "John Smith",
      signature: "On file"
    },
    events: [
      {
        title: "Delivered",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        location: "Atlanta, GA",
        details: "Package delivered"
      }
    ]
  },
  {
    trackingNumber: "TRK-SEA-005",
    referenceNumber: "REF-2024-SEA-005",
    tcn: "TCN-2024-005",
    origin: "Seattle, WA",
    originLat: 47.6062,
    originLng: -122.3321,
    destination: "Portland, OR",
    destinationLat: 45.5152,
    destinationLng: -122.6784,
    status: "pending",
    currentLat: 47.6062,
    currentLng: -122.3321,
    lastLocation: "Seattle, WA",
    estimatedDelivery: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    events: [
      {
        title: "Label created",
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        location: "Seattle, WA",
        details: "Shipping label created"
      }
    ]
  }
];

module.exports = {
  SAMPLE_SHIPMENTS
};
