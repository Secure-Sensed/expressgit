const CATEGORIES = ["news", "grants", "updates"];

let subscribers = [];
let updates = [
  {
    id: "u-1001",
    category: "news",
    title: "Program newsletter available",
    body: "This month\'s Nigeria newsletter is now available.",
    countries: ["nigeria"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
  },
  {
    id: "u-1002",
    category: "grants",
    title: "Grant intake window open",
    body: "Applications for community support grants are now open.",
    countries: ["nigeria"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: "u-1003",
    category: "updates",
    title: "Organizational update",
    body: "Program operations for Nigeria have expanded to additional zones.",
    countries: ["nigeria"],
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  }
];

function subscribe({ country, email, categories }) {
  const normalizedCountry = normalize(country);
  const normalizedEmail = normalizeEmail(email);
  const normalizedCategories = normalizeCategories(categories);

  if (normalizedCountry !== "nigeria") {
    throw new Error("Subscription is available only on Nigeria pages.");
  }

  if (!isEmail(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  if (!normalizedCategories.length) {
    throw new Error("Select at least one category.");
  }

  const existingIndex = subscribers.findIndex((item) => item.email === normalizedEmail);
  const nextRecord = {
    email: normalizedEmail,
    country: normalizedCountry,
    categories: normalizedCategories,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    subscribers[existingIndex] = nextRecord;
  } else {
    subscribers.unshift(nextRecord);
  }

  return nextRecord;
}

function getSubscriber(email) {
  const normalizedEmail = normalizeEmail(email);
  return subscribers.find((item) => item.email === normalizedEmail) || null;
}

function getUpdatesForEmail(email) {
  const subscriber = getSubscriber(email);
  if (!subscriber) return [];

  return updates
    .filter((item) => {
      const countryMatch = !item.countries || item.countries.includes(subscriber.country);
      const categoryMatch = subscriber.categories.includes(item.category);
      return countryMatch && categoryMatch;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20)
    .map((item) => ({ ...item }));
}

function publishUpdate({ title, body, category, countries }) {
  const normalizedCategory = normalize(category);

  if (!CATEGORIES.includes(normalizedCategory)) {
    throw new Error("Invalid update category.");
  }

  const update = {
    id: `u-${Date.now()}`,
    category: normalizedCategory,
    title: String(title || "Update").trim(),
    body: String(body || "").trim(),
    countries: Array.isArray(countries) && countries.length ? countries.map(normalize) : ["nigeria"],
    createdAt: new Date().toISOString()
  };

  updates.unshift(update);
  return { ...update };
}

function normalizeCategories(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => normalize(value))
    .filter((value) => CATEGORIES.includes(value))
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeEmail(value) {
  return normalize(value);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

module.exports = {
  subscribe,
  getSubscriber,
  getUpdatesForEmail,
  publishUpdate,
  isEmail
};
