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
  mode: "tracking",
  isLoading: false,
  hasSearched: false,
  authMode: "signup",
  authLoading: false,
  sessionUser: null
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
  resultsList: document.getElementById("resultsList"),
  authButton: document.getElementById("authButton"),
  sessionGreeting: document.getElementById("sessionGreeting"),
  logoutButton: document.getElementById("logoutButton"),
  authModal: document.getElementById("authModal"),
  authClose: document.getElementById("authClose"),
  authForm: document.getElementById("authForm"),
  authTitle: document.getElementById("authTitle"),
  authName: document.getElementById("authName"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authSubmit: document.getElementById("authSubmit"),
  authMessage: document.getElementById("authMessage"),
  nameGroup: document.getElementById("nameGroup"),
  authModeButtons: document.querySelectorAll(".auth-switch-btn")
};

init();

function init() {
  wireEvents();
  applyMode("tracking");
  setAuthMode("signup");
  renderResults([]);
  void hydrateSession();
}

function wireEvents() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => applyMode(tab.dataset.mode));
  });

  elements.form.addEventListener("submit", onSubmit);

  elements.authButton.addEventListener("click", openAuthModal);
  elements.logoutButton.addEventListener("click", onLogout);
  elements.authClose.addEventListener("click", closeAuthModal);
  elements.authModal.addEventListener("click", (event) => {
    if (event.target === elements.authModal) closeAuthModal();
  });

  elements.authModeButtons.forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
  });

  elements.authForm.addEventListener("submit", onAuthSubmit);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.authModal.classList.contains("is-hidden")) {
      closeAuthModal();
    }
  });
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
      headers: {
        "Content-Type": "application/json"
      },
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

function openAuthModal() {
  showAuthMessage("", "");
  elements.authModal.classList.remove("is-hidden");
  elements.authModal.setAttribute("aria-hidden", "false");
  if (state.authMode === "signup") {
    elements.authName.focus();
  } else {
    elements.authEmail.focus();
  }
}

function closeAuthModal() {
  elements.authModal.classList.add("is-hidden");
  elements.authModal.setAttribute("aria-hidden", "true");
}

function setAuthMode(mode) {
  if (!AUTH_COPY[mode]) return;
  state.authMode = mode;

  elements.authModeButtons.forEach((button) => {
    const active = button.dataset.authMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  elements.authTitle.textContent = AUTH_COPY[mode].title;
  elements.authSubmit.textContent = AUTH_COPY[mode].submit;

  if (mode === "signup") {
    elements.nameGroup.classList.remove("is-hidden");
    elements.authPassword.setAttribute("autocomplete", "new-password");
  } else {
    elements.nameGroup.classList.add("is-hidden");
    elements.authPassword.setAttribute("autocomplete", "current-password");
  }

  showAuthMessage("", "");
}

function setAuthLoading(value) {
  state.authLoading = value;
  elements.authSubmit.disabled = value;
  elements.authSubmit.textContent = value ? "Please wait..." : AUTH_COPY[state.authMode].submit;
}

function showAuthMessage(text, type) {
  elements.authMessage.textContent = text;
  elements.authMessage.className = "auth-message";
  if (type) elements.authMessage.classList.add(type);
}

async function onAuthSubmit(event) {
  event.preventDefault();

  if (state.authLoading) return;

  const name = elements.authName.value.trim();
  const email = elements.authEmail.value.trim().toLowerCase();
  const password = elements.authPassword.value;

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
  showAuthMessage(state.authMode === "signup" ? "Creating your account..." : "Signing you in...", "");

  try {
    const payload = await fetchJson(`/api/auth/${state.authMode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        email,
        password
      })
    });

    updateSessionUI(payload.user || null);
    showAuthMessage(payload.message || "Authentication successful.", "success");
    elements.authForm.reset();

    setTimeout(() => {
      closeAuthModal();
    }, 500);
  } catch (error) {
    showAuthMessage(error.message || "Authentication failed.", "error");
  } finally {
    setAuthLoading(false);
  }
}

async function hydrateSession() {
  try {
    const payload = await fetchJson("/api/auth/session", {
      method: "GET"
    });

    if (payload.loggedIn && payload.user) {
      updateSessionUI(payload.user);
    } else {
      updateSessionUI(null);
    }
  } catch (_error) {
    updateSessionUI(null);
  }
}

function updateSessionUI(user) {
  state.sessionUser = user || null;

  if (!state.sessionUser) {
    elements.authButton.classList.remove("is-hidden");
    elements.sessionGreeting.classList.add("is-hidden");
    elements.logoutButton.classList.add("is-hidden");
    elements.sessionGreeting.textContent = "";
    return;
  }

  const name = state.sessionUser.name || state.sessionUser.email || "Account";
  elements.authButton.classList.add("is-hidden");
  elements.sessionGreeting.classList.remove("is-hidden");
  elements.logoutButton.classList.remove("is-hidden");
  elements.sessionGreeting.textContent = `Hi, ${name}`;
}

async function onLogout() {
  try {
    await fetchJson("/api/auth/logout", {
      method: "POST"
    });
  } catch (_error) {
    // Ignore errors and clear local UI state anyway.
  }

  updateSessionUI(null);
  showMessage("You have been logged out.", "success");
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
