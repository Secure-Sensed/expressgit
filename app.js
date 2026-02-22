// ============================================================================
// Auth Modal & Session Management
// ============================================================================

let currentUser = null;

const authElements = {
  modal: document.getElementById("authModal"),
  modalOverlay: document.querySelector("#authModal .modal-overlay"),
  modalClose: document.querySelector("#authModal .modal-close"),
  authTabs: document.querySelectorAll(".auth-tab"),
  loginForm: document.getElementById("loginForm"),
  signupForm: document.getElementById("signupForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  loginMessage: document.getElementById("loginMessage"),
  signupName: document.getElementById("signupName"),
  signupEmail: document.getElementById("signupEmail"),
  signupPassword: document.getElementById("signupPassword"),
  signupMessage: document.getElementById("signupMessage"),
  authBtn: document.querySelector(".link-btn"),
  profileBtn: document.querySelector(".icon-btn")
};

async function initAuth() {
  try {
    const response = await fetchJson("/api/auth/session", {
      method: "GET"
    });
    if (response.user) {
      currentUser = response.user;
      updateAuthUI();
    }
  } catch (error) {
    console.error("Failed to load session:", error);
  }
}

function updateAuthUI() {
  if (currentUser) {
    authElements.authBtn.textContent = `${currentUser.name || currentUser.email}`;
    authElements.authBtn.classList.add("authenticated");
  } else {
    authElements.authBtn.textContent = "Sign Up/Log In";
    authElements.authBtn.classList.remove("authenticated");
  }
}

function openAuthModal() {
  authElements.modal.classList.remove("is-hidden");
}

function closeAuthModal() {
  authElements.modal.classList.add("is-hidden");
  resetAuthForms();
}

function resetAuthForms() {
  authElements.loginForm.reset();
  authElements.signupForm.reset();
  authElements.loginMessage.textContent = "";
  authElements.signupMessage.textContent = "";
}

function switchAuthTab(tab) {
  authElements.authTabs.forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === tab);
  });
  
  document.querySelectorAll(".auth-form").forEach((form) => {
    form.classList.toggle("active", form.id === (tab === "login" ? "loginForm" : "signupForm"));
  });
}

async function handleLogin(event) {
  event.preventDefault();
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
      currentUser = response.user;
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
  const name = authElements.signupName.value.trim();
  const email = authElements.signupEmail.value.trim();
  const password = authElements.signupPassword.value;

  if (!name || !email || !password) {
    showAuthMessage("signupMessage", "Please fill in all fields.", "error");
    return;
  }

  if (password.length < 6) {
    showAuthMessage("signupMessage", "Password must be at least 6 characters.", "error");
    return;
  }

  try {
    showAuthMessage("signupMessage", "Creating account...", "");
    const response = await fetchJson("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });

    if (response.user) {
      currentUser = response.user;
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
  element.textContent = text;
  element.className = "form-message";
  if (type) element.classList.add(type);
}

async function handleLogout() {
  try {
    await fetchJson("/api/auth/logout", { method: "POST" });
    currentUser = null;
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

// Wire up auth event listeners
function wireAuthEvents() {
  authElements.authBtn.addEventListener("click", () => {
    if (currentUser) {
      handleLogout();
    } else {
      openAuthModal();
    }
  });

  authElements.modalClose.addEventListener("click", closeAuthModal);
  authElements.modalOverlay.addEventListener("click", closeAuthModal);

  authElements.authTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchAuthTab(tab.dataset.tab));
  });

  authElements.loginForm.addEventListener("submit", handleLogin);
  authElements.signupForm.addEventListener("submit", handleSignup);
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

init();

async function init() {
  await initAuth();
  wireAuthEvents();
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
