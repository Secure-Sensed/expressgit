// ============================================================================
// Auth Modal & Session Management
// ============================================================================

let currentUser = null;
window.currentUser = currentUser;

const authElements = {
  modal: document.getElementById("authModal"),
  modalOverlay: document.querySelector("#authModal .modal-overlay"),
  modalClose: document.querySelector("#authModal .modal-close") || document.getElementById("authClose"),
  authTabs: document.querySelectorAll(".auth-tab"),
  authModeButtons: document.querySelectorAll(".auth-mode"),
  loginForm: document.getElementById("loginForm"),
  signupForm: document.getElementById("signupForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  loginMessage: document.getElementById("loginMessage"),
  signupName: document.getElementById("signupName"),
  signupEmail: document.getElementById("signupEmail"),
  signupPassword: document.getElementById("signupPassword"),
  signupMessage: document.getElementById("signupMessage"),
  trackAuthForm: document.getElementById("authForm"),
  trackAuthNameRow: document.getElementById("authNameRow"),
  trackAuthName: document.getElementById("authName"),
  trackAuthEmail: document.getElementById("authEmail"),
  trackAuthPassword: document.getElementById("authPassword"),
  trackAuthSubmit: document.getElementById("authSubmit"),
  trackAuthMessage: document.getElementById("authMessage"),
  authBtn: document.getElementById("authButton") || document.querySelector(".link-btn"),
  profileBtn: document.getElementById("profileButton") || document.querySelector(".icon-btn"),
  logoutBtn: document.getElementById("logoutButton"),
  sessionGreeting: document.getElementById("sessionGreeting")
};

const hasClassicAuthLayout = Boolean(authElements.loginForm && authElements.signupForm);
const hasTrackAuthLayout = Boolean(authElements.trackAuthForm);

async function initAuth() {
  try {
    const response = await fetchJson("/api/auth/session", {
      method: "GET"
    });
    setCurrentUser(response.user || null);
    updateAuthUI();
  } catch (error) {
    console.error("Failed to load session:", error);
  }
}

function setCurrentUser(user) {
  currentUser = user || null;
  window.currentUser = currentUser;
}

function updateAuthUI() {
  if (!authElements.authBtn) return;

  if (currentUser) {
    authElements.authBtn.textContent = `${currentUser.name || currentUser.email}`;
    authElements.authBtn.classList.add("authenticated");
  } else {
    authElements.authBtn.textContent = "Sign Up/Log In";
    authElements.authBtn.classList.remove("authenticated");
  }

  if (authElements.sessionGreeting) {
    if (currentUser) {
      authElements.sessionGreeting.textContent = `Hello, ${currentUser.name || currentUser.email}`;
      authElements.sessionGreeting.classList.remove("hidden");
    } else {
      authElements.sessionGreeting.textContent = "";
      authElements.sessionGreeting.classList.add("hidden");
    }
  }

  if (authElements.logoutBtn) {
    authElements.logoutBtn.classList.toggle("hidden", !currentUser);
  }
}

function openAuthModal() {
  if (!authElements.modal) return;
  authElements.modal.classList.remove("is-hidden");
  authElements.modal.classList.remove("hidden");
  authElements.modal.setAttribute("aria-hidden", "false");
}

function closeAuthModal() {
  if (!authElements.modal) return;
  authElements.modal.classList.add("is-hidden");
  authElements.modal.classList.add("hidden");
  authElements.modal.setAttribute("aria-hidden", "true");
  resetAuthForms();
}

function resetAuthForms() {
  if (hasClassicAuthLayout) {
    authElements.loginForm.reset();
    authElements.signupForm.reset();
    if (authElements.loginMessage) authElements.loginMessage.textContent = "";
    if (authElements.signupMessage) authElements.signupMessage.textContent = "";
  }

  if (hasTrackAuthLayout) {
    authElements.trackAuthForm.reset();
    showTrackAuthMessage("", "");
    switchTrackAuthMode("signup");
  }
}

function switchAuthTab(tab) {
  if (!hasClassicAuthLayout) return;
  authElements.authTabs.forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === tab);
  });
  
  document.querySelectorAll(".auth-form").forEach((form) => {
    form.classList.toggle("active", form.id === (tab === "login" ? "loginForm" : "signupForm"));
  });
}

function switchTrackAuthMode(mode) {
  if (!hasTrackAuthLayout) return;

  authElements.authModeButtons.forEach((button) => {
    const active = button.dataset.authMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  if (authElements.trackAuthNameRow) {
    authElements.trackAuthNameRow.classList.toggle("hidden", mode === "login");
  }

  if (authElements.trackAuthSubmit) {
    authElements.trackAuthSubmit.textContent = mode === "login" ? "Log In" : "Create Account";
  }

  const title = document.getElementById("authTitle");
  if (title) {
    title.textContent = mode === "login" ? "Log in to your account" : "Create your account";
  }

  showTrackAuthMessage("", "");
}

function getTrackAuthMode() {
  if (!hasTrackAuthLayout) return "signup";
  const active = Array.from(authElements.authModeButtons).find((button) => button.classList.contains("active"));
  return active ? active.dataset.authMode : "signup";
}

async function handleLogin(event) {
  event.preventDefault();
  if (!hasClassicAuthLayout) return;

  const email = authElements.loginEmail.value.trim();
  const password = authElements.loginPassword.value;

  if (!email || !password) {
    showAuthMessage("loginMessage", "Please fill in all fields.", "error");
    return;
  }

  try {
    showAuthMessage("loginMessage", "Signing in...", "");
    const response = await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (response.user) {
      setCurrentUser(response.user);
      updateAuthUI();
      closeAuthModal();
      showAuthMessage("loginMessage", "Signed in successfully!", "success");
    } else {
      showAuthMessage("loginMessage", "Invalid email or password.", "error");
    }
  } catch (error) {
    showAuthMessage("loginMessage", error.message || "Sign in failed.", "error");
  }
}

async function handleSignup(event) {
  event.preventDefault();
  if (!hasClassicAuthLayout) return;

  const name = authElements.signupName.value.trim();
  const email = authElements.signupEmail.value.trim();
  const password = authElements.signupPassword.value;

  if (!name || !email || !password) {
    showAuthMessage("signupMessage", "Please fill in all fields.", "error");
    return;
  }

  if (password.length < 8) {
    showAuthMessage("signupMessage", "Password must be at least 8 characters.", "error");
    return;
  }

  try {
    showAuthMessage("signupMessage", "Creating account...", "");
    const response = await fetchJson("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });

    if (response.user) {
      setCurrentUser(response.user);
      updateAuthUI();
      closeAuthModal();
      showAuthMessage("signupMessage", "Account created successfully!", "success");
    } else {
      showAuthMessage("signupMessage", response.error || "Sign up failed.", "error");
    }
  } catch (error) {
    showAuthMessage("signupMessage", error.message || "Sign up failed.", "error");
  }
}

function showAuthMessage(elementId, text, type) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = text;
  element.className = "form-message";
  if (type) element.classList.add(type);
}

function showTrackAuthMessage(text, type) {
  if (!authElements.trackAuthMessage) return;
  authElements.trackAuthMessage.textContent = text;
  authElements.trackAuthMessage.className = "auth-message";
  if (type) {
    authElements.trackAuthMessage.classList.add(type);
  }
}

async function handleTrackAuthSubmit(event) {
  event.preventDefault();
  if (!hasTrackAuthLayout) return;

  const mode = getTrackAuthMode();
  const name = String(authElements.trackAuthName && authElements.trackAuthName.value || "").trim();
  const email = String(authElements.trackAuthEmail && authElements.trackAuthEmail.value || "").trim();
  const password = String(authElements.trackAuthPassword && authElements.trackAuthPassword.value || "");

  if (!email || !password || (mode === "signup" && !name)) {
    showTrackAuthMessage("Please fill in all required fields.", "error");
    return;
  }

  if (mode === "signup" && password.length < 8) {
    showTrackAuthMessage("Password must be at least 8 characters.", "error");
    return;
  }

  try {
    showTrackAuthMessage(mode === "login" ? "Signing in..." : "Creating account...", "");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const payload = mode === "login" ? { email, password } : { name, email, password };

    const response = await fetchJson(endpoint, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!response.user) {
      showTrackAuthMessage("Authentication failed.", "error");
      return;
    }

    setCurrentUser(response.user);
    updateAuthUI();
    closeAuthModal();
    showTrackAuthMessage(mode === "login" ? "Logged in successfully." : "Account created successfully.", "success");
  } catch (error) {
    showTrackAuthMessage(error.message || "Authentication failed.", "error");
  }
}

async function handleLogout() {
  try {
    await fetchJson("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    updateAuthUI();
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (_error) {
      const trimmed = raw.trim();
      const fallback = trimmed ? trimmed.slice(0, 120) : "";
      const message = fallback ? `Server returned non-JSON response: ${fallback}` : "Server returned non-JSON response.";
      throw new Error(message);
    }
  } else {
    data = {};
  }

  if (!response.ok) {
    throw new Error((data && data.error) || `HTTP ${response.status}`);
  }

  return data;
}

// Wire up auth event listeners
function wireAuthEvents() {
  if (authElements.authBtn) {
    authElements.authBtn.addEventListener("click", () => {
      if (hasClassicAuthLayout && currentUser) {
        handleLogout();
        return;
      }
      openAuthModal();
    });
  }

  if (authElements.profileBtn && hasTrackAuthLayout) {
    authElements.profileBtn.addEventListener("click", () => {
      if (!currentUser) {
        openAuthModal();
      }
    });
  }

  if (authElements.logoutBtn) {
    authElements.logoutBtn.addEventListener("click", handleLogout);
  }

  if (authElements.modalClose) {
    authElements.modalClose.addEventListener("click", closeAuthModal);
  }

  if (authElements.modalOverlay) {
    authElements.modalOverlay.addEventListener("click", closeAuthModal);
  }

  if (hasClassicAuthLayout) {
    authElements.authTabs.forEach((tab) => {
      tab.addEventListener("click", () => switchAuthTab(tab.dataset.tab));
    });

    authElements.loginForm.addEventListener("submit", handleLogin);
    authElements.signupForm.addEventListener("submit", handleSignup);
  }

  if (hasTrackAuthLayout) {
    authElements.authModeButtons.forEach((button) => {
      button.addEventListener("click", () => switchTrackAuthMode(button.dataset.authMode || "signup"));
    });
    authElements.trackAuthForm.addEventListener("submit", handleTrackAuthSubmit);
  }
}

// ============================================================================
// Track Form
// ============================================================================

const TAB_COPY = {
  tracking: {
    label: "Tracking number*",
    hint: "Enter up to 30 of your FedEx tracking, door tag, or FedEx Office order numbers (one per line).",
    placeholder: "e.g. 771975185243",
    button: "TRACK"
  },
  reference: {
    label: "Reference number*",
    hint: "Enter up to 30 reference numbers (one per line).",
    placeholder: "e.g. REF-INTL-1001",
    button: "TRACK"
  },
  tcn: {
    label: "TCN*",
    hint: "Enter up to 30 Transportation Control Numbers (one per line).",
    placeholder: "e.g. TCN-99450001",
    button: "TRACK"
  },
  pod: {
    label: "Tracking number*",
    hint: "Enter up to 30 tracking numbers to obtain proof of delivery.",
    placeholder: "e.g. 794848183811",
    button: "GET PROOF"
  }
};

const state = {
  mode: "tracking",
  isLoading: false,
  hasSearched: false
};

const elements = {
  tabs: document.querySelectorAll(".tab"),
  form: document.getElementById("trackForm"),
  entryLabel: document.getElementById("entryLabel"),
  entryHint: document.getElementById("entryHint"),
  entryInput: document.getElementById("entryInput"),
  submitButton: document.getElementById("submitButton"),
  formMessage: document.getElementById("formMessage"),
  resultsSection: document.getElementById("resultsSection"),
  resultsList: document.getElementById("resultsList")
};

const hasTrackingUi = Boolean(
  elements.form &&
  elements.entryLabel &&
  elements.entryHint &&
  elements.entryInput &&
  elements.submitButton &&
  elements.formMessage &&
  elements.resultsSection &&
  elements.resultsList
);

init();

async function init() {
  await initAuth();
  wireAuthEvents();

  if (hasTrackAuthLayout) {
    switchTrackAuthMode("signup");
  }

  if (!hasTrackingUi) {
    return;
  }

  wireEvents();
  applyMode("tracking");
  renderResults([]);
}

function wireEvents() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => applyMode(tab.dataset.mode));
  });

  elements.form.addEventListener("submit", onSubmit);
}

function applyMode(mode) {
  if (!TAB_COPY[mode]) return;
  state.mode = mode;

  elements.tabs.forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  elements.entryLabel.textContent = TAB_COPY[mode].label;
  elements.entryHint.textContent = TAB_COPY[mode].hint;
  elements.entryInput.placeholder = TAB_COPY[mode].placeholder;
  elements.submitButton.textContent = TAB_COPY[mode].button;

  showMessage("", "");
}

async function onSubmit(event) {
  event.preventDefault();

  if (state.isLoading) return;

  const queries = parseEntries(elements.entryInput.value);

  if (!queries.length) {
    showMessage("Enter at least one value to continue.", "error");
    return;
  }

  if (queries.length > 30) {
    showMessage("You can only submit up to 30 entries at a time.", "error");
    return;
  }

  setLoading(true);
  showMessage("Checking shipment status...", "");

  try {
    state.hasSearched = true;
    const payload = await fetchJson("/api/track", {
      method: "POST",
      body: JSON.stringify({
        mode: state.mode,
        queries
      })
    });

    renderResults(payload.results || []);

    const foundCount = (payload.results || []).filter((item) => item.found).length;
    showMessage(`Found ${foundCount} of ${queries.length} entr${queries.length === 1 ? "y" : "ies"}.`, "success");
  } catch (error) {
    renderResults([]);
    showMessage(error.message || "Tracking request failed.", "error");
  } finally {
    setLoading(false);
  }
}

function parseEntries(text) {
  return text
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function setLoading(value) {
  state.isLoading = value;
  elements.submitButton.disabled = value;
  elements.submitButton.textContent = value ? "PLEASE WAIT..." : TAB_COPY[state.mode].button;
}

function showMessage(text, type) {
  elements.formMessage.textContent = text;
  elements.formMessage.className = "form-message";
  if (type) elements.formMessage.classList.add(type);
}

function renderResults(results) {
  if (!state.hasSearched) {
    elements.resultsSection.classList.add("is-hidden");
    elements.resultsList.innerHTML = "";
    return;
  }

  elements.resultsSection.classList.remove("is-hidden");
  elements.resultsList.innerHTML = "";

  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No results yet. Submit a tracking request to see shipment details.";
    elements.resultsList.appendChild(empty);
    return;
  }

  results.forEach((result) => {
    elements.resultsList.appendChild(buildResultCard(result));
  });
}

function buildResultCard(result) {
  const card = document.createElement("article");
  card.className = "result-card";

  if (!result.found) {
    card.innerHTML = `
      <div class="result-top">
        <div>
          <div class="result-id">${escapeHtml(result.query)}</div>
          <div class="result-meta">No shipment matched this value.</div>
        </div>
        <span class="status-badge status-exception">Not Found</span>
      </div>
    `;
    return card;
  }

  const shipment = result.shipment;
  const statusClass = statusClassName(shipment.status);
  const eta = shipment.estimatedDelivery ? formatDateTime(shipment.estimatedDelivery) : "Pending update";

  card.innerHTML = `
    <div class="result-top">
      <div>
        <div class="result-id">${escapeHtml(shipment.trackingNumber)}</div>
        <div class="result-meta">${escapeHtml(shipment.origin)} → ${escapeHtml(shipment.destination)}</div>
        <div class="result-meta">Estimated delivery: ${escapeHtml(eta)}</div>
      </div>
      <span class="status-badge ${statusClass}">${escapeHtml(shipment.status)}</span>
    </div>
  `;

  if (state.mode === "pod") {
    card.appendChild(buildPodBlock(shipment));
  } else {
    card.appendChild(buildEventList(shipment.events));
  }

  return card;
}

function buildPodBlock(shipment) {
  const wrapper = document.createElement("div");
  wrapper.className = "event-list";

  if (!shipment.proofOfDelivery) {
    wrapper.innerHTML = `<div class="event-item">Proof of delivery is not available for this shipment yet.</div>`;
    return wrapper;
  }

  const pod = shipment.proofOfDelivery;
  wrapper.innerHTML = `
    <div class="event-item"><strong>Delivered at:</strong> ${escapeHtml(formatDateTime(pod.deliveredAt))}</div>
    <div class="event-item"><strong>Received by:</strong> ${escapeHtml(pod.receivedBy || "Recipient")}</div>
    <div class="event-item"><strong>Signature:</strong> ${escapeHtml(pod.signature || "On file")}</div>
  `;

  return wrapper;
}

function buildEventList(events = []) {
  const list = document.createElement("ul");
  list.className = "event-list";

  if (!events.length) {
    const item = document.createElement("li");
    item.className = "event-item";
    item.textContent = "No scan events available yet.";
    list.appendChild(item);
    return list;
  }

  events.slice(0, 6).forEach((event) => {
    const item = document.createElement("li");
    item.className = "event-item";
    item.innerHTML = `<strong>${escapeHtml(event.title)}</strong> • ${escapeHtml(formatDateTime(event.timestamp))} • ${escapeHtml(event.location)}${event.details ? ` • ${escapeHtml(event.details)}` : ""}`;
    list.appendChild(item);
  });

  return list;
}

function statusClassName(status = "") {
  return `status-${String(status).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
