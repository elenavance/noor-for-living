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