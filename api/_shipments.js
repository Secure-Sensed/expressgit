const SAMPLE_SHIPMENTS = [
  {
    trackingNumber: "771975185243",
    referenceNumber: "REF-INTL-1001",
    tcn: "TCN-99450001",
    status: "In Transit",
    origin: "Memphis, TN",
    destination: "Lagos, NG",
    estimatedDelivery: "2026-02-10T16:30:00Z",
    lastLocation: "Paris, FR",
    events: [
      {
        title: "In transit",
        timestamp: "2026-02-07T07:25:00Z",
        location: "Paris, FR",
        details: "Departed FedEx location"
      },
      {
        title: "At local facility",
        timestamp: "2026-02-06T19:10:00Z",
        location: "Paris, FR",
        details: "Arrived at FedEx hub"
      },
      {
        title: "Shipment information sent to FedEx",
        timestamp: "2026-02-05T14:02:00Z",
        location: "Memphis, TN",
        details: "Label created"
      }
    ]
  },
  {
    trackingNumber: "794848183811",
    referenceNumber: "REF-NA-7730",
    tcn: "TCN-99450002",
    status: "Delivered",
    origin: "Indianapolis, IN",
    destination: "Atlanta, GA",
    estimatedDelivery: "2026-02-06T18:00:00Z",
    lastLocation: "Atlanta, GA",
    events: [
      {
        title: "Delivered",
        timestamp: "2026-02-06T15:42:00Z",
        location: "Atlanta, GA",
        details: "Delivered to front desk"
      },
      {
        title: "Out for delivery",
        timestamp: "2026-02-06T10:18:00Z",
        location: "Atlanta, GA",
        details: "On FedEx vehicle"
      },
      {
        title: "At destination sort facility",
        timestamp: "2026-02-06T04:11:00Z",
        location: "Atlanta, GA",
        details: "Package sorted"
      }
    ],
    proofOfDelivery: {
      deliveredAt: "2026-02-06T15:42:00Z",
      receivedBy: "M. DANIELS",
      signature: "M. Daniels"
    }
  },
  {
    trackingNumber: "802516839204",
    referenceNumber: "REF-OPS-2208",
    tcn: "TCN-99450003",
    status: "Out for Delivery",
    origin: "Dallas, TX",
    destination: "Austin, TX",
    estimatedDelivery: "2026-02-07T20:00:00Z",
    lastLocation: "Austin, TX",
    events: [
      {
        title: "Out for delivery",
        timestamp: "2026-02-07T12:28:00Z",
        location: "Austin, TX",
        details: "Courier dispatched"
      },
      {
        title: "At destination sort facility",
        timestamp: "2026-02-07T08:15:00Z",
        location: "Austin, TX",
        details: "Ready for delivery"
      },
      {
        title: "In transit",
        timestamp: "2026-02-06T20:50:00Z",
        location: "Dallas, TX",
        details: "Departed origin facility"
      }
    ]
  },
  {
    trackingNumber: "612837450901",
    referenceNumber: "REF-MED-3310",
    tcn: "TCN-99450004",
    status: "Exception",
    origin: "Phoenix, AZ",
    destination: "Newark, NJ",
    estimatedDelivery: "2026-02-09T23:59:00Z",
    lastLocation: "St. Louis, MO",
    events: [
      {
        title: "Operational delay",
        timestamp: "2026-02-07T02:31:00Z",
        location: "St. Louis, MO",
        details: "Weather exception"
      },
      {
        title: "In transit",
        timestamp: "2026-02-06T16:20:00Z",
        location: "St. Louis, MO",
        details: "Arrived at FedEx location"
      }
    ]
  },
  {
    trackingNumber: "771975185999",
    referenceNumber: "REF-RET-4488",
    tcn: "TCN-99450005",
    status: "Created",
    origin: "Seattle, WA",
    destination: "Portland, OR",
    estimatedDelivery: "2026-02-11T23:00:00Z",
    lastLocation: "Seattle, WA",
    events: [
      {
        title: "Shipment information sent to FedEx",
        timestamp: "2026-02-07T09:15:00Z",
        location: "Seattle, WA",
        details: "Label created"
      }
    ]
  },
  {
    trackingNumber: "998811005544",
    referenceNumber: "REF-BULK-7781",
    tcn: "TCN-99450006",
    status: "At Destination",
    origin: "Newark, NJ",
    destination: "Brooklyn, NY",
    estimatedDelivery: "2026-02-08T19:00:00Z",
    lastLocation: "Brooklyn, NY",
    events: [
      {
        title: "At destination sort facility",
        timestamp: "2026-02-07T11:44:00Z",
        location: "Brooklyn, NY",
        details: "Package processing"
      },
      {
        title: "In transit",
        timestamp: "2026-02-07T02:03:00Z",
        location: "Newark, NJ",
        details: "Departed origin"
      }
    ]
  }
];

module.exports = {
  SAMPLE_SHIPMENTS
};
