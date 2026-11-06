(() => {
  const API = "https://api.alquran.cloud/v1";
  const AUDIO_EDITION = "ar.alafasy";
  const select = document.getElementById("surah-select"), status = document.getElementById("quran-status");
  const heading = document.getElementById("surah-heading"), title = document.getElementById("surah-title");
  const meta = document.getElementById("surah-meta"), translation = document.getElementById("surah-translation"), list = document.getElementById("ayah-list");
  const config = window.NOOR_QURAN_CONFIG || {}, saved = new Set(config.savedVerses || []);
  const csrf = document.querySelector("#csrf-form [name=csrfmiddlewaretoken]")?.value || "";
  let activeObserver = null, progressSaveTimer = null, latestProgress = null, savingProgress = false;

  // ---- Recitation player state ----
  const player = {
    audio: new Audio(),
    surah: null,          // surah number currently loaded into the playlist
    playlist: [],         // [{numberInSurah, audio}]
    idx: -1,              // index in playlist of current track
    repeatOne: false,
    loadingAudio: false,
  };
  let playerBar = null, playerLabel = null, playAllBtn = null, pauseBtn = null, stopBtn = null, repeatBtn = null;

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

  function injectPlayerStyles() {
    if (document.getElementById("noor-player-styles")) return;
    const css = `
      .quran-player-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:16px 0;padding:12px 14px;border:1px solid #d9cfae;border-radius:12px;background:#f8f5ed;}
      .quran-player-bar button{cursor:pointer;border:1px solid #123c32;background:#123c32;color:#f8f5ed;border-radius:8px;padding:8px 12px;font-size:14px;line-height:1;}
      .quran-player-bar button[disabled]{opacity:.5;cursor:default;}
      .quran-player-bar button.is-toggle-off{background:transparent;color:#123c32;}
      .quran-player-label{font-size:13px;color:#123c32;margin-left:auto;}
      .ayah-card.is-reciting{outline:2px solid #b98d2f;outline-offset:2px;border-radius:8px;}
      .ayah-translation-id{margin-top:4px;font-size:.95em;}
      .ayah-translation-id .translation-tag{display:block;font-size:.7em;letter-spacing:.08em;text-transform:uppercase;color:#7a6c3f;}
    `;
    const style = document.createElement("style");
    style.id = "noor-player-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildPlayerBar() {
    if (playerBar) return;
    injectPlayerStyles();
    playerBar = make("div", "quran-player-bar");
    playAllBtn = make("button", "", "\u25B6 Play whole surah");
    pauseBtn = make("button", "", "\u23F8 Pause");
    stopBtn = make("button", "", "\u23F9 Stop");
    repeatBtn = make("button", "is-toggle-off", "\u21BB Repeat verse: off");
    playerLabel = make("span", "quran-player-label", "Mishary Rashid Alafasy");
    playAllBtn.type = pauseBtn.type = stopBtn.type = repeatBtn.type = "button";
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    playerBar.append(playAllBtn, pauseBtn, stopBtn, repeatBtn, playerLabel);
    heading.after(playerBar);

    playAllBtn.addEventListener("click", () => playFromIndex(0));
    pauseBtn.addEventListener("click", togglePause);
    stopBtn.addEventListener("click", stopPlayback);
    repeatBtn.addEventListener("click", () => {
      player.repeatOne = !player.repeatOne;
      repeatBtn.textContent = player.repeatOne ? "\u21BB Repeat verse: on" : "\u21BB Repeat verse: off";
      repeatBtn.classList.toggle("is-toggle-off", !player.repeatOne);
    });

    player.audio.addEventListener("ended", onTrackEnded);
    player.audio.addEventListener("error", () => {
      setStatus("Audio could not be played. Please try again.", true);
      updatePlayingUI(-1);
    });
    player.audio.addEventListener("play", () => { pauseBtn.disabled = false; stopBtn.disabled = false; pauseBtn.textContent = "\u23F8 Pause"; });
    player.audio.addEventListener("pause", () => {
      if (!player.audio.ended) pauseBtn.textContent = "\u25B6 Resume";
    });
  }

  async function ensurePlaylist(surahNumber) {
    if (player.surah === surahNumber && player.playlist.length) return;
    player.loadingAudio = true;
    setStatus("Loading recitation audio for this surah\u2026");
    const data = await apiGet(API + "/surah/" + surahNumber + "/" + AUDIO_EDITION);
    player.playlist = (data.ayahs || []).map(a => ({numberInSurah: a.numberInSurah, audio: a.audio}));
    player.surah = surahNumber;
    player.loadingAudio = false;
  }

  async function playFromIndex(idx) {
    const surahNumber = Number(select.value);
    if (!surahNumber) return;
    try {
      await ensurePlaylist(surahNumber);
    } catch (error) {
      player.loadingAudio = false;
      setStatus(error.message || "Recitation audio is not available right now.", true);
      return;
    }
    if (idx < 0 || idx >= player.playlist.length) return;
    player.idx = idx;
    const track = player.playlist[idx];
    player.audio.src = track.audio;
    try {
      await player.audio.play();
      updatePlayingUI(track.numberInSurah);
      setStatus("Playing male Quran recitation \u00B7 Mishary Rashid Alafasy \u00B7 " + surahNumber + ":" + track.numberInSurah);
    } catch (error) {
      setStatus("Audio could not be played. Please try again.", true);
      updatePlayingUI(-1);
    }
  }

  function togglePause() {
    if (!player.audio.src) return;
    if (player.audio.paused) player.audio.play();
    else player.audio.pause();
  }

  function stopPlayback() {
    player.audio.pause();
    player.audio.removeAttribute("src");
    player.audio.load();
    player.idx = -1;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    updatePlayingUI(-1);
  }

  function onTrackEnded() {
    if (player.repeatOne && player.idx >= 0) {
      playFromIndex(player.idx);
    } else if (player.idx >= 0 && player.idx + 1 < player.playlist.length) {
      playFromIndex(player.idx + 1);
    } else {
      player.idx = -1;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
      updatePlayingUI(-1);
      setStatus("Recitation finished. Taqabbalallahu minna wa minkum.");
    }
  }

  function updatePlayingUI(activeAyahNumber) {
    list.querySelectorAll(".ayah-card.is-reciting").forEach(c => c.classList.remove("is-reciting"));
    list.querySelectorAll(".ayah-audio-button").forEach(b => { b.classList.remove("is-playing"); b.textContent = "\u25B6 Listen"; });
    if (activeAyahNumber > 0) {
      const card = document.getElementById("ayah-" + activeAyahNumber);
      if (card) {
        card.classList.add("is-reciting");
        const btn = card.querySelector(".ayah-audio-button");
        if (btn) { btn.classList.add("is-playing"); btn.textContent = "\u23F8 Playing"; }
        card.scrollIntoView({behavior: "smooth", block: "center"});
      }
    }
  }

  function fillSurahSelect(surahs) {
    select.replaceChildren();
    surahs.forEach(s => {
      const option = document.createElement("option");
      option.value = s.number;
      option.textContent = s.number + ". " + s.englishName + " \u2014 " + s.englishNameTranslation;
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

  function renderAyah(ayah, surah, translatedAyah, transliteratedAyah, indonesianAyah) {
    const reference = surah.number + ":" + ayah.numberInSurah;
    const article = make("article", "ayah-card");
    article.id = "ayah-" + ayah.numberInSurah;
    article.dataset.ayahNumber = String(ayah.numberInSurah);

    const top = make("div", "ayah-card-top");
    top.append(make("span", "ayah-reference", reference));
    const button = make("button", "bookmark-button", saved.has(reference) ? "\u2605 Saved" : "\u2606 Save verse");
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
        button.textContent = result.saved ? "\u2605 Saved" : "\u2606 Save verse";
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
    const pronunciation = make("p", "ayah-transliteration", transliteratedAyah.text);
    pronunciation.setAttribute("lang", "en");
    const english = make("p", "ayah-translation", translatedAyah.text);
    const recitation = make("button", "ayah-audio-button", "\u25B6 Listen");
    recitation.type = "button";
    recitation.setAttribute("aria-label", "Play male recitation for " + reference);
    recitation.addEventListener("click", () => {
      // If this ayah is the current track, treat the button as pause/resume.
      if (player.surah === surah.number && player.idx >= 0 &&
          player.playlist[player.idx] && player.playlist[player.idx].numberInSurah === ayah.numberInSurah &&
          player.audio.src) {
        togglePause();
        return;
      }
      // Otherwise start continuous playback from this ayah.
      ensurePlaylistAndPlay(surah.number, ayah.numberInSurah);
    });
    article.append(top, arabic, pronunciation, english);
    if (indonesianAyah && indonesianAyah.text) {
      const indonesian = make("p", "ayah-translation-id");
      const tag = make("span", "translation-tag", "Indonesia \u00B7 Kemenag RI");
      indonesian.append(tag, document.createTextNode(indonesianAyah.text));
      indonesian.setAttribute("lang", "id");
      article.appendChild(indonesian);
    }
    article.appendChild(recitation);
    return article;
  }

  async function ensurePlaylistAndPlay(surahNumber, numberInSurah) {
    try {
      await ensurePlaylist(surahNumber);
    } catch (error) {
      player.loadingAudio = false;
      setStatus(error.message || "Recitation audio is not available right now.", true);
      return;
    }
    const idx = player.playlist.findIndex(t => t.numberInSurah === numberInSurah);
    playFromIndex(idx < 0 ? 0 : idx);
  }

  async function loadSurah(number, resumeAyah = null) {
    select.disabled = true;
    stopPlaybackIfActive();
    if (activeObserver) activeObserver.disconnect();
    list.replaceChildren(make("div", "reader-placeholder", "Loading verses\u2026"));
    heading.hidden = true;
    if (playerBar) playerBar.hidden = true;
    setStatus("Loading surah " + number + "\u2026");
    try {
      const editions = await apiGet(API + "/surah/" + number + "/editions/quran-uthmani,en.transliteration,en.sahih,id.indonesian");
      const ar = editions[0], transliteration = editions[1], en = editions[2], idn = editions[3];
      if (!ar || !transliteration || !en || !ar.ayahs || !transliteration.ayahs || !en.ayahs) throw new Error("This surah is not available right now.");
      title.textContent = ar.englishName;
      meta.textContent = "SURAH " + ar.number + " \u00B7 " + ar.revelationType.toUpperCase() + " \u00B7 " + ar.numberOfAyahs + " VERSES";
      translation.textContent = ar.englishNameTranslation;
      heading.hidden = false;
      list.replaceChildren();
      ar.ayahs.forEach((ayah, i) => {
        if (en.ayahs[i] && transliteration.ayahs[i]) list.appendChild(renderAyah(ayah, ar, en.ayahs[i], transliteration.ayahs[i], idn && idn.ayahs ? idn.ayahs[i] : null));
      });
      buildPlayerBar();
      playerBar.hidden = false;
      setStatus("Showing " + ar.englishName + " with Arabic, pronunciation guide, English and Indonesian meanings, and male recitation.");
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

  function stopPlaybackIfActive() {
    if (player.audio && player.audio.src) {
      player.audio.pause();
      player.audio.removeAttribute("src");
      player.audio.load();
    }
    player.surah = null;
    player.playlist = [];
    player.idx = -1;
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
