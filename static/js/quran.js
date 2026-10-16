(() => {
  const API = "https://api.alquran.cloud/v1";
  const select = document.getElementById("surah-select"), status = document.getElementById("quran-status");
  const heading = document.getElementById("surah-heading"), title = document.getElementById("surah-title");
  const meta = document.getElementById("surah-meta"), translation = document.getElementById("surah-translation"), list = document.getElementById("ayah-list");
  const config = window.NOOR_QURAN_CONFIG || {}, saved = new Set(config.savedVerses || []);
  const csrf = document.querySelector("#csrf-form [name=csrfmiddlewaretoken]")?.value || "";
  let activeObserver = null, progressSaveTimer = null, latestProgress = null, savingProgress = false;

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle("is-error", error);
  }

  async function apiGet(url) {
    const response = await fetch(url, {headers: {Accept: "application/json"}});
    if (!response.ok) throw new Error("The Quran text service is temporarily unavailable. Please try again.");
    const payload = await response.json();
    if (payload.code !== 200 || !payload.data) throw new Error("The Quran text could not be loaded.");
    return payload.data;
  }

  function make(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fillSurahSelect(surahs) {
    select.replaceChildren();
    surahs.forEach(s => {
      const option = document.createElement("option");
      option.value = s.number;
      option.textContent = s.number + ". " + s.englishName + " — " + s.englishNameTranslation;
      select.appendChild(option);
    });
  }

  async function flushProgress() {
    if (savingProgress || !config.isAuthenticated || !config.progressUrl) return;
    savingProgress = true;
    while (latestProgress) {
      const current = latestProgress;
      latestProgress = null;
      try {
        const body = new URLSearchParams({
          surah_number: String(current.surah),
          ayah_number: String(current.ayah),
          surah_name: current.name
        });
        const response = await fetch(config.progressUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "X-CSRFToken": csrf,
            "X-Requested-With": "XMLHttpRequest"
          },
          body,
          credentials: "same-origin"
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Reading progress could not be saved.");
      } catch (error) {
        setStatus(error.message || "Reading progress could not be saved.", true);
      }
    }
    savingProgress = false;
  }

  function queueProgress(surah, ayah, name) {
    if (!config.isAuthenticated) return;
    latestProgress = {surah: surah.number, ayah: ayah.numberInSurah, name: name};
    window.clearTimeout(progressSaveTimer);
    progressSaveTimer = window.setTimeout(flushProgress, 450);
  }

  function watchReadingPosition(surah, name) {
    if (activeObserver) activeObserver.disconnect();
    if (!config.isAuthenticated || !("IntersectionObserver" in window)) return;
    activeObserver = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const reference = visible[0].target.dataset.ayahNumber;
      if (reference) queueProgress(surah, {numberInSurah: Number(reference)}, name);
    }, {rootMargin: "-8% 0px -68% 0px", threshold: 0});
    list.querySelectorAll(".ayah-card").forEach(card => activeObserver.observe(card));
  }

  function renderAyah(ayah, surah, translatedAyah, transliteratedAyah) {
    const reference = surah.number + ":" + ayah.numberInSurah;
    const article = make("article", "ayah-card");
    article.id = "ayah-" + ayah.numberInSurah;
    article.dataset.ayahNumber = String(ayah.numberInSurah);

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
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "X-CSRFToken": csrf,
            "X-Requested-With": "XMLHttpRequest"
          },
          body,
          credentials: "same-origin"
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Could not update your saved verses.");
        if (result.saved) saved.add(reference);
        else saved.delete(reference);
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
    const recitation = make("button", "ayah-audio-button", "▶ Listen");
    recitation.type = "button";
    recitation.setAttribute("aria-label", "Play male recitation for " + reference);
    const pronunciation = make("p", "ayah-transliteration", transliteratedAyah.text);
    pronunciation.setAttribute("lang", "en");
    const english = make("p", "ayah-translation", translatedAyah.text);
    recitation.addEventListener("click", async () => {
      document.querySelectorAll(".ayah-audio-button.is-playing").forEach(b => { b.classList.remove("is-playing"); b.textContent = "▶ Listen"; });
      recitation.disabled = true;
      recitation.textContent = "Loading audio…";
      try {
        const audioData = await apiGet(API + "/ayah/" + ayah.number + "/ar.alafasy");
        if (!audioData.audio) throw new Error("Recitation audio is not available for this verse.");
        if (window.noorQuranAudio) window.noorQuranAudio.pause();
        const player = new Audio(audioData.audio);
        window.noorQuranAudio = player;
        recitation.classList.add("is-playing");
        recitation.textContent = "Ⅱ Playing";
        player.addEventListener("ended", () => { recitation.classList.remove("is-playing"); recitation.textContent = "▶ Listen"; });
        player.addEventListener("error", () => { recitation.classList.remove("is-playing"); recitation.textContent = "▶ Listen"; setStatus("Audio could not be played. Please try again.", true); });
        await player.play();
        setStatus("Playing male Quran recitation · Mishary Rashid Alafasy · " + reference);
      } catch (error) {
        recitation.textContent = "▶ Listen";
        setStatus(error.message || "Audio could not be played.", true);
      } finally { recitation.disabled = false; }
    });
    article.append(top, arabic, pronunciation, english, recitation);
    return article;
  }

  async function loadSurah(number, resumeAyah = null) {
    select.disabled = true;
    if (activeObserver) activeObserver.disconnect();
    list.replaceChildren(make("div", "reader-placeholder", "Loading verses…"));
    heading.hidden = true;
    setStatus("Loading surah " + number + "…");
    try {
      const editions = await apiGet(API + "/surah/" + number + "/editions/quran-uthmani,en.transliteration,en.sahih");
      const ar = editions[0], transliteration = editions[1], en = editions[2];
      if (!ar || !transliteration || !en || !ar.ayahs || !transliteration.ayahs || !en.ayahs) throw new Error("This surah is not available right now.");
      title.textContent = ar.englishName;
      meta.textContent = "SURAH " + ar.number + " · " + ar.revelationType.toUpperCase() + " · " + ar.numberOfAyahs + " VERSES";
      translation.textContent = ar.englishNameTranslation;
      heading.hidden = false;
      list.replaceChildren();
      ar.ayahs.forEach((ayah, i) => {
        if (en.ayahs[i] && transliteration.ayahs[i]) list.appendChild(renderAyah(ayah, ar, en.ayahs[i], transliteration.ayahs[i]));
      });
      setStatus("Showing " + ar.englishName + " with Arabic, pronunciation guide, English meaning, and male recitation.");
      const url = new URL(window.location.href);
      url.searchParams.set("surah", String(number));
      window.history.replaceState({}, "", url);

      const targetAyah = Number(resumeAyah) || (window.location.hash.startsWith("#ayah-") ? Number(window.location.hash.slice(6)) : 0);
      if (targetAyah > 0) {
        const target = document.getElementById("ayah-" + targetAyah);
        if (target) window.setTimeout(() => target.scrollIntoView({behavior: "auto", block: "center"}), 100);
      }
      window.setTimeout(() => watchReadingPosition(ar, ar.englishName), 700);
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
      const params = new URLSearchParams(window.location.search);
      const requested = Number(params.get("surah"));
      const shouldResume = !params.has("surah") && config.initialProgress;
      const initial = shouldResume
        ? Number(config.initialProgress.surah)
        : (requested >= 1 && requested <= 114 ? requested : 1);
      const resumeAyah = shouldResume ? Number(config.initialProgress.ayah) : null;
      select.value = String(initial);
      select.addEventListener("change", () => loadSurah(Number(select.value)));
      await loadSurah(initial, resumeAyah);
    } catch (error) {
      select.replaceChildren(new Option("Quran index unavailable", ""));
      setStatus(error.message || "Could not load the Quran index. Check your connection and try again.", true);
      list.replaceChildren(make("div", "reader-placeholder reader-error", "Please reconnect and reload the page."));
    }
  }

  init();
})();
