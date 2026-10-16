(() => {
  const API = "https://api.alquran.cloud/v1";
  const select = document.getElementById("surah-select");
  const status = document.getElementById("quran-status");
  const heading = document.getElementById("surah-heading");
  const title = document.getElementById("surah-title");
  const meta = document.getElementById("surah-meta");
  const translation = document.getElementById("surah-translation");
  const list = document.getElementById("ayah-list");
  const config = window.NOOR_QURAN_CONFIG || {};
  const saved = new Set(config.savedVerses || []);
  const csrf = document.querySelector("#csrf-form [name=csrfmiddlewaretoken]")?.value || "";

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle("is-error", error);
  }

  async function apiGet(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("The Quran text service is temporarily unavailable. Please try again.");
    const payload = await response.json();
    if (payload.code !== 200 || !payload.data) throw new Error("The Quran text could not be loaded.");
    return payload.data;
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fillSurahSelect(surahs) {
    select.replaceChildren();
    surahs.forEach((surah) => {
      const option = document.createElement("option");
      option.value = surah.number;
      option.textContent = surah.number + ". " + surah.englishName + " — " + surah.englishNameTranslation;
      select.appendChild(option);
    });
  }

  function renderAyah(ayah, surah, translatedAyah) {
    const reference = surah.number + ":" + ayah.numberInSurah;
    const article = make("article", "ayah-card");
    article.id = "ayah-" + ayah.numberInSurah;
    const top = make("div", "ayah-card-top");
    top.append(make("span", "ayah-reference", reference));
    const button = make("button", "bookmark-button", saved.has(reference) ? "★ Saved" : "☆ Save verse");
    button.type = "button";
    button.setAttribute("aria-pressed", saved.has(reference) ? "true" : "false");
    button.addEventListener("click", async () => {
      if (!config.isAuthenticated) {
        window.location.href = config.loginUrl + "?next=" + encodeURIComponent(window.location.pathname + window.location.search + "#ayah-" + ayah.numberInSurah);
        return;
      }
      button.disabled = true;
      try {
        const body = new URLSearchParams({
          surah_number: String(surah.number),
          ayah_number: String(ayah.numberInSurah),
          surah_name: surah.englishName,
          arabic_text: ayah.text,
          translation_text: translatedAyah.text
        });
        const response = await fetch(config.bookmarkUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "X-CSRFToken": csrf, "X-Requested-With": "XMLHttpRequest" },
          body,
          credentials: "same-origin"
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Could not update your saved verses.");
        if (result.saved) saved.add(reference); else saved.delete(reference);
        button.textContent = result.saved ? "★ Saved" : "☆ Save verse";
        button.setAttribute("aria-pressed", result.saved ? "true" : "false");
        setStatus(result.saved ? "Verse saved to your collection." : "Verse removed from your saved collection.");
      } catch (error) {
        setStatus(error.message || "Could not update your saved verses.", true);
      } finally {
        button.disabled = false;
      }
    });
    top.appendChild(button);
    const arabic = make("p", "ayah-arabic");
    arabic.lang = "ar";
    arabic.dir = "rtl";
    arabic.setAttribute("translate", "no");
    arabic.textContent = ayah.text;
    const english = make("p", "ayah-translation", translatedAyah.text);
    article.append(top, arabic, english);
    return article;
  }

  async function loadSurah(number) {
    select.disabled = true;
    list.replaceChildren(make("div", "reader-placeholder", "Loading verses…"));
    heading.hidden = true;
    setStatus("Loading surah " + number + "…");
    try {
      const editions = await apiGet(API + "/surah/" + number + "/editions/quran-uthmani,en.sahih");
      const arabicSurah = editions[0];
      const englishSurah = editions[1];
      if (!arabicSurah || !englishSurah || !arabicSurah.ayahs || !englishSurah.ayahs) throw new Error("This surah is not available right now.");
      title.textContent = arabicSurah.englishName;
      meta.textContent = "SURAH " + arabicSurah.number + " · " + arabicSurah.revelationType.toUpperCase() + " · " + arabicSurah.numberOfAyahs + " VERSES";
      translation.textContent = arabicSurah.englishNameTranslation;
      heading.hidden = false;
      list.replaceChildren();
      arabicSurah.ayahs.forEach((ayah, index) => {
        const translatedAyah = englishSurah.ayahs[index];
        if (translatedAyah) list.appendChild(renderAyah(ayah, arabicSurah, translatedAyah));
      });
      setStatus("Showing " + arabicSurah.englishName + ". English translation: Saheeh International.");
      const url = new URL(window.location.href);
      url.searchParams.set("surah", String(number));
      window.history.replaceState({}, "", url);
      if (window.location.hash.startsWith("#ayah-")) {
        const target = document.getElementById(window.location.hash.slice(1));
        if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
      }
    } catch (error) {
      list.replaceChildren(make("div", "reader-placeholder reader-error", error.message || "Could not load this surah."));
      setStatus(error.message || "Could not load the Quran text.", true);
    } finally {
      select.disabled = false;
    }
  }

  async function init() {
    try {
      const surahs = await apiGet(API + "/surah");
      fillSurahSelect(surahs);
      const requested = Number(new URLSearchParams(window.location.search).get("surah"));
      const initial = requested >= 1 && requested <= 114 ? requested : 1;
      select.value = String(initial);
      select.addEventListener("change", () => loadSurah(Number(select.value)));
      await loadSurah(initial);
    } catch (error) {
      select.replaceChildren(new Option("Quran index unavailable", ""));
      setStatus(error.message || "Could not load the Quran index. Check your connection and try again.", true);
      list.replaceChildren(make("div", "reader-placeholder reader-error", "Please reconnect and reload the page."));
    }
  }

  init();
})();
