(() => {
  const featureLinks = [
    ["/", "Home"], ["/prayer-times/", "Prayer times"], ["/qibla/", "Qibla"],
    ["/quran/", "Quran"], ["/daily-remembrance/", "Duas & dhikr"],
    ["/islamic-calendar/", "Islamic calendar"], ["/my-journey/", "My Journey"],
    ["/ask-noor/", "Ask Noor"], ["/my-bookmarks/", "Saved verses"]
  ];
  const path = window.location.pathname;
  const isActive = href => href === "/" ? path === "/" : path.startsWith(href);
  const dashboardHeading = document.querySelector(".dashboard-main h1");
  const username = dashboardHeading ? dashboardHeading.textContent.replace(/^Welcome,\s*/i, "").replace(/[.!].*$/, "").trim() : localStorage.getItem("noor.displayName") || "";
  if (username && username !== "Welcome") localStorage.setItem("noor.displayName", username);
  const logout = document.querySelector('form[action*="logout"]');
  if (logout) logout.addEventListener("submit", () => localStorage.removeItem("noor.displayName"));
  const topbar = document.querySelector(".topbar");
  if (topbar && document.querySelector(".brand")) {
    let nav = topbar.querySelector(".top-nav");
    if (!nav) {
      nav = document.createElement("nav"); nav.className = "top-nav"; nav.setAttribute("aria-label", "Main navigation");
      const brand = topbar.querySelector(".brand"); brand.insertAdjacentElement("afterend", nav);
    }
    nav.replaceChildren();
    featureLinks.forEach(([href, label]) => {
      const link = document.createElement("a"); link.href = href; link.textContent = label;
      if (isActive(href)) link.setAttribute("aria-current", "page");
      nav.appendChild(link);
    });
    const account = document.createElement("a");
    account.className = "nav-account";
    account.href = username ? "/accounts/dashboard/" : "/accounts/login/";
    account.textContent = username ? "Hello, " + username : "Log in";
    nav.appendChild(account);
  }

  const animated = document.querySelectorAll("main section, .reveal, .feature-card, .dashboard-summary > *, .member-grid article, .prayer-card, .ayah-card, .saved-verse, .tracker-panel, .ask-panel");
  let observer = null;
  if ("IntersectionObserver" in window) {
    try { observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove("noor-pending"); entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } });
    }, {threshold: 0.01, rootMargin: "0px"}); } catch (_) { observer = null; }
  }
  animated.forEach((element, index) => {
    if (element.closest(".no-motion")) return;
    element.classList.add("noor-reveal");
    element.style.setProperty("--reveal-delay", Math.min(index % 5, 4) * 55 + "ms");
    if (observer) { element.classList.add("noor-pending"); observer.observe(element); } else element.classList.add("is-visible");
  });
  window.setTimeout(() => document.querySelectorAll(".noor-pending").forEach(element => { element.classList.remove("noor-pending"); element.classList.add("is-visible"); }), 1200);

  const ratingForm = document.getElementById("app-rating-form");
  if (ratingForm) {
    const ratingInput = document.getElementById("app-rating-value");
    const starButtons = Array.from(ratingForm.querySelectorAll("[data-rating]"));
    const paintRating = value => {
      ratingInput.value = String(value);
      starButtons.forEach(button => { button.classList.toggle("is-selected", Number(button.dataset.rating) <= value); button.setAttribute("aria-pressed", String(Number(button.dataset.rating) === value)); });
    };
    starButtons.forEach(button => button.addEventListener("click", () => paintRating(Number(button.dataset.rating))));
    paintRating(Number(ratingInput.value || 5));
    if (new URLSearchParams(window.location.search).get("rated") === "1") {
      const thanks = document.getElementById("rating-thanks"); if (thanks) thanks.hidden = false;
      const submit = ratingForm.querySelector(".rating-submit"); if (submit) submit.hidden = true;
      const feedback = ratingForm.querySelector("#app-rating-feedback"); if (feedback) feedback.hidden = true;
      ratingForm.querySelector(".rating-feedback-label")?.setAttribute("hidden", "");
    }
  }

  if (!localStorage.getItem("noor.welcomeSeen") && !/accounts\/(login|signup)/.test(path)) {
    const veil = document.createElement("div"); veil.className = "noor-welcome-veil";
    veil.innerHTML = '<section class="noor-welcome-card" role="dialog" aria-modal="true" aria-labelledby="noor-welcome-title"><button class="noor-welcome-close" type="button" aria-label="Close guide">×</button><div class="noor-guide-scene" aria-hidden="true"><div class="noor-guide-shadow"></div><div class="noor-guide-body"><div class="noor-guide-head"><div class="noor-guide-cap"></div><div class="noor-guide-face"><span class="noor-guide-eye"></span><span class="noor-guide-eye"></span><span class="noor-guide-smile"></span></div></div><div class="noor-guide-robe"></div><div class="noor-guide-book">۞</div></div><span class="noor-guide-sparkle">✧</span></div><p class="eyebrow">WELCOME TO YOUR DAILY COMPANION</p><h2 id="noor-welcome-title">Assalamu alaikum<span>.</span></h2><p>Let me show you around. Find prayer times, face the Qibla, read and listen to the Quran, save meaningful verses, and build gentle daily habits.</p><div class="noor-welcome-steps"><span>01 <b>Worship</b></span><span>02 <b>Learn</b></span><span>03 <b>Reflect</b></span></div><button class="button button-gold noor-welcome-start" type="button">Begin my journey <span>↗</span></button><small class="noor-welcome-note">You can explore any feature from the navigation above.</small></section>';
    document.body.appendChild(veil);
    const close = () => { localStorage.setItem("noor.welcomeSeen", "yes"); veil.classList.add("is-closing"); window.setTimeout(() => veil.remove(), 260); };
    veil.querySelector(".noor-welcome-close").addEventListener("click", close);
    veil.querySelector(".noor-welcome-start").addEventListener("click", close);
  }
})();

/* ============================================================
   NOOR i18n — English / Indonesian interface language.
   Translates UI chrome only; Quran, dua and Arabic content
   (lang="ar" / translate="no") is never touched.
   ============================================================ */
(() => {
  "use strict";

  const STORAGE_KEY = "noor.lang";
  const DICT = {
    /* Navigation */
    "Home": "Beranda",
    "Prayer times": "Waktu Sholat",
    "Qibla": "Kiblat",
    "Quran": "Al-Qur'an",
    "Duas & dhikr": "Doa & Dzikir",
    "Islamic calendar": "Kalender Islam",
    "My Journey": "Perjalananku",
    "Ask Noor": "Tanya Noor",
    "Saved verses": "Ayat Tersimpan",
    "Log in": "Masuk",
    /* Welcome guide */
    "WELCOME TO YOUR DAILY COMPANION": "SELAMAT DATANG DI TEMAN HARIANMU",
    "Let me show you around. Find prayer times, face the Qibla, read and listen to the Quran, save meaningful verses, and build gentle daily habits.":
      "Mari berkeliling sebentar. Temukan waktu sholat, arah Kiblat, baca dan dengarkan Al-Qur'an, simpan ayat yang bermakna, dan bangun kebiasaan harian yang baik.",
    "Worship": "Ibadah",
    "Learn": "Belajar",
    "Reflect": "Renungkan",
    "Begin my journey": "Mulai perjalananku",
    "You can explore any feature from the navigation above.": "Kamu bisa menjelajahi semua fitur lewat navigasi di atas.",
    /* Prayer times */
    "Start of fasting": "Awal puasa",
    "Fajr": "Subuh",
    "Sunrise": "Terbit",
    "Dhuhr": "Dzuhur",
    "Asr": "Ashar",
    "Isha": "Isya",
    "Next prayer": "Sholat berikutnya",
    "All five prayers for today have passed. Alhamdulillah.": "Kelima waktu sholat hari ini telah lewat. Alhamdulillah.",
    /* Quran reader & mushaf */
    "Open the mushaf": "Buka Mushaf",
    "Play whole surah": "Putar seluruh surah",
    "Pause": "Jeda",
    "Resume": "Lanjutkan",
    "Stop": "Berhenti",
    "Repeat verse": "Ulangi ayat",
    "Listen": "Dengarkan",
    "Translation": "Terjemahan",
    "Transliteration": "Transliterasi",
    /* Common */
    "Search": "Cari",
    "Save": "Simpan",
    "Cancel": "Batal",
    "Loading\u2026": "Memuat\u2026"
  };

  const stored = localStorage.getItem(STORAGE_KEY);
  const browserLang = (navigator.language || "").toLowerCase();
  const lang = (stored === "id" || stored === "en") ? stored : (browserLang.startsWith("id") ? "id" : "en");
  document.documentElement.lang = lang;

  const translateString = value => {
    if (!value) return value;
    const core = value.replace(/^\s+|\s+$/g, "");
    let translated = DICT[core];
    if (!translated && core.startsWith("Hello, ")) translated = "Halo, " + core.slice(7);
    if (!translated || translated === core) return value;
    const lead = value.match(/^\s*/)[0];
    const trail = value.match(/\s*$/)[0];
    return lead + translated + trail;
  };

  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "OPTION"]);
  const isProtected = el => !el || !!el.closest('[lang="ar"], [translate="no"], .lang-switcher');

  const translateTextNode = node => {
    const parent = node.parentElement;
    if (!parent || SKIP_TAGS.has(parent.tagName) || isProtected(parent)) return;
    const next = translateString(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  };

  const translatePlaceholders = root => {
    if (!root.querySelectorAll) return;
    root.querySelectorAll("input[placeholder], textarea[placeholder]").forEach(el => {
      if (isProtected(el)) return;
      const current = el.getAttribute("placeholder");
      const next = translateString(current);
      if (next && next !== current) el.setAttribute("placeholder", next);
    });
  };

  const translateTree = root => {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { translateTextNode(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE && isProtected(root)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName) || isProtected(parent)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTextNode);
    translatePlaceholders(root);
  };

  /* --- Language switcher pill in the topbar (always visible) --- */
  const topbar = document.querySelector(".topbar");
  if (topbar && !topbar.querySelector(".lang-switcher")) {
    const style = document.createElement("style");
    style.textContent = [
      ".lang-switcher{display:inline-flex;align-items:center;gap:2px;margin-left:auto;padding:2px;border:1px solid rgba(176,141,58,.45);border-radius:999px;background:rgba(255,252,244,.85)}",
      ".lang-switcher .lang-btn{border:0;background:transparent;padding:4px 10px;border-radius:999px;font-family:inherit;font-weight:600;font-size:12px;line-height:1.2;letter-spacing:.04em;color:#6b5b3e;cursor:pointer;transition:background .2s ease,color .2s ease}",
      ".lang-switcher .lang-btn:hover{color:#3d3article02a}",
      ".lang-switcher .lang-btn.is-active{background:linear-gradient(135deg,#b08d3a,#d4af37);color:#fff;box-shadow:0 1px 4px rgba(176,141,58,.35)}"
    ].join("");
    document.head.appendChild(style);
    const wrap = document.createElement("div");
    wrap.className = "lang-switcher";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Interface language / Bahasa antarmuka");
    [["en", "EN"], ["id", "ID"]].forEach(([code, label]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.className = "lang-btn" + (lang === code ? " is-active" : "");
      btn.setAttribute("aria-pressed", String(lang === code));
      btn.addEventListener("click", () => {
        if (lang === code) return;
        localStorage.setItem(STORAGE_KEY, code);
        window.location.reload();
      });
      wrap.appendChild(btn);
    });
    topbar.appendChild(wrap);
  }

  /* --- Apply Indonesian translation (English is the source, no work needed) --- */
  if (lang !== "id") return;

  translateTree(document.body);
  if (document.title) {
    document.title = document.title.split("\u00b7").map(part => translateString(part)).join("\u00b7");
  }

  const pending = new Set();
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    pending.forEach(node => { if (node.isConnected !== false) translateTree(node); });
    pending.clear();
  };
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === "characterData") pending.add(mutation.target);
      mutation.addedNodes.forEach(node => pending.add(node));
    });
    if (!scheduled && pending.size) { scheduled = true; requestAnimationFrame(flush); };
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
