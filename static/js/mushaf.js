(() => {
  const API_V4 = "https://api.quran.com/api/v4";
  const API_CLOUD = "https://api.alquran.cloud/v1";
  const AUDIO_CDN = "https://cdn.islamic.network/quran/audio/128/ar.alafasy/";
  const TOTAL_PAGES = 604;
  const pageEl = document.getElementById("mushaf-page");
  const statusEl = document.getElementById("mushaf-status");
  const pageInfoEl = document.getElementById("mushaf-page-info");
  const prevBtn = document.getElementById("mushaf-prev");
  const nextBtn = document.getElementById("mushaf-next");
  const pageInput = document.getElementById("mushaf-page-input");
  const pageGo = document.getElementById("mushaf-page-go");
  const surahSelect = document.getElementById("mushaf-surah-select");
  const playBtn = document.getElementById("mushaf-play");
  const translitBtn = document.getElementById("mushaf-transliteration");

  let chapters = [];
  let currentPage = Number(localStorage.getItem("noor.mushafPage")) || 1;
  if (currentPage < 1 || currentPage > TOTAL_PAGES) currentPage = 1;
  let currentVerses = [];
  let turning = false;

  // ---- pronunciation (transliteration) state ----
  let showTranslit = localStorage.getItem("noor.mushafTranslit") === "1";
  const translitCache = new Map(); // page -> Map("surah:ayah" -> transliteration text)

  // ---- page audio ----
  const audio = new Audio();
  let audioIdx = -1, playing = false;

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle("is-error", isError);
  }

  function toArabicNumerals(num) {
    return String(num).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
  }

  async function apiGet(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("The mushaf text service is temporarily unavailable. Please try again.");
    return response.json();
  }

  async function loadChapters() {
    if (chapters.length) return;
    const data = await apiGet(API_V4 + "/chapters?language=en");
    chapters = data.chapters || [];
    surahSelect.replaceChildren();
    chapters.forEach(ch => {
      const option = document.createElement("option");
      const startPage = ch.pages && ch.pages.length ? ch.pages[0] : "";
      option.value = String(startPage);
      option.textContent = ch.id + ". " + ch.name_simple + " — " + ch.name_arabic;
      surahSelect.appendChild(option);
    });
  }

  // ---- pronunciation data ----
  function injectTranslitStyles() {
    if (document.getElementById("noor-mushaf-translit-styles")) return;
    const css = `
      #mushaf-transliteration.is-on{background:#123c32;color:#f8f5ed;border-color:#123c32;}
      .mushaf-page.show-translit{line-height:1.9;}
      .mushaf-page.show-translit .m-verse{display:block;text-align:right;margin:0 0 14px;}
      .m-translit{display:block;direction:ltr;text-align:left;font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.55;color:#7a6c3f;font-style:italic;margin-top:4px;}
      .m-translit.is-loading{opacity:.45;font-style:normal;}
    `;
    const style = document.createElement("style");
    style.id = "noor-mushaf-translit-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  async function loadTranslitPage(n) {
    if (translitCache.has(n)) return translitCache.get(n);
    const payload = await apiGet(API_CLOUD + "/page/" + n + "/en.transliteration");
    const map = new Map();
    (payload.data && payload.data.ayahs ? payload.data.ayahs : []).forEach(a => {
      if (a.surah && a.text) map.set(a.surah.number + ":" + a.numberInSurah, a.text);
    });
    translitCache.set(n, map);
    return map;
  }

  function updateTranslitToggle() {
    if (!translitBtn) return;
    translitBtn.classList.toggle("is-on", showTranslit);
    translitBtn.setAttribute("aria-pressed", showTranslit ? "true" : "false");
    translitBtn.textContent = showTranslit ? "Aa Pronunciation: on" : "Aa Pronunciation: off";
    pageEl.classList.toggle("show-translit", showTranslit);
  }

  function stopAudio() {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audioIdx = -1;
    playing = false;
    playBtn.textContent = "▶ Play this page";
    pageEl.querySelectorAll(".m-verse.is-playing").forEach(v => v.classList.remove("is-playing"));
  }

  function playVerse(idx) {
    if (idx < 0 || idx >= currentVerses.length) { stopAudio(); return; }
    audioIdx = idx;
    audio.src = AUDIO_CDN + currentVerses[idx].id + ".mp3";
    pageEl.querySelectorAll(".m-verse.is-playing").forEach(v => v.classList.remove("is-playing"));
    const span = pageEl.querySelector('.m-verse[data-idx="' + idx + '"]');
    if (span) span.classList.add("is-playing");
    audio.play().then(() => {
      playing = true;
      playBtn.textContent = "⏸ Pause";
    }).catch(() => {
      stopAudio();
      setStatus("Audio could not be played. Check your connection and try again.", true);
    });
  }

  audio.addEventListener("ended", () => {
    if (audioIdx >= 0 && audioIdx + 1 < currentVerses.length) playVerse(audioIdx + 1);
    else stopAudio();
  });
  audio.addEventListener("error", () => { stopAudio(); });

  playBtn.addEventListener("click", () => {
    if (playing) { audio.pause(); playing = false; playBtn.textContent = "▶ Resume"; return; }
    if (audioIdx >= 0 && audio.src) { audio.play().then(() => { playing = true; playBtn.textContent = "⏸ Pause"; }).catch(() => {}); return; }
    playVerse(0);
  });

  function chapterOf(verseKey) {
    return Number(String(verseKey).split(":")[0]);
  }

  function renderPage(verses) {
    pageEl.replaceChildren();
    const translitMap = showTranslit ? translitCache.get(currentPage) : null;
    let lastChapter = null;
    verses.forEach((verse, idx) => {
      const chapterId = chapterOf(verse.verse_key);
      if (chapterId !== lastChapter) {
        lastChapter = chapterId;
        const chapter = chapters.find(c => c.id === chapterId);
        const header = document.createElement("div");
        header.className = "m-surah-header";
        const ornament = document.createElement("div");
        ornament.className = "m-ornament";
        ornament.textContent = "۞";
        const nameAr = document.createElement("h3");
        nameAr.className = "m-surah-name";
        nameAr.textContent = "سورة " + (chapter ? chapter.name_arabic : "");
        const nameEn = document.createElement("p");
        nameEn.className = "m-surah-en";
        nameEn.textContent = chapter ? (chapter.id + ". " + chapter.name_simple + " · " + chapter.translated_name.name) : "";
        header.append(ornament, nameAr, nameEn);
        if (chapterId !== 1 && chapterId !== 9) {
          const bismillah = document.createElement("p");
          bismillah.className = "m-bismillah";
          bismillah.textContent = "بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيمِ";
          header.appendChild(bismillah);
          if (showTranslit) {
            const bismillahTranslit = document.createElement("p");
            bismillahTranslit.className = "m-translit m-bismillah-translit";
            bismillahTranslit.setAttribute("dir", "ltr");
            bismillahTranslit.textContent = "Bismillaahir-Rahmaanir-Raheem — In the name of Allah, the Most Gracious, the Most Merciful";
            header.appendChild(bismillahTranslit);
          }
        }
        pageEl.appendChild(header);
      }
      const span = document.createElement("span");
      span.className = "m-verse";
      span.dataset.idx = String(idx);
      span.textContent = verse.text_uthmani + " ";
      const marker = document.createElement("span");
      marker.className = "m-ayah-marker";
      marker.textContent = "۝" + toArabicNumerals(Number(String(verse.verse_key).split(":")[1]));
      span.appendChild(marker);
      span.appendChild(document.createTextNode(" "));
      if (showTranslit) {
        const translit = document.createElement("span");
        translit.className = "m-translit" + (translitMap ? "" : " is-loading");
        translit.setAttribute("dir", "ltr");
        translit.lang = "en";
        translit.textContent = translitMap ? (translitMap.get(verse.verse_key) || "") : "Loading pronunciation…";
        span.appendChild(translit);
      }
      pageEl.appendChild(span);
    });
  }

  async function loadPage(n, direction = null) {
    if (turning || n < 1 || n > TOTAL_PAGES) return;
    turning = true;
    stopAudio();
    if (direction) {
      pageEl.classList.add(direction === "next" ? "flip-next" : "flip-prev");
      await new Promise(resolve => setTimeout(resolve, 260));
    }
    setStatus("Loading page " + n + "…");
    try {
      await loadChapters();
      const data = await apiGet(API_V4 + "/verses/by_page/" + n + "?language=en&words=false&fields=text_uthmani,juz_number&per_page=60");
      const verses = (data.verses || []).filter(v => v.text_uthmani);
      if (!verses.length) throw new Error("This page could not be loaded.");
      currentPage = n;
      currentVerses = verses;
      localStorage.setItem("noor.mushafPage", String(n));
      renderPage(verses);
      const juz = verses[0].juz_number ? "Juz " + verses[0].juz_number : "";
      const firstChapter = chapters.find(c => c.id === chapterOf(verses[0].verse_key));
      pageInfoEl.textContent = "Page " + toArabicNumerals(n) + " of " + toArabicNumerals(TOTAL_PAGES) + (juz ? " · " + juz : "") + (firstChapter ? " · " + firstChapter.name_simple : "");
      pageInput.value = String(n);
      setStatus("Mushaf page " + n + " · Madinah layout · swipe or tap the page edges to turn.");
      if (showTranslit) {
        try {
          await loadTranslitPage(n);
          if (currentPage === n) renderPage(currentVerses);
        } catch (error) {
          setStatus("Pronunciation guide could not be loaded for this page. The Arabic text is unaffected.", true);
        }
      }
    } catch (error) {
      setStatus(error.message || "Could not load this page. Check your connection and try again.", true);
    } finally {
      pageEl.classList.remove("flip-next", "flip-prev");
      turning = false;
    }
  }

  if (translitBtn) {
    translitBtn.addEventListener("click", async () => {
      showTranslit = !showTranslit;
      localStorage.setItem("noor.mushafTranslit", showTranslit ? "1" : "0");
      updateTranslitToggle();
      if (showTranslit) {
        renderPage(currentVerses);
        try {
          await loadTranslitPage(currentPage);
          renderPage(currentVerses);
        } catch (error) {
          setStatus("Pronunciation guide could not be loaded. The Arabic text is unaffected.", true);
        }
      } else {
        renderPage(currentVerses);
      }
    });
  }

  // Mushaf turns right-to-left, like a physical Arabic book.
  nextBtn.addEventListener("click", () => loadPage(currentPage + 1, "next"));
  prevBtn.addEventListener("click", () => loadPage(currentPage - 1, "prev"));
  pageGo.addEventListener("click", () => {
    const n = Number(pageInput.value);
    if (n >= 1 && n <= TOTAL_PAGES) loadPage(n, n > currentPage ? "next" : "prev");
  });
  pageInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); pageGo.click(); } });
  surahSelect.addEventListener("change", () => {
    const n = Number(surahSelect.value);
    if (n >= 1 && n <= TOTAL_PAGES) loadPage(n, n > currentPage ? "next" : "prev");
  });

  // Swipe / tap edges to turn pages.
  let touchX = null;
  pageEl.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
  pageEl.addEventListener("touchend", e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (dx < -50) loadPage(currentPage + 1, "next");
    else if (dx > 50) loadPage(currentPage - 1, "prev");
    touchX = null;
  }, { passive: true });
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") loadPage(currentPage + 1, "next");
    else if (e.key === "ArrowRight") loadPage(currentPage - 1, "prev");
  });

  injectTranslitStyles();
  updateTranslitToggle();
  loadPage(currentPage);
})();
