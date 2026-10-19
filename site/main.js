// Termdock website: language and theme switches, scroll effects, download
// links from the GitHub API and the interactive terminal demo.
// No dependencies. DOM is built with textContent except for the trusted
// translation strings in i18n.js.
"use strict";

(() => {
  const REPO = "LuuckA21/termdock";
  const root = document.documentElement;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reducedMotion ? 0 : ms));

  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* storage unavailable: the choice just isn't remembered */
      }
    },
  };

  // ───────────── i18n ─────────────

  const dict = window.TD_I18N || { it: {}, runtime: { en: {}, it: {} } };
  const english = new Map();
  const englishAttr = new Map();

  $$("[data-i18n]").forEach((el) => english.set(el, el.innerHTML));
  $$("[data-i18n-attr]").forEach((el) => {
    const [attr] = el.dataset.i18nAttr.split(":");
    englishAttr.set(el, el.getAttribute(attr));
  });

  const lang = () => (root.lang === "it" ? "it" : "en");

  /** Runtime string with {placeholders}. */
  function rt(key, vars = {}) {
    const table = dict.runtime[lang()] || dict.runtime.en;
    const text = table[key] ?? dict.runtime.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : ""));
  }

  function setContent(el, value) {
    if (value.includes("<")) el.innerHTML = value;
    else el.textContent = value;
  }

  function applyLang(next) {
    root.lang = next;
    const table = next === "it" ? dict.it : null;
    english.forEach((en, el) => {
      const key = el.dataset.i18n;
      if (!table) {
        el.innerHTML = en;
        return;
      }
      if (!(key in table)) console.warn("i18n: missing key", key);
      setContent(el, table[key] ?? en);
    });
    englishAttr.forEach((en, el) => {
      const [attr, key] = el.dataset.i18nAttr.split(":");
      el.setAttribute(attr, (table && table[key]) || en);
    });
    document.title = next === "it" ? "Termdock: terminale e gestore di connessioni SSH" : "Termdock: terminal & SSH connection manager";
    updateDownloadLabel();
    renderTabs();
    $$(".scheme").forEach((b) => b.setAttribute("title", `${rt("scheme")}: ${b.dataset.name}`));
  }

  $("#lang-toggle").addEventListener("click", () => {
    const next = lang() === "en" ? "it" : "en";
    store.set("td-lang", next);
    applyLang(next);
  });

  // ───────────── Theme ─────────────

  function setTheme(next, origin) {
    const apply = () => {
      root.dataset.theme = next;
      store.set("td-theme", next);
      syncScheme();
    };
    if (!document.startViewTransition || reducedMotion || !origin) {
      apply();
      return;
    }
    const { x, y } = origin;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  }

  $("#theme-toggle").addEventListener("click", (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTheme(root.dataset.theme === "light" ? "dark" : "light", {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  });

  matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
    if (!store.get("td-theme")) {
      root.dataset.theme = e.matches ? "light" : "dark";
      syncScheme();
    }
  });

  // ───────────── Scroll effects ─────────────

  const onScroll = () => root.classList.toggle("scrolled", scrollY > 24);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if ("IntersectionObserver" in window) {
    const revealer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    $$(".reveal").forEach((el) => revealer.observe(el));

    const links = new Map($$(".nav-links a").map((a) => [a.getAttribute("href").slice(1), a]));
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const link = links.get(entry.target.id);
          if (link) link.classList.toggle("active", entry.isIntersecting);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    links.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  } else {
    $$(".reveal").forEach((el) => el.classList.add("in"));
  }

  // Pointer spotlight on cards.
  $$(".spot").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      card.style.setProperty("--my", `${e.clientY - rect.top}px`);
    });
  });

  // ───────────── Toast & copy ─────────────

  let toastTimer = 0;
  function toast(text) {
    const el = $("#toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
  }

  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = $(`#${btn.dataset.copy}`)
        .textContent.split("\n")
        .map((l) => l.replace(/^\$ /, ""))
        .join("\n");
      try {
        await navigator.clipboard.writeText(text);
        toast(rt("copied"));
      } catch {
        toast(rt("copyFailed"));
      }
    });
  });

  // ───────────── Downloads ─────────────

  function detectOS() {
    const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    const ua = navigator.userAgent;
    if (/android|iphone|ipad|ipod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Mac/.test(platform))) return null;
    if (/win/i.test(platform) || /Windows/.test(ua)) return "windows";
    if (/mac/i.test(platform) || /Mac OS X/.test(ua)) return "mac";
    if (/linux|x11|cros/i.test(platform) || /Linux|X11/.test(ua)) return "linux";
    return null;
  }

  const OS_NAMES = { windows: "Windows", mac: "macOS", linux: "Linux" };
  const os = detectOS();

  function updateDownloadLabel() {
    const label = $("#hero-download-label");
    if (os) label.textContent = rt("downloadFor", { os: OS_NAMES[os] });
  }

  if (os) {
    const card = $(`.dl-card[data-os="${os}"]`);
    card.classList.add("recommended");
    card.parentElement.prepend(card);
    const icon = $(".dl-os svg", card).cloneNode(true);
    icon.removeAttribute("class");
    $("#hero-os-icon").append(icon);
    updateDownloadLabel();
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
  }

  async function cachedJSON(key, url) {
    try {
      const hit = JSON.parse(sessionStorage.getItem(key) || "null");
      if (hit && Date.now() - hit.t < 10 * 60 * 1000) return hit.data;
    } catch {
      /* ignore broken cache */
    }
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    const data = await res.json();
    try {
      sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), data }));
    } catch {
      /* storage unavailable */
    }
    return data;
  }

  async function loadRelease() {
    const release = await cachedJSON("td-release", `https://api.github.com/repos/${REPO}/releases/latest`);
    const tag = String(release.tag_name || "");
    if (!/^v\d+\.\d+\.\d+$/.test(tag)) return;
    $("#hero-version").textContent = tag;
    $("#dl-version").textContent = tag;
    $("#news-version").textContent = tag.replace(/\.\d+$/, "");
    $("#news-pill").href = String(release.html_url || `https://github.com/${REPO}/releases/latest`);

    const assets = (release.assets || []).filter((a) => !a.name.endsWith(".sig"));
    const safeUrl = (u) => (/^https:\/\/github\.com\//.test(u) ? u : null);
    $$("[data-asset]").forEach((link) => {
      const asset = assets.find((a) => a.name.endsWith(link.dataset.asset));
      const url = asset && safeUrl(asset.browser_download_url);
      if (!url) return;
      link.href = url;
      link.dataset.size = formatSize(asset.size);
    });

    if (os) {
      const primary = $(`.dl-card[data-os="${os}"] .btn-primary`);
      if (primary && primary.href.includes("/download/")) $("#hero-download").href = primary.href;
    }
  }

  async function loadStars() {
    const repo = await cachedJSON("td-repo", `https://api.github.com/repos/${REPO}`);
    const n = Number(repo.stargazers_count);
    if (n > 0) {
      const el = $("#gh-stars");
      el.textContent = n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
      el.hidden = false;
    }
  }

  loadRelease().catch((e) => console.info("release info unavailable:", e.message));
  loadStars().catch(() => {});

  // ───────────── Terminal color schemes ─────────────

  const SCHEMES = {
    "termdock-dark": { name: "Termdock Dark", bg: "#0f1420", fg: "#d7dce8", cursor: "#ffd166", dim: "#5a6378", red: "#ff6b6b", green: "#7ee0b0", yellow: "#ffd166", blue: "#6c8cff", magenta: "#c792ea", cyan: "#5fd7e0" },
    "termdock-light": { name: "Termdock Light", bg: "#fbfcfe", fg: "#1f2430", cursor: "#3d5af1", dim: "#636b7d", red: "#c93434", green: "#1b7f53", yellow: "#9a6300", blue: "#3150e0", magenta: "#8f3fbf", cyan: "#0c7d8c" },
    "solarized-dark": { name: "Solarized Dark", bg: "#002b36", fg: "#93a1a1", cursor: "#93a1a1", dim: "#586e75", red: "#dc322f", green: "#859900", yellow: "#b58900", blue: "#268bd2", magenta: "#d33682", cyan: "#2aa198" },
    dracula: { name: "Dracula", bg: "#282a36", fg: "#f8f8f2", cursor: "#f8f8f2", dim: "#6272a4", red: "#ff5555", green: "#50fa7b", yellow: "#f1fa8c", blue: "#bd93f9", magenta: "#ff79c6", cyan: "#8be9fd" },
    nord: { name: "Nord", bg: "#2e3440", fg: "#d8dee9", cursor: "#d8dee9", dim: "#4c566a", red: "#bf616a", green: "#a3be8c", yellow: "#ebcb8b", blue: "#81a1c1", magenta: "#b48ead", cyan: "#88c0d0" },
    "gruvbox-dark": { name: "Gruvbox Dark", bg: "#282828", fg: "#ebdbb2", cursor: "#ebdbb2", dim: "#928374", red: "#fb4934", green: "#b8bb26", yellow: "#fabd2f", blue: "#83a598", magenta: "#d3869b", cyan: "#8ec07c" },
  };

  const demo = $("#demo");
  let chosenScheme = SCHEMES[store.get("td-scheme")] ? store.get("td-scheme") : null;

  function applyScheme(id) {
    const s = SCHEMES[id];
    for (const k of ["bg", "fg", "cursor", "dim", "red", "green", "yellow", "blue", "magenta", "cyan"]) {
      demo.style.setProperty(`--t-${k}`, s[k]);
    }
    $$(".scheme").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.id === id)));
  }

  function syncScheme() {
    applyScheme(chosenScheme || (root.dataset.theme === "light" ? "termdock-light" : "termdock-dark"));
  }

  const schemeBox = $("#schemes");
  Object.entries(SCHEMES).forEach(([id, s]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "scheme";
    b.dataset.id = id;
    b.dataset.name = s.name;
    b.setAttribute("role", "radio");
    b.style.setProperty("--s-bg", s.bg);
    b.style.setProperty("--s-fg", s.fg);
    const sw = document.createElement("span");
    sw.className = "sw";
    for (const c of [s.red, s.green, s.yellow, s.blue, s.magenta]) {
      const dot = document.createElement("i");
      dot.style.background = c;
      sw.append(dot);
    }
    const nm = document.createElement("span");
    nm.className = "nm";
    nm.textContent = s.name;
    b.append(sw, nm);
    b.addEventListener("click", () => {
      chosenScheme = id;
      store.set("td-scheme", id);
      applyScheme(id);
    });
    schemeBox.append(b);
  });
  syncScheme();

  // ───────────── Terminal demo ─────────────

  const termEl = $("#term");
  const tabsEl = $("#tabs");
  const MAX_TABS = 6;
  let tabs = [];
  let active = null;
  let nextId = 1;

  const randomFingerprint = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let fp = "";
    const bytes = crypto.getRandomValues(new Uint8Array(43));
    for (const b of bytes) fp += chars[b % 64];
    return fp;
  };

  const yesterday = () => {
    const d = new Date(Date.now() - 26 * 3600 * 1000);
    return d.toLocaleString(lang() === "it" ? "it-IT" : "en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  // A prompt is a list of [className, text] segments.
  const prompts = {
    ssh: (user, host) => [["t-green t-b", `${user}@${host}`], ["", ":"], ["t-blue t-b", "~"], ["", "$ "]],
    zsh: () => [["t-cyan t-b", "~/code/termdock"], ["t-magenta", " main"], ["t-green", " ❯ "]],
  };

  const SESSIONS = {
    "test-sshd": { title: "test-sshd", color: "c-green", user: "tdtest", host: "vm" },
    "prod-web-01": { title: "prod-web-01", color: "c-red", user: "deploy", host: "prod-web-01", newKey: true },
    "db-primary": { title: "db-primary", color: "c-yellow", user: "postgres", host: "db-primary", jump: true },
    local: { title: "zsh", color: "c-blue", local: true },
    router: { title: "edge-router", color: "c-magenta", user: "admin", host: "edge-router", jump: true },
  };

  const SCRIPTS = {
    "test-sshd": [
      { cmd: "ls -la /etc | head -n 8" },
      {
        out: [
          [["", "total 820"]],
          [["", "drwxr-xr-x  2 root root  4096 Oct  3 05:36 "], ["t-blue t-b", "PackageKit"]],
          [["", "drwxr-xr-x  8 root root  4096 Oct  3 05:42 "], ["t-blue t-b", "X11"]],
          [["", "-rw-r--r--  1 root root  3444 Jul  5  2023 adduser.conf"]],
          [["", "drwxr-xr-x  2 root root 12288 Oct  3 05:42 "], ["t-blue t-b", "alternatives"]],
          [["", "drwxr-xr-x  8 root root  4096 Sep 17 02:20 "], ["t-blue t-b", "apt"]],
          [["", "-rw-r--r--  1 root root  2491 Oct  3 05:42 bash.bashrc"]],
          [["", "drwxr-xr-x  2 root root  4096 Jul 28 15:04 "], ["t-blue t-b", "binfmt.d"]],
        ],
      },
      { cmd: "./colors.sh" },
      {
        out: [
          [
            ["t-red t-b", " TERMDOCK "], ["t-green t-b", " TERMDOCK "], ["t-yellow t-b", " TERMDOCK "],
            ["t-blue t-b", " TERMDOCK "], ["t-magenta t-b", " TERMDOCK "], ["t-cyan t-b", " TERMDOCK "],
          ],
        ],
      },
    ],
    "prod-web-01": [
      { cmd: "systemctl status nginx --no-pager" },
      {
        out: [
          [["t-green", "●"], ["", " nginx.service - A high performance web server"]],
          [["", "     Loaded: loaded (/lib/systemd/system/nginx.service; enabled)"]],
          [["", "     Active: "], ["t-green t-b", "active (running)"], ["", " since Mon 2026-09-07 08:14:22 UTC; 5 weeks ago"]],
          [["", "   Main PID: 912 (nginx)"]],
          [["", "      Tasks: 5 (limit: 9381)"]],
          [["", "     Memory: 12.4M"]],
        ],
      },
      { cmd: "uptime" },
      { out: [[["", " 10:42:07 up 41 days,  2:28,  1 user,  load average: 0.08, 0.11, 0.09"]]] },
    ],
    "db-primary": [
      { cmd: "psql -c 'select status, count(*) from orders group by 1;'" },
      {
        out: [
          [["t-b", "  status  | count "]],
          [["", "----------+-------"]],
          [["", " paid     | 18342"]],
          [["", " shipped  | 17920"]],
          [["", " refunded |   211"]],
          [["t-dim", "(3 rows)"]],
        ],
      },
    ],
    local: [
      { cmd: "git log --oneline -3" },
      {
        out: [
          [["t-yellow", "5f57714"], ["", " Tab and window comforts (0.18.0)"]],
          [["t-yellow", "4aaf17b"], ["", " SSH key generation and install on servers (0.17.0)"]],
          [["t-yellow", "d40b8be"], ["", " Automatic reconnection, log wrap fix, macOS quarantine (0.16.0)"]],
        ],
      },
      { cmd: "echo $SHELL" },
      { out: [[["", "/bin/zsh"]]] },
    ],
    router: [
      { cmd: "ip -br addr" },
      {
        out: [
          [["", "lo        UNKNOWN  127.0.0.1/8"]],
          [["", "eth0      "], ["t-green", "UP      "], ["", " 203.0.113.7/24"]],
          [["", "eth1      "], ["t-green", "UP      "], ["", " 10.0.4.1/24"]],
          [["", "wg0       UNKNOWN  10.8.0.1/24"]],
        ],
      },
    ],
  };

  function line(tab, segments = []) {
    const ln = document.createElement("div");
    ln.className = "ln";
    for (const [cls, text] of segments) {
      const span = document.createElement("span");
      if (cls) span.className = cls;
      span.textContent = text;
      ln.append(span);
    }
    tab.view.append(ln);
    // Keep the scrollback short so the demo never grows unbounded.
    while (tab.view.childElementCount > 200) tab.view.firstElementChild.remove();
    if (tab === active) termEl.scrollTop = termEl.scrollHeight;
    else if (!tab.activity && tabs.includes(tab)) {
      tab.activity = true;
      renderTabs();
    }
    return ln;
  }

  function placeCursor(tab, ln) {
    ln.append(tab.cursor);
  }

  function promptLine(tab) {
    const segs = tab.session.local ? prompts.zsh() : prompts.ssh(tab.session.user, tab.session.host);
    const ln = line(tab, segs);
    tab.input = document.createElement("span");
    ln.append(tab.input);
    placeCursor(tab, ln);
    return ln;
  }

  async function typeInto(tab, text) {
    for (const ch of text) {
      if (tab.dead) return;
      tab.input.textContent += ch;
      await sleep(28 + Math.random() * 55);
    }
  }

  async function play(tab) {
    const s = tab.session;
    if (!s.local) {
      line(tab, [["t-dim", rt("connecting", { host: `${s.user}@${s.host}:22` })]]);
      await sleep(450);
      if (s.jump) line(tab, [["t-dim", `↳ ${rt("viaJump")}`]]);
      if (s.newKey) {
        await sleep(300);
        line(tab, [["t-yellow", rt("newHostKey", { host: s.host })]]);
        line(tab, [["", rt("fingerprint", { fp: randomFingerprint() })]]);
        await sleep(700);
        line(tab, [["t-green", `✓ ${rt("trusted")}`]]);
      }
      await sleep(300);
      line(tab, [["t-green", `✓ ${rt("authAgent")}`]]);
      line(tab, [["t-dim", rt("lastLogin", { date: yesterday() })]]);
      line(tab);
    }
    const script = SCRIPTS[tab.script] || [];
    for (const step of script) {
      if (tab.dead) return;
      if (step.cmd) {
        promptLine(tab);
        await sleep(500);
        await typeInto(tab, step.cmd);
        await sleep(260);
      } else if (step.out) {
        for (const segs of step.out) {
          if (tab.dead) return;
          line(tab, segs);
          await sleep(35);
        }
      }
    }
    if (tab.dead) return;
    promptLine(tab);
    tab.idle = true;
  }

  // Tiny pretend shell for when the scripted part is over.
  function execute(tab, raw) {
    const cmd = raw.trim();
    const [name, ...args] = cmd.split(/\s+/);
    const s = tab.session;
    const out = (text, cls = "") => line(tab, [[cls, text]]);
    switch (name) {
      case "":
        break;
      case "help":
        out(lang() === "it" ? "Comandi: help, ls, whoami, hostname, date, uptime, echo, uname, clear, exit" : "Commands: help, ls, whoami, hostname, date, uptime, echo, uname, clear, exit", "t-dim");
        break;
      case "clear":
        tab.view.textContent = "";
        break;
      case "whoami":
        out(s.local ? "you" : s.user);
        break;
      case "hostname":
        out(s.local ? "localhost" : s.host);
        break;
      case "uptime":
        out(" 10:42:07 up 41 days,  2:28,  1 user,  load average: 0.08, 0.11, 0.09");
        break;
      case "date":
        out(new Date().toString());
        break;
      case "echo":
        out(args.join(" ").replace(/^["']|["']$/g, ""));
        break;
      case "uname":
        out(args.includes("-a") ? "Linux " + (s.host || "localhost") + " 6.8.0 #1 SMP x86_64 GNU/Linux" : "Linux");
        break;
      case "ls":
        line(tab, [["t-blue t-b", "projects"], ["", "  "], ["t-blue t-b", "backups"], ["", "  notes.md  "], ["t-green t-b", "deploy.sh"]]);
        break;
      case "exit":
      case "logout":
        if (s.local) {
          closeTab(tab);
          return;
        }
        out(rt("closed"), "t-dim");
        tab.closed = true;
        tab.input = null;
        tab.cursor.remove();
        renderTabs();
        return;
      default:
        out(`${s.local ? "zsh" : "bash"}: ${name}: command not found`);
    }
    promptLine(tab);
  }

  // Ctrl+Shift+P in the demo types a saved snippet, like the app's Snippets menu.
  async function runSnippet() {
    const tab = active;
    if (!tab || !tab.idle || !tab.input || tab.closed) return;
    tab.idle = false;
    await typeInto(tab, "uptime");
    await sleep(200);
    if (tab.dead || !tab.input) return;
    const cmd = tab.input.textContent;
    tab.input = null;
    tab.idle = true;
    execute(tab, cmd);
  }

  function openTab(sessionId, custom) {
    const session = custom || SESSIONS[sessionId];
    if (!session) return;
    if (tabs.length >= MAX_TABS) closeTab(tabs[0]);
    const view = document.createElement("div");
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    const tab = { id: nextId++, fresh: true, session, script: custom ? null : sessionId, view, cursor, input: null, idle: false, dead: false, closed: false };
    tabs.push(tab);
    activate(tab);
    play(tab);
    return tab;
  }

  function closeTab(tab) {
    tab.dead = true;
    const i = tabs.indexOf(tab);
    tabs.splice(i, 1);
    if (active === tab) {
      active = null;
      const next = tabs[Math.min(i, tabs.length - 1)];
      if (next) activate(next);
      else openTab("local");
    }
    renderTabs();
  }

  function activate(tab) {
    active = tab;
    tab.activity = false;
    termEl.replaceChildren(tab.view);
    termEl.scrollTop = termEl.scrollHeight;
    renderTabs();
  }

  function renderTabs() {
    if (!tabsEl) return;
    const nodes = tabs.map((tab) => {
      const b = document.createElement("div");
      // Only a newly opened tab animates in; re-renders must not flash the others.
      b.className = `tab ${tab.session.color}` + (tab.closed ? " closed" : "") + (tab.activity ? " activity" : "") + (tab.fresh ? " new" : "");
      tab.fresh = false;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(tab === active));
      b.tabIndex = tab === active ? 0 : -1;
      const led = document.createElement("span");
      led.className = "led";
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = tab.session.title;
      const x = document.createElement("span");
      x.className = "x";
      x.textContent = "×";
      x.setAttribute("role", "button");
      x.setAttribute("aria-label", rt("close"));
      x.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(tab);
      });
      b.append(led, label, x);
      b.addEventListener("click", () => activate(tab));
      b.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") activate(tab);
      });
      return b;
    });
    const add = document.createElement("button");
    add.type = "button";
    add.className = "tab-add";
    add.textContent = "+";
    add.setAttribute("aria-label", rt("newTab"));
    add.addEventListener("click", () => openTab("local"));
    tabsEl.replaceChildren(...nodes, add);
  }

  $$(".fav").forEach((fav) => {
    fav.addEventListener("click", () => {
      fav.classList.remove("pulse");
      void fav.offsetWidth;
      fav.classList.add("pulse");
      openTab(fav.dataset.session);
    });
  });

  // Quick connect: user@host[:port]
  let quickHistory = [];
  let quickIndex = -1;
  $("#quick-input").addEventListener("keydown", (e) => {
    if ((e.key !== "ArrowUp" && e.key !== "ArrowDown") || quickHistory.length === 0) return;
    e.preventDefault();
    quickIndex = Math.max(-1, Math.min(quickHistory.length - 1, quickIndex + (e.key === "ArrowUp" ? 1 : -1)));
    e.target.value = quickIndex < 0 ? "" : quickHistory[quickIndex];
  });

  $("#quick").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#quick-input");
    const m = input.value.trim().match(/^(?:([a-z_][a-z0-9_.-]{0,31})@)?([a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?)(?::(\d{1,5}))?$/i);
    if (!m || (m[3] && Number(m[3]) > 65535)) {
      toast(rt("badAddress"));
      return;
    }
    const [, user = "root", host] = m;
    openTab(null, { title: host, color: "c-green", user, host, newKey: true });
    const address = input.value.trim();
    quickHistory = [address, ...quickHistory.filter((a) => a !== address)].slice(0, 10);
    quickIndex = -1;
    input.value = "";
    termEl.focus({ preventScroll: true });
  });

  // Typing into the active terminal once its script has finished.
  termEl.tabIndex = 0;
  termEl.addEventListener("keydown", (e) => {
    const tab = active;
    if (!tab || e.ctrlKey || e.metaKey || e.altKey) return;
    if (tab.closed) {
      if (e.key === "Enter") {
        e.preventDefault();
        tab.closed = false;
        tab.idle = false;
        tab.view.textContent = "";
        renderTabs();
        play(Object.assign(tab, { script: null }));
      }
      return;
    }
    if (!tab.idle || !tab.input) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const cmd = tab.input.textContent;
      tab.input = null;
      execute(tab, cmd);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      tab.input.textContent = tab.input.textContent.slice(0, -1);
    } else if (e.key.length === 1 && tab.input.textContent.length < 120) {
      e.preventDefault();
      tab.input.textContent += e.key;
    }
    termEl.scrollTop = termEl.scrollHeight;
  });

  setTimeout(() => openTab("test-sshd"), reducedMotion ? 0 : 900);

  // ───────────── Shortcuts ─────────────

  const isMac = os === "mac";

  function comboOf(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.shiftKey && /^Digit[1-9]$/.test(e.code)) return "ctrl+shift+digit";
    if (e.altKey && !ctrl && /^Digit[1-9]$/.test(e.code)) return "alt+digit";
    if (isMac && e.metaKey && !e.shiftKey && !e.altKey && /^Digit[1-9]$/.test(e.code)) return "alt+digit";
    if (e.altKey && !ctrl && e.key.startsWith("Arrow")) return "alt+arrow";
    if (ctrl && !e.shiftKey && e.key === ",") return "ctrl+comma";
    if (e.ctrlKey && e.key === "Tab") return "ctrl+tab";
    if (ctrl && !e.altKey && ["+", "=", "-", "0"].includes(e.key)) return "ctrl+zoom";
    if (ctrl && e.shiftKey && /^Key[A-Z]$/.test(e.code)) return `ctrl+shift+${e.code.slice(3).toLowerCase()}`;
    return null;
  }

  const rows = new Map($$(".key-row").map((r) => [r.dataset.combo, r]));

  // Browser shortcuts are only taken over while the demo or the shortcut
  // list is on screen.
  const onScreen = new Set();
  if ("IntersectionObserver" in window) {
    const watch = new IntersectionObserver((entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? onScreen.add(entry.target) : onScreen.delete(entry.target)));
    });
    watch.observe(demo);
    watch.observe($("#keys"));
  }

  function flash(row) {
    row.classList.remove("hit");
    void row.offsetWidth;
    row.classList.add("hit");
    clearTimeout(row._t);
    row._t = setTimeout(() => row.classList.remove("hit"), 900);
  }

  document.addEventListener("keydown", (e) => {
    const combo = comboOf(e);
    const row = combo && rows.get(combo);
    if (!row || onScreen.size === 0) return;
    if (e.target instanceof HTMLInputElement) return;
    if (combo !== "ctrl+tab" && combo !== "ctrl+zoom") e.preventDefault();
    flash(row);
    // Mirror a few actions in the demo window.
    if (combo === "ctrl+shift+t") openTab("local");
    else if (combo === "ctrl+shift+p") runSnippet();
    else if (combo === "ctrl+shift+k") $("#quick-input").focus({ preventScroll: true });
    else if (combo === "ctrl+shift+digit") {
      const fav = $$(".fav")[Number(e.code.slice(5)) - 1];
      if (fav) fav.click();
    } else if (combo === "alt+digit") {
      const tab = tabs[Number(e.code.slice(5)) - 1];
      if (tab) activate(tab);
    }
  });

  rows.forEach((row) => row.addEventListener("click", () => flash(row)));

  // ───────────── Start ─────────────

  applyLang(lang());
})();
