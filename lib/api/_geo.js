// Place name -> coordinates.
// 1. Built-in gazetteer (instant, works offline / without any API key)
// 2. Google Geocoding API when GOOGLE_MAPS_SERVER_KEY is set (any address worldwide)

const https = require("https");

// [name, lat, lng] — keys are matched on a normalised "city" or "city, region" string.
const PLACES = [
  // United States
  ["new york, ny", 40.7128, -74.006], ["los angeles, ca", 34.0522, -118.2437],
  ["chicago, il", 41.8781, -87.6298], ["houston, tx", 29.7604, -95.3698],
  ["phoenix, az", 33.4484, -112.074], ["philadelphia, pa", 39.9526, -75.1652],
  ["san antonio, tx", 29.4241, -98.4936], ["san diego, ca", 32.7157, -117.1611],
  ["dallas, tx", 32.7767, -96.797], ["austin, tx", 30.2672, -97.7431],
  ["san jose, ca", 37.3382, -121.8863], ["san francisco, ca", 37.7749, -122.4194],
  ["seattle, wa", 47.6062, -122.3321], ["portland, or", 45.5152, -122.6784],
  ["denver, co", 39.7392, -104.9903], ["fort collins, co", 40.5853, -105.0844],
  ["las vegas, nv", 36.1699, -115.1398], ["salt lake city, ut", 40.7608, -111.891],
  ["minneapolis, mn", 44.9778, -93.265], ["kansas city, mo", 39.0997, -94.5786],
  ["st. louis, mo", 38.627, -90.1994], ["saint louis, mo", 38.627, -90.1994],
  ["memphis, tn", 35.1495, -90.049], ["nashville, tn", 36.1627, -86.7816],
  ["indianapolis, in", 39.7684, -86.1581], ["columbus, oh", 39.9612, -82.9988],
  ["cleveland, oh", 41.4993, -81.6944], ["cincinnati, oh", 39.1031, -84.512],
  ["detroit, mi", 42.3314, -83.0458], ["pittsburgh, pa", 40.4406, -79.9959],
  ["atlanta, ga", 33.749, -84.388], ["miami, fl", 25.7617, -80.1918],
  ["orlando, fl", 28.5383, -81.3792], ["tampa, fl", 27.9506, -82.4572],
  ["jacksonville, fl", 30.3322, -81.6557], ["charlotte, nc", 35.2271, -80.8431],
  ["raleigh, nc", 35.7796, -78.6382], ["richmond, va", 37.5407, -77.436],
  ["washington, dc", 38.9072, -77.0369], ["baltimore, md", 39.2904, -76.6122],
  ["newark, nj", 40.7357, -74.1724], ["boston, ma", 42.3601, -71.0589],
  ["new haven, ct", 41.3083, -72.9279], ["hartford, ct", 41.7658, -72.6734],
  ["providence, ri", 41.824, -71.4128], ["buffalo, ny", 42.8864, -78.8784],
  ["new orleans, la", 29.9511, -90.0715], ["oklahoma city, ok", 35.4676, -97.5164],
  ["louisville, ky", 38.2527, -85.7585], ["milwaukee, wi", 43.0389, -87.9065],
  ["omaha, ne", 41.2565, -95.9345], ["albuquerque, nm", 35.0844, -106.6504],
  ["boise, id", 43.615, -116.2023], ["sacramento, ca", 38.5816, -121.4944],
  ["anchorage, ak", 61.2181, -149.9003], ["honolulu, hi", 21.3099, -157.8581],
  // Canada / Mexico
  ["toronto, on", 43.6532, -79.3832], ["montreal, qc", 45.5017, -73.5673],
  ["vancouver, bc", 49.2827, -123.1207], ["calgary, ab", 51.0447, -114.0719],
  ["mexico city", 19.4326, -99.1332], ["guadalajara", 20.6597, -103.3496],
  ["monterrey", 25.6866, -100.3161],
  // Europe
  ["london", 51.5072, -0.1276], ["manchester", 53.4808, -2.2426],
  ["paris", 48.8566, 2.3522], ["paris, fr", 48.8566, 2.3522],
  ["lyon", 45.764, 4.8357], ["marseille", 43.2965, 5.3698],
  ["berlin", 52.52, 13.405], ["frankfurt", 50.1109, 8.6821],
  ["munich", 48.1351, 11.582], ["hamburg", 53.5511, 9.9937],
  ["amsterdam", 52.3676, 4.9041], ["rotterdam", 51.9244, 4.4777],
  ["brussels", 50.8503, 4.3517], ["madrid", 40.4168, -3.7038],
  ["barcelona", 41.3851, 2.1734], ["lisbon", 38.7223, -9.1393],
  ["rome", 41.9028, 12.4964], ["milan", 45.4642, 9.19],
  ["zurich", 47.3769, 8.5417], ["vienna", 48.2082, 16.3738],
  ["warsaw", 52.2297, 21.0122], ["prague", 50.0755, 14.4378],
  ["stockholm", 59.3293, 18.0686], ["copenhagen", 55.6761, 12.5683],
  ["oslo", 59.9139, 10.7522], ["helsinki", 60.1699, 24.9384],
  ["dublin", 53.3498, -6.2603], ["athens", 37.9838, 23.7275],
  ["istanbul", 41.0082, 28.9784],
  // Africa
  ["lagos", 6.5244, 3.3792], ["abuja", 9.0765, 7.3986],
  ["port harcourt", 4.8156, 7.0498], ["kano", 12.0022, 8.5919],
  ["ibadan", 7.3775, 3.947], ["uyo", 5.0377, 7.9128],
  ["enugu", 6.4584, 7.5464], ["benin city", 6.335, 5.6037],
  ["accra", 5.6037, -0.187], ["abidjan", 5.36, -4.0083],
  ["dakar", 14.7167, -17.4677], ["nairobi", -1.2921, 36.8219],
  ["addis ababa", 8.9806, 38.7578], ["kampala", 0.3476, 32.5825],
  ["dar es salaam", -6.7924, 39.2083], ["kigali", -1.9441, 30.0619],
  ["johannesburg", -26.2041, 28.0473], ["cape town", -33.9249, 18.4241],
  ["durban", -29.8587, 31.0218], ["cairo", 30.0444, 31.2357],
  ["casablanca", 33.5731, -7.5898], ["tunis", 36.8065, 10.1815],
  ["luanda", -8.839, 13.2894],
  // Middle East / Asia
  ["dubai", 25.2048, 55.2708], ["abu dhabi", 24.4539, 54.3773],
  ["riyadh", 24.7136, 46.6753], ["doha", 25.2854, 51.531],
  ["tel aviv", 32.0853, 34.7818], ["mumbai", 19.076, 72.8777],
  ["delhi", 28.7041, 77.1025], ["bangalore", 12.9716, 77.5946],
  ["chennai", 13.0827, 80.2707], ["karachi", 24.8607, 67.0011],
  ["dhaka", 23.8103, 90.4125], ["colombo", 6.9271, 79.8612],
  ["bangkok", 13.7563, 100.5018], ["singapore", 1.3521, 103.8198],
  ["kuala lumpur", 3.139, 101.6869], ["jakarta", -6.2088, 106.8456],
  ["manila", 14.5995, 120.9842], ["ho chi minh city", 10.8231, 106.6297],
  ["hong kong", 22.3193, 114.1694], ["shenzhen", 22.5431, 114.0579],
  ["guangzhou", 23.1291, 113.2644], ["shanghai", 31.2304, 121.4737],
  ["beijing", 39.9042, 116.4074], ["taipei", 25.033, 121.5654],
  ["seoul", 37.5665, 126.978], ["tokyo", 35.6762, 139.6503],
  ["osaka", 34.6937, 135.5023],
  // Oceania
  ["sydney", -33.8688, 151.2093], ["melbourne", -37.8136, 144.9631],
  ["brisbane", -27.4698, 153.0251], ["perth", -31.9505, 115.8605],
  ["auckland", -36.8485, 174.7633],
  // South America
  ["sao paulo", -23.5505, -46.6333], ["rio de janeiro", -22.9068, -43.1729],
  ["buenos aires", -34.6037, -58.3816], ["santiago", -33.4489, -70.6693],
  ["lima", -12.0464, -77.0428], ["bogota", 4.711, -74.0721],
  ["panama city", 8.9824, -79.5199]
];

const INDEX = new Map();
for (const [name, lat, lng] of PLACES) INDEX.set(normalise(name), { lat, lng });

function normalise(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lookupBuiltIn(place) {
  const key = normalise(place);
  if (!key) return null;
  if (INDEX.has(key)) return INDEX.get(key);

  // "Paris, France" / "Lagos, Nigeria" -> try the first segment on its own
  const first = key.split(",")[0].trim();
  if (INDEX.has(first)) return INDEX.get(first);

  // Strip trailing country/state words: "paris fr" -> "paris"
  for (const [name, coords] of INDEX) {
    if (key.startsWith(`${name} `) || key.startsWith(`${name},`)) return coords;
  }
  return null;
}

const cache = new Map();

function googleGeocode(place) {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!apiKey) return Promise.resolve(null);

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place)}&key=${apiKey}`;
  return new Promise((resolve) => {
    const request = https.get(url, { timeout: 4000 }, (response) => {
      let raw = "";
      response.on("data", (chunk) => { raw += chunk; });
      response.on("end", () => {
        try {
          const data = JSON.parse(raw);
          if (data.status === "OK" && data.results && data.results[0]) {
            const { lat, lng } = data.results[0].geometry.location;
            resolve({ lat, lng, formatted: data.results[0].formatted_address });
            return;
          }
          if (data.status && data.status !== "ZERO_RESULTS") {
            console.warn(`Geocoding API status: ${data.status} ${data.error_message || ""}`);
          }
        } catch (_error) { /* fall through */ }
        resolve(null);
      });
    });
    request.on("timeout", () => { request.destroy(); resolve(null); });
    request.on("error", () => resolve(null));
  });
}

async function geocode(place) {
  const key = normalise(place);
  if (!key || key === "unknown") return null;
  if (cache.has(key)) return cache.get(key);

  let result = lookupBuiltIn(place);
  if (!result) result = await googleGeocode(String(place));
  if (result) cache.set(key, result);
  return result;
}

function isMissing(value) {
  return value === undefined || value === null || value === "" || Number.isNaN(Number(value));
}

// Fills originLat/Lng, destinationLat/Lng and currentLat/Lng on a shipment
// input when a place name is present but coordinates are not.
async function resolveShipmentCoordinates(input) {
  const out = { ...input };
  const jobs = [
    ["origin", "originLat", "originLng"],
    ["destination", "destinationLat", "destinationLng"],
    ["lastLocation", "currentLat", "currentLng"]
  ];

  await Promise.all(jobs.map(async ([placeKey, latKey, lngKey]) => {
    if (!out[placeKey]) return;
    if (!isMissing(out[latKey]) && !isMissing(out[lngKey])) return;
    const point = await geocode(out[placeKey]);
    if (point) {
      out[latKey] = point.lat;
      out[lngKey] = point.lng;
    }
  }));

  return out;
}

function listPlaces() {
  return PLACES.map(([name, lat, lng]) => ({ name, lat, lng }));
}

module.exports = { geocode, resolveShipmentCoordinates, listPlaces, normalise };
