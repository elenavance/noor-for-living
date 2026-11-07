(() => {
  const API_V4 = "https://api.quran.com/api/v4";
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

  let chapters = [];
  let currentPage = Number(localStorage.getItem("noor.mushafPage")) || 1;
  if (currentPage < 1 || currentPage > TOTAL_PAGES) currentPage = 1;
  let currentVerses = [];
  let turning = false;

  // ---- page audio ----
  const audio = new Audio();
  let audioIdx = -1, playing = false;

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle("is-error", isError);
  }

  function toArabicNumerals(num) {
    return String(num).replace(/\d/g, d => "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669"[d]);
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
      option.textContent = ch.id + ". " + ch.name_simple + " \u2014 " + ch.name_arabic;
      surahSelect.appendChild(option);
    });
  }

  function stopAudio() {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audioIdx = -1;
    playing = false;
    playBtn.textContent = "\u25B6 Play this page";
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
      playBtn.textContent = "\u23F8 Pause";
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
    if (playing) { audio.pause(); playing = false; playBtn.textContent = "\u25B6 Resume"; return; }
    if (audioIdx >= 0 && audio.src) { audio.play().then(() => { playing = true; playBtn.textContent = "\u23F8 Pause"; }).catch(() => {}); return; }
    playVerse(0);
  });

  function chapterOf(verseKey) {
    return Number(String(verseKey).split(":")[0]);
  }

  function renderPage(verses) {
    pageEl.replaceChildren();
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
        ornament.textContent = "\u06DE";
        const nameAr = document.createElement("h3");
        nameAr.className = "m-surah-name";
        nameAr.textContent = "\u0633\u0648\u0631\u0629 " + (chapter ? chapter.name_arabic : "");
        const nameEn = document.createElement("p");
        nameEn.className = "m-surah-en";
        nameEn.textContent = chapter ? (chapter.id + ". " + chapter.name_simple + " \u00B7 " + chapter.translated_name.name) : "";
        header.append(ornament, nameAr, nameEn);
        if (chapterId !== 1 && chapterId !== 9) {
          const bismillah = document.createElement("p");
          bismillah.className = "m-bismillah";
          bismillah.textContent = "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u064e\u0651\u0647\u0650 \u0627\u0644\u0631\u064e\u0651\u062D\u0652\u0645\u0670\u0646\u0650 \u0627\u0644\u0631\u064e\u0651\u062D\u0650\u064A\u0645\u0650";
          header.appendChild(bismillah);
        }
        pageEl.appendChild(header);
      }
      const span = document.createElement("span");
      span.className = "m-verse";
      span.dataset.idx = String(idx);
      span.textContent = verse.text_uthmani + " ";
      const marker = document.createElement("span");
      marker.className = "m-ayah-marker";
      marker.textContent = "\u06DD" + toArabicNumerals(Number(String(verse.verse_key).split(":")[1]));
      span.appendChild(marker);
      span.appendChild(document.createTextNode(" "));
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
    setStatus("Loading page " + n + "\u2026");
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
      pageInfoEl.textContent = "Page " + toArabicNumerals(n) + " of " + toArabicNumerals(TOTAL_PAGES) + (juz ? " \u00B7 " + juz : "") + (firstChapter ? " \u00B7 " + firstChapter.name_simple : "");
      pageInput.value = String(n);
      setStatus("Mushaf page " + n + " \u00B7 Madinah layout \u00B7 swipe or tap the page edges to turn.");
    } catch (error) {
      setStatus(error.message || "Could not load this page. Check your connection and try again.", true);
    } finally {
      pageEl.classList.remove("flip-next", "flip-prev");
      turning = false;
    }
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

  loadPage(currentPage);
})();
