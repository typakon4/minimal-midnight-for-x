// Each control is [key, label, type]. A "toggle" switches between the first
// and second value in its pair; a "choice" lists every value.
const SHOW = ["show", "hide"];
const ON = ["on", "off"];

const SECTIONS = [
  ["Typeface", [
    ["fontFamily", "Font", "select", [["system", "System"], ["readexPro", "Readex Pro"], ["calibri", "Calibri (installed)"], ["convection", "Convection (installed)"]]],
  ]],
  ["Timeline", [
    ["minimalLayout", "Minimal layout", "toggle", ON],
    ["timelineWidth", "Width", "choice", [["600", "600"], ["650", "650"], ["700", "700"], ["750", "750"], ["800", "800"]]],
    ["writerMode", "Writer mode", "toggle", ON],
    ["timelineTabs", "For you / Following tabs", "toggle", SHOW],
    ["stickyHeader", "Sticky header", "toggle", ON],
    ["timelineBorders", "Timeline borders", "toggle", SHOW],
    ["tweetBorders", "Post dividers", "toggle", SHOW],
    ["trendsHomeTimeline", "Trends beside timeline", "toggle", ON],
    ["removePromotedPosts", "Remove promoted posts", "toggle", ON],
    ["removeWhoToFollow", "Remove who to follow", "toggle", ON],
  ]],
  ["Post metrics", [
    ["viewCount", "View counts", "toggle", SHOW],
    ["replyCount", "Reply counts", "toggle", SHOW],
    ["retweetCount", "Repost counts", "toggle", SHOW],
    ["likeCount", "Like counts", "toggle", SHOW],
    ["followCount", "Follower counts", "toggle", SHOW],
  ]],
  ["Navigation", [
    ["navLabels", "Labels", "choice", [["never", "Never"], ["hover", "Hover"], ["always", "Always"]]],
    ["compactNav", "Compact text navigation (labels: Always)", "toggle", ON],
    ["navCenter", "Center vertically", "toggle", ON],
    ["unreadBadge", "Unread badges", "toggle", SHOW],
    ["grokDrawer", "Grok drawer", "toggle", SHOW],
  ]],
  ["Sidebar links", [
    ["navLogo", "X logo", "toggle", SHOW],
    ["navHome", "Home", "toggle", SHOW],
    ["navExplore", "Explore", "toggle", SHOW],
    ["navNotifications", "Notifications", "toggle", SHOW],
    ["navMessages", "Chat", "toggle", SHOW],
    ["navGrok", "Grok", "toggle", SHOW],
    ["navHistory", "History", "toggle", SHOW],
    ["navCreatorStudio", "Creator Studio", "toggle", SHOW],
    ["navPremium", "Premium", "toggle", SHOW],
    ["navBookmarks", "Bookmarks", "toggle", SHOW],
    ["navLists", "Lists", "toggle", SHOW],
    ["navCommunities", "Communities", "toggle", SHOW],
    ["navJobs", "Jobs", "toggle", SHOW],
    ["navArticles", "Articles", "toggle", SHOW],
    ["navVerifiedOrgs", "Verified Orgs", "toggle", SHOW],
    ["navProfile", "Profile", "toggle", SHOW],
  ]],
  ["Interface", [
    ["searchBar", "Search bar", "toggle", SHOW],
    ["transparentSearch", "Transparent search bar", "toggle", ON],
    ["titleNotifications", "Unread count in tab title", "toggle", SHOW],
    ["postButton", "Sidebar Post button", "toggle", SHOW],
  ]],
];

const container = document.getElementById("controls");

function save(key, value) {
  chrome.storage.local.set({ [key]: value });
}

function toggle(key, label, [onValue, offValue], value) {
  const row = document.createElement("label");
  row.className = "row";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("role", "switch");
  input.checked = value === onValue;
  input.addEventListener("change", () => save(key, input.checked ? onValue : offValue));
  row.append(Object.assign(document.createElement("span"), { textContent: label }), input);
  return row;
}

function choice(key, label, options, value) {
  const row = document.createElement("div");
  row.className = "row";
  const group = document.createElement("div");
  group.className = "segmented";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", label);
  for (const [optionValue, optionLabel] of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = optionLabel;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(optionValue === value));
    button.addEventListener("click", () => {
      group.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b === button)));
      save(key, optionValue);
    });
    group.append(button);
  }
  row.append(Object.assign(document.createElement("span"), { textContent: label }), group);
  return row;
}

function selectChoice(key, label, options, value) {
  const row = document.createElement("label");
  row.className = "row";
  const select = document.createElement("select");
  select.setAttribute("aria-label", label);
  for (const [optionValue, optionLabel] of options) {
    const option = new Option(optionLabel, optionValue);
    select.add(option);
  }
  select.value = options.some(([optionValue]) => optionValue === value) ? value : options[0][0];
  select.addEventListener("change", () => save(key, select.value));
  row.append(Object.assign(document.createElement("span"), { textContent: label }), select);
  return row;
}

function customCss(value) {
  const section = document.createElement("section");
  section.innerHTML = '<h2>Custom CSS</h2>';
  const area = document.createElement("textarea");
  area.spellcheck = false;
  area.placeholder = "/* Applied to x.com */";
  area.setAttribute("aria-label", "Custom CSS");
  area.value = value;
  let timer;
  area.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => save("customCss", area.value), 400);
  });
  section.append(area);
  return section;
}

chrome.storage.local.get(XM_DEFAULTS, (settings) => {
  for (const [title, controls] of SECTIONS) {
    // The long list of sidebar links starts folded.
    const folded = title === "Sidebar links";
    const section = document.createElement(folded ? "details" : "section");
    const heading = Object.assign(document.createElement(folded ? "summary" : "h2"), { textContent: title });
    section.append(heading);
    for (const [key, label, type, options] of controls) {
      const build = type === "toggle" ? toggle : type === "select" ? selectChoice : choice;
      const row = build(key, label, options, settings[key]);
      row.dataset.key = key;
      section.append(row);
    }
    container.append(section);
    if (title === "Typeface") {
      const hint = document.createElement("p");
      hint.className = "font-help";
      hint.textContent = "System uses your device font. Calibri and Convection require installation; Readex Pro is bundled.";
      section.append(hint);
    }
  }

  // Width only applies with the minimal layout.
  const syncWidth = () => {
    const off = !document.querySelector('[data-key="minimalLayout"] input').checked;
    document.querySelector('[data-key="timelineWidth"]').classList.toggle("disabled", off);
  };
  document.querySelector('[data-key="minimalLayout"] input').addEventListener("change", syncWidth);
  syncWidth();
  container.append(customCss(settings.customCss));

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "reset";
  reset.textContent = "Reset to defaults";
  reset.addEventListener("click", () => {
    chrome.storage.local.clear(() => location.reload());
  });
  container.append(reset);
});
