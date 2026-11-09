// Mirrors each setting onto <html> as a data attribute. features.css reads
// those attributes, so most features need no JavaScript beyond this.
const root = document.documentElement;
let settings = { ...XM_DEFAULTS };
const FONT_FAMILIES = {
  system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  readexPro: '"Readex Pro", sans-serif',
  calibri: 'Calibri, "Readex Pro", sans-serif',
  convection: 'Convection, "Readex Pro", sans-serif',
};

const kebab = (key) => key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

function apply() {
  for (const [key, value] of Object.entries(settings)) {
    if (key === "customCss") continue;
    root.setAttribute(`data-xm-${kebab(key)}`, value);
  }
  root.style.setProperty("--xm-timeline-width", `${settings.timelineWidth}px`);
  root.style.setProperty("--xm-font-family", FONT_FAMILIES[settings.fontFamily] || FONT_FAMILIES.system);
  applyCustomCss();
  cleanTitle();
}

function applyCustomCss() {
  let style = document.getElementById("xm-custom-css");
  if (!style) {
    style = document.createElement("style");
    style.id = "xm-custom-css";
    (document.head || root).appendChild(style);
  }
  style.textContent = settings.customCss;
}

// Home-only features (tabs, trends, writer mode) key off this attribute.
function trackPage() {
  const path = location.pathname;
  const page = path === "/home" || path === "/" ? "home" : path.startsWith("/compose/") ? "compose" : path.startsWith("/search") ? "search" : "other";
  if (root.getAttribute("data-xm-page") !== page) root.setAttribute("data-xm-page", page);
}

// X puts the unread count in the tab title, as "(3) Home / X".
function cleanTitle() {
  if (settings.titleNotifications !== "hide") return;
  const clean = document.title.replace(/^(\(\d+\+?\)\s*)+/, "");
  if (clean !== document.title) document.title = clean;
}

function setWriterMode(value) {
  chrome.storage.local.set({ writerMode: value });
}

// A writer mode button at the end of the composer toolbar.
function addWriterButton() {
  const list = document.querySelector('[data-testid="primaryColumn"] [data-testid="toolBar"] [data-testid="ScrollSnap-List"]');
  if (!list || list.querySelector("#xm-writer-button")) return;
  const button = document.createElement("button");
  button.id = "xm-writer-button";
  button.type = "button";
  button.setAttribute("aria-label", "Writer mode");
  button.title = "Writer mode (Esc to exit)";
  button.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  button.addEventListener("click", () => setWriterMode(settings.writerMode === "on" ? "off" : "on"));
  list.appendChild(button);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && settings.writerMode === "on") setWriterMode("off");
});

// Apply defaults immediately, then load this extension's local preferences.
apply();

chrome.storage.local.get(XM_DEFAULTS, (stored) => {
  settings = stored;
  apply();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  for (const [key, { newValue }] of Object.entries(changes)) {
    settings[key] = newValue ?? XM_DEFAULTS[key];
  }
  apply();
});

// X mutates the DOM constantly. Run the checks at most once per frame.
let queued = false;
trackPage();
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    trackPage();
    cleanTitle();
    addWriterButton();
  });
}).observe(root, { childList: true, subtree: true });
