const AUTH_COPY = {
  signup: {
    submit: "Create Account",
    title: "Create your account"
  },
  login: {
    submit: "Log In",
    title: "Welcome back"
  }
};

const state = {
  authMode: "signup",
  authLoading: false,
  sessionUser: null,
  updatesTimer: null,
  updatesEmail: ""
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  markActiveNavigation();
  forcePageTopIfNeeded();
  wireAuth();
  wireUtilityButtons();
  wireSubscription();
  void hydrateSession();
}

function markActiveNavigation() {
  const currentFile = currentFileName();

  document.querySelectorAll(".global-nav a").forEach((link) => {
    const href = (link.getAttribute("href") || "").trim();
    if (!href) return;

    const linkFile = normalizeFile(href);
    const isHome = currentFile === "index.html" && linkFile === "index.html";
    const isNigeria = currentFile === "nigeria.html" && linkFile === "nigeria.html";
    const isCanada = currentFile.startsWith("canada") && linkFile === "canada.html";
    const isDonate = currentFile === "donate.html" && linkFile === "donate.html";

    if (isHome || isNigeria || isCanada || isDonate) {
      link.classList.add("current");
    }
  });

  document.querySelectorAll(".sub-nav a").forEach((link) => {
    const href = (link.getAttribute("href") || "").trim();
    if (!href || href.startsWith("#")) return;
    const linkFile = normalizeFile(href);
    if (linkFile === currentFile) {
      link.classList.add("current");
    }
  });
}

function forcePageTopIfNeeded() {
  const body = document.body;
  if (!body || body.dataset.forceTop !== "true") return;

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function wireUtilityButtons() {
  const profileButton = byId("profileButton");
  const searchButton = byId("searchButton");

  if (profileButton) {
    profileButton.addEventListener("click", () => {
      if (state.sessionUser) {
        alert(`Logged in as ${state.sessionUser.name || state.sessionUser.email}`);
      } else {
        openAuthModal();
      }
    });
  }

  if (searchButton) {
    searchButton.addEventListener("click", () => {
      const query = prompt("Search page: home, nigeria, canada, donate");
      if (!query) return;

      const value = query.trim().toLowerCase();
      if (value.includes("home")) location.href = "index.html";
      else if (value.includes("nigeria")) location.href = "nigeria.html";
      else if (value.includes("canada")) location.href = "canada.html";
      else if (value.includes("donate")) location.href = "donate.html";
      else alert("No matching page found.");
    });
  }
}

function wireAuth() {
  const authButton = byId("authButton");
  const logoutButton = byId("logoutButton");
  const authClose = byId("authClose");
  const authModal = byId("authModal");
  const authForm = byId("authForm");

  if (!authButton || !logoutButton || !authClose || !authModal || !authForm) {
    return;
  }

  authButton.addEventListener("click", openAuthModal);
  logoutButton.addEventListener("click", onLogout);
  authClose.addEventListener("click", closeAuthModal);

  authModal.addEventListener("click", (event) => {
    if (event.target === authModal) closeAuthModal();
  });

  document.querySelectorAll(".auth-mode").forEach((button) => {
    button.addEventListener("click", () => {
      setAuthMode(button.dataset.authMode);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAuthModal();
  });

  authForm.addEventListener("submit", onAuthSubmit);
  setAuthMode("signup");
}

function openAuthModal() {
  const authModal = byId("authModal");
  if (!authModal) return;

  authModal.classList.remove("hidden");
  authModal.setAttribute("aria-hidden", "false");
  showAuthMessage("", "");

  if (state.authMode === "signup") {
    byId("authName")?.focus();
  } else {
    byId("authEmail")?.focus();
  }
}

function closeAuthModal() {
  const authModal = byId("authModal");
  if (!authModal) return;
  authModal.classList.add("hidden");
  authModal.setAttribute("aria-hidden", "true");
}

function setAuthMode(mode) {
  if (!AUTH_COPY[mode]) return;
  state.authMode = mode;

  document.querySelectorAll(".auth-mode").forEach((button) => {
    const active = button.dataset.authMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  const authTitle = byId("authTitle");
  const authSubmit = byId("authSubmit");
  const authNameRow = byId("authNameRow");
  const authPassword = byId("authPassword");

  if (authTitle) authTitle.textContent = AUTH_COPY[mode].title;
  if (authSubmit) authSubmit.textContent = AUTH_COPY[mode].submit;

  if (mode === "signup") {
    authNameRow?.classList.remove("hidden");
    authPassword?.setAttribute("autocomplete", "new-password");
  } else {
    authNameRow?.classList.add("hidden");
    authPassword?.setAttribute("autocomplete", "current-password");
  }

  showAuthMessage("", "");
}

function setAuthLoading(isLoading) {
  state.authLoading = isLoading;

  const submit = byId("authSubmit");
  if (!submit) return;

  submit.disabled = isLoading;
  submit.textContent = isLoading ? "Please wait..." : AUTH_COPY[state.authMode].submit;
}

function showAuthMessage(text, type) {
  const message = byId("authMessage");
  if (!message) return;

  message.textContent = text;
  message.className = "auth-message";
  if (type) message.classList.add(type);
}

async function onAuthSubmit(event) {
  event.preventDefault();
  if (state.authLoading) return;

  const name = (byId("authName")?.value || "").trim();
  const email = (byId("authEmail")?.value || "").trim().toLowerCase();
  const password = byId("authPassword")?.value || "";

  if (!isEmail(email)) {
    showAuthMessage("Enter a valid email address.", "error");
    return;
  }

  if (password.length < 8) {
    showAuthMessage("Password must be at least 8 characters.", "error");
    return;
  }

  if (state.authMode === "signup" && name.length < 2) {
    showAuthMessage("Enter your full name.", "error");
    return;
  }

  setAuthLoading(true);
  showAuthMessage(state.authMode === "signup" ? "Creating account..." : "Logging in...", "");

  try {
    const payload = await fetchJson(`/api/auth/${state.authMode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    });

    updateSessionUI(payload.user || null);
    showAuthMessage(payload.message || "Success", "success");

    const authForm = byId("authForm");
    if (authForm) authForm.reset();

    closeAuthModal();
  } catch (error) {
    showAuthMessage(error.message || "Authentication failed.", "error");
  } finally {
    setAuthLoading(false);
  }
}

async function hydrateSession() {
  try {
    const payload = await fetchJson("/api/auth/session", { method: "GET" });
    updateSessionUI(payload.loggedIn ? payload.user : null);
  } catch (_error) {
    updateSessionUI(null);
  }
}

function updateSessionUI(user) {
  state.sessionUser = user || null;

  const authButton = byId("authButton");
  const sessionGreeting = byId("sessionGreeting");
  const logoutButton = byId("logoutButton");

  if (!authButton || !sessionGreeting || !logoutButton) return;

  if (!state.sessionUser) {
    authButton.classList.remove("hidden");
    sessionGreeting.classList.add("hidden");
    logoutButton.classList.add("hidden");
    sessionGreeting.textContent = "";
    return;
  }

  authButton.classList.add("hidden");
  sessionGreeting.classList.remove("hidden");
  logoutButton.classList.remove("hidden");
  sessionGreeting.textContent = `Hi, ${state.sessionUser.name || state.sessionUser.email}`;
}

async function onLogout() {
  try {
    await fetchJson("/api/auth/logout", { method: "POST" });
  } catch (_error) {
    // Ignore and clear UI anyway.
  }

  updateSessionUI(null);
  alert("You have been logged out.");
}

function wireSubscription() {
  const form = byId("subscriptionForm");
  if (!form) return;

  const savedEmail = localStorage.getItem("nigeria_subscription_email") || "";
  if (savedEmail) {
    const input = byId("subscriptionEmail");
    if (input) input.value = savedEmail;
    startUpdatesPolling(savedEmail);
  }

  form.addEventListener("submit", onSubscriptionSubmit);
}

async function onSubscriptionSubmit(event) {
  event.preventDefault();

  const email = (byId("subscriptionEmail")?.value || "").trim().toLowerCase();
  const checked = Array.from(document.querySelectorAll("input[name='subscriptionCategory']:checked"));
  const categories = checked.map((item) => item.value);

  if (!isEmail(email)) {
    showSubscriptionMessage("Enter a valid email address.", "error");
    return;
  }

  if (!categories.length) {
    showSubscriptionMessage("Select at least one category.", "error");
    return;
  }

  try {
    const payload = await fetchJson("/api/subscriptions/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        country: "nigeria",
        email,
        categories
      })
    });

    localStorage.setItem("nigeria_subscription_email", email);
    showSubscriptionMessage(payload.message || "Subscribed successfully.", "success");
    renderUpdates(payload.updates || []);
    startUpdatesPolling(email);
  } catch (error) {
    showSubscriptionMessage(error.message || "Unable to subscribe right now.", "error");
  }
}

function startUpdatesPolling(email) {
  state.updatesEmail = email;

  if (state.updatesTimer) {
    clearInterval(state.updatesTimer);
  }

  void fetchAndRenderUpdates(email);
  state.updatesTimer = setInterval(() => {
    void fetchAndRenderUpdates(state.updatesEmail);
  }, 10000);
}

async function fetchAndRenderUpdates(email) {
  if (!email) return;

  try {
    const payload = await fetchJson(`/api/subscriptions/updates?email=${encodeURIComponent(email)}`, {
      method: "GET"
    });
    renderUpdates(payload.updates || []);
  } catch (_error) {
    // Silent refresh errors.
  }
}

function renderUpdates(items) {
  const updatesList = byId("updatesList");
  if (!updatesList) return;

  updatesList.innerHTML = "";

  if (!items.length) {
    updatesList.innerHTML = "<li>No updates available yet for this subscription.</li>";
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <p class="update-meta">${escapeHtml((item.category || "update").toUpperCase())} • ${escapeHtml(formatDateTime(item.createdAt))}</p>
      <p class="update-title">${escapeHtml(item.title || "Update")}</p>
      <p class="update-body">${escapeHtml(item.body || "")}</p>
    `;
    updatesList.appendChild(li);
  });
}

function showSubscriptionMessage(text, type) {
  const message = byId("subscriptionMessage");
  if (!message) return;

  message.textContent = text;
  message.className = "subscription-message";
  if (type) message.classList.add(type);
}

async function fetchJson(url, options) {
  const opts = Object.assign({ credentials: "same-origin" }, options || {});
  const response = await fetch(url, opts);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

function currentFileName() {
  const raw = window.location.pathname.split("/").pop() || "index.html";
  return raw || "index.html";
}

function normalizeFile(value) {
  const clean = value.split("#")[0].split("?")[0].trim();
  if (!clean || clean === "/") return "index.html";
  return clean.split("/").pop() || "index.html";
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function byId(id) {
  return document.getElementById(id);
}
