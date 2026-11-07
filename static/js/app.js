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

  const DAY_NAMES = {
    Monday: "Senin", Tuesday: "Selasa", Wednesday: "Rabu", Thursday: "Kamis",
    Friday: "Jumat", Saturday: "Sabtu", Sunday: "Minggu",
    Mon: "Sen", Tue: "Sel", Wed: "Rab", Thu: "Kam", Fri: "Jum", Sat: "Sab", Sun: "Min"
  };
  const MONTH_NAMES = {
    January: "Januari", February: "Februari", March: "Maret", April: "April",
    May: "Mei", June: "Juni", July: "Juli", August: "Agustus",
    September: "September", October: "Oktober", November: "November", December: "Desember",
    Jan: "Jan", Feb: "Feb", Mar: "Mar", Apr: "Apr", Jun: "Jun", Jul: "Jul",
    Aug: "Agu", Sep: "Sep", Oct: "Okt", Nov: "Nov", Dec: "Des"
  };
  const PRAYER_ID = { Fajr: "Subuh", Dhuhr: "Dzuhur", Asr: "Ashar", Maghrib: "Maghrib", Isha: "Isya", Imsak: "Imsak" };

  const DICT = {
    /* ---- Navigation & chrome ---- */
    "Home": "Beranda",
    "Prayer times": "Waktu Sholat",
    "Prayer Times": "Waktu Sholat",
    "Qibla": "Kiblat",
    "Qibla Direction": "Arah Kiblat",
    "Quran": "Al-Qur'an",
    "Quran reader": "Pembaca Al-Qur'an",
    "Quran Reader": "Pembaca Al-Qur'an",
    "Duas & dhikr": "Doa & Dzikir",
    "Daily Duas & Dhikr": "Doa & Dzikir Harian",
    "Islamic calendar": "Kalender Islam",
    "Islamic Calendar": "Kalender Islam",
    "My Journey": "Perjalananku",
    "My Spiritual Journey": "Perjalanan Spiritualku",
    "Ask Noor": "Tanya Noor",
    "Saved verses": "Ayat Tersimpan",
    "My Saved Verses": "Ayat Tersimpan",
    "My bookmarks": "Ayat tersimpan",
    "Log in": "Masuk",
    "Log out": "Keluar",
    "Back to home": "Kembali ke beranda",
    "Features": "Fitur",
    "Duas": "Doa",
    "Prayer": "Sholat",
    "Profile": "Profil",
    "Saved": "Tersimpan",
    "Calendar": "Kalender",
    "Track": "Catat",
    "Journey": "Perjalanan",
    "Explore": "Jelajahi",
    "Our purpose": "Tujuan kami",
    "Offline": "Luring",
    "Your Daily Islamic Companion": "Teman Islami Harianmu",
    "Welcome,": "Selamat datang,",

    /* ---- Welcome guide ---- */
    "WELCOME TO YOUR DAILY COMPANION": "SELAMAT DATANG DI TEMAN HARIANMU",
    "Let me show you around. Find prayer times, face the Qibla, read and listen to the Quran, save meaningful verses, and build gentle daily habits.":
      "Mari berkeliling sebentar. Temukan waktu sholat, arah Kiblat, baca dan dengarkan Al-Qur'an, simpan ayat yang bermakna, dan bangun kebiasaan harian yang baik.",
    "Worship": "Ibadah",
    "Learn": "Belajar",
    "Reflect": "Renungkan",
    "Begin my journey": "Mulai perjalananku",
    "You can explore any feature from the navigation above.": "Kamu bisa menjelajahi semua fitur lewat navigasi di atas.",

    /* ---- Homepage ---- */
    "A MOMENT OF PEACE, EVERY DAY": "MOMEN KEDAMAIAN, SETIAP HARI",
    "Let your days": "Biarkan hari-harimu",
    "be guided by": "dituntun oleh",
    "light.": "cahaya.",
    "Make space to grow closer to Allah through meaningful worship, knowledge, and reflection, every day.":
      "Luangkan ruang untuk semakin dekat kepada Allah melalui ibadah, ilmu, dan perenungan yang bermakna, setiap hari.",
    "Get started": "Mulai",
    "Thoughtfully designed to accompany your spiritual journey.": "Dirancang dengan penuh perhatian untuk menemani perjalanan spiritualmu.",
    "FIND YOUR LIGHT": "TEMUKAN CAHAYAMU",
    "01 / YOUR JOURNEY": "01 / PERJALANANMU",
    "INTENTION · FAITH · PEACE": "NIAT · IMAN · KEDAMAIAN",
    "MADE FOR YOUR EVERYDAY": "DIBUAT UNTUK KESEHARIANMU",
    "A GENTLER DAILY RHYTHM": "RITME HARIAN YANG LEBIH TENANG",
    "Faith is not only a destination.": "Iman bukan hanya sebuah tujuan.",
    "It is how we live each day.": "Iman adalah cara kita menjalani setiap hari.",
    "NOOR FOR LIVING is being created as a thoughtful Islamic companion: a welcoming place for everyday worship, trusted learning, and small steps toward a more mindful life with Allah.":
      "NOOR FOR LIVING diciptakan sebagai teman Islami yang penuh perhatian: tempat yang ramah untuk ibadah harian, pembelajaran terpercaya, dan langkah-langkah kecil menuju hidup yang lebih sadar bersama Allah.",
    "YOUR DAILY COMPANION": "TEMAN HARIANMU",
    "Make room for": "Beri ruang untuk",
    "what matters.": "yang terpenting.",
    "Tools for a more mindful day, designed to meet you where you are.": "Alat untuk hari yang lebih penuh kesadaran, dirancang untuk menemanimu di mana pun kamu berada.",
    "01 / DAILY WORSHIP": "01 / IBADAH HARIAN",
    "View a location-based prayer schedule and make space for each prayer.": "Lihat jadwal sholat berdasarkan lokasi dan luangkan waktu untuk setiap sholat.",
    "02 / QIBLA": "02 / KIBLAT",
    "Find your direction": "Temukan arahmu",
    "Calculate the geographic direction of the Kaaba from your location.": "Hitung arah geografis Ka'bah dari lokasimu.",
    "03 / QURAN": "03 / AL-QUR'AN",
    "Read and reflect": "Baca dan renungkan",
    "Read Arabic, follow a pronunciation guide, listen to verse recitation, and save verses to revisit.":
      "Baca teks Arab, ikuti panduan pelafalan, dengarkan bacaan ayat, dan simpan ayat untuk dibaca kembali.",
    "04 / YOUR COLLECTION": "04 / KOLEKSIMU",
    "Return to saved verses": "Kembali ke ayat tersimpan",
    "Keep meaningful Quran verses together in your personal saved collection.": "Simpan ayat-ayat Al-Qur'an yang bermakna dalam koleksi pribadimu.",
    "05 / REMEMBRANCE": "05 / DZIKIR",
    "Daily duas & dhikr": "Doa & dzikir harian",
    "Explore supplications and remembrance with English meanings and source references.": "Jelajahi doa dan dzikir dengan arti dan referensi sumbernya.",
    "06 / ISLAMIC LEARNING": "06 / PEMBELAJARAN ISLAM",
    "Explore general questions with source links, careful explanations, and humility about scholarly differences.":
      "Jelajahi pertanyaan umum dengan tautan sumber, penjelasan cermat, dan kerendahan hati terhadap perbedaan para ulama.",
    "07 / HIJRI CALENDAR": "07 / KALENDER HIJRIAH",
    "Islamic occasions": "Hari besar Islam",
    "See upcoming Ramadan, Eid al-Fitr, Eid al-Adha, the Day of Arafah, and other important dates.":
      "Lihat Ramadan, Idul Fitri, Idul Adha, Hari Arafah, dan tanggal penting lainnya yang akan datang.",
    "Explore Quran reading, prayer tools, and a growing collection of carefully referenced duas and dhikr.":
      "Jelajahi bacaan Al-Qur'an, alat sholat, dan koleksi doa serta dzikir dengan referensi cermat yang terus bertambah.",
    "BEGIN WITH AN INTENTION": "MULAILAH DENGAN NIAT",
    "One day. One prayer.": "Satu hari. Satu sholat.",
    "One step closer.": "Satu langkah lebih dekat.",
    "May your everyday moments become opportunities for peace, gratitude, and growth.":
      "Semoga momen keseharianmu menjadi kesempatan untuk damai, syukur, dan bertumbuh.",
    "Open Quran reader": "Buka pembaca Al-Qur'an",
    "HELP US GROW": "BANTU KAMI BERKEMBANG",
    "How would you rate": "Bagaimana penilaianmu terhadap",
    "Your feedback helps us make your daily Islamic companion more useful and welcoming.":
      "Masukanmu membantu kami menjadikan teman Islami harianmu lebih bermanfaat dan ramah.",
    "Choose a rating from 1 to 5 stars": "Pilih nilai dari 1 hingga 5 bintang",
    "Anything you'd like us to improve?": "Ada yang ingin kami perbaiki?",
    "(optional)": "(opsional)",
    "Share a thought or suggestion…": "Bagikan pemikiran atau saran…",
    "Send feedback": "Kirim masukan",
    "Thank you. Your feedback has been received.": "Terima kasih. Masukanmu telah kami terima.",
    "Thoughtfully built. Grounded in trusted sources. Made for everyday life.":
      "Dibangun dengan penuh perhatian. Berlandaskan sumber terpercaya. Dibuat untuk kehidupan sehari-hari.",

    /* ---- Prayer names & schedule ---- */
    "Fajr": "Subuh",
    "Dhuhr": "Dzuhur",
    "Asr": "Ashar",
    "Isha": "Isya",
    "IMSAK": "IMSAK",
    "FAJR": "SUBUH",
    "SUNRISE": "TERBIT",
    "DHUHR": "DZUHUR",
    "ASR": "ASHAR",
    "MAGHRIB": "MAGHRIB",
    "ISHA": "ISYA",
    "Start of fasting": "Awal puasa",
    "Before sunrise": "Sebelum matahari terbit",
    "Sunrise": "Terbit",
    "Midday prayer": "Sholat tengah hari",
    "Afternoon prayer": "Sholat sore",
    "After sunset": "Setelah matahari terbenam",
    "Night prayer": "Sholat malam",
    "Dawn prayer": "Sholat subuh",
    "Sunset prayer": "Sholat maghrib",
    "Next prayer": "Sholat berikutnya",
    "Completed": "Selesai",
    "All five prayers for today have passed. Alhamdulillah.": "Kelima waktu sholat hari ini telah lewat. Alhamdulillah.",
    "TODAY'S SCHEDULE": "JADWAL HARI INI",

    /* ---- Prayer times page ---- */
    "prayer.": "sholat.",
    "Find today's prayer schedule for your location. Times are provided as guidance; your local mosque or religious authority may use a different calculation method.":
      "Temukan jadwal sholat hari ini untuk lokasimu. Waktu diberikan sebagai panduan; masjid atau otoritas agama setempat mungkin menggunakan metode perhitungan yang berbeda.",
    "YOUR LOCATION": "LOKASIMU",
    "Checking saved location…": "Memeriksa lokasi tersimpan…",
    "Your saved location is reused automatically. Set it once, then refresh only if you move.":
      "Lokasi tersimpanmu digunakan otomatis. Atur sekali, lalu segarkan hanya jika kamu berpindah.",
    "Set / refresh location": "Atur / segarkan lokasi",
    "Or type your city, e.g. Jakarta, Bandung, Surabaya…": "Atau ketik kotamu, mis. Jakarta, Bandung, Surabaya…",
    "Use this city": "Gunakan kota ini",
    "Prayer alerts": "Pengingat sholat",
    "Choose how you'd like NOOR to remind you at each prayer time. Sound and notifications can be controlled independently.":
      "Pilih bagaimana kamu ingin diingatkan NOOR di setiap waktu sholat. Suara dan notifikasi dapat diatur secara terpisah.",
    "Play Adhan sound": "Putar suara adzan",
    "Show prayer notifications": "Tampilkan notifikasi sholat",
    "▶ Test Adhan sound": "▶ Uji suara adzan",
    "Both alert options are off until you enable them.": "Kedua opsi pengingat nonaktif sampai kamu mengaktifkannya.",
    "Both alert options are off.": "Kedua opsi pengingat nonaktif.",
    "Your location is only requested when you tap the button.": "Lokasimu hanya diminta saat kamu mengetuk tombol.",
    "Prayer times are fetched from the AlAdhan timings service using your device's location. For religious observance, please confirm the schedule with your local mosque or official authority.":
      "Waktu sholat diambil dari layanan AlAdhan menggunakan lokasi perangkatmu. Untuk ibadah, mohon konfirmasi jadwal dengan masjid atau otoritas resmi setempat.",
    "FIND THE DIRECTION OF PRAYER": "TEMUKAN ARAH SHOLAT",
    "Turn your heart": "Arahkan hatimu",
    "toward the Kaaba.": "kepada Ka'bah.",
    "Use your location to calculate the Qibla bearing.": "Gunakan lokasimu untuk menghitung arah Kiblat.",
    "Open Qibla": "Buka Kiblat",
    "Calculating today's schedule…": "Menghitung jadwal hari ini…",
    "Location found": "Lokasi ditemukan",
    "Schedule loaded": "Jadwal dimuat",
    "The prayer-time service is temporarily unavailable. Please try again later.": "Layanan waktu sholat sedang tidak tersedia. Silakan coba lagi nanti.",
    "Prayer times could not be calculated for this location.": "Waktu sholat tidak dapat dihitung untuk lokasi ini.",
    "This browser does not support location services. You can search for your city instead.":
      "Browser ini tidak mendukung layanan lokasi. Kamu bisa mencari kotamu di bawah.",
    "Location permission was denied. Enable it in your browser settings, or search for your city below.":
      "Izin lokasi ditolak. Aktifkan di pengaturan browser, atau cari kotamu di bawah.",
    "Your location could not be determined. Check your device settings, or search for your city below.":
      "Lokasimu tidak dapat ditentukan. Periksa pengaturan perangkat, atau cari kotamu di bawah.",
    "Location request timed out. Please try again, or search for your city below.":
      "Permintaan lokasi kedaluwarsa. Silakan coba lagi, atau cari kotamu di bawah.",
    "Unable to access your location. You can search for your city below.": "Tidak dapat mengakses lokasimu. Kamu bisa mencari kotamu di bawah.",
    "The place search service is temporarily unavailable. Please try again.": "Layanan pencarian tempat sedang tidak tersedia. Silakan coba lagi.",
    "That place was not found. Try a nearby city name, e.g. \"Jakarta\" or \"Surabaya\".":
      "Tempat itu tidak ditemukan. Coba nama kota terdekat, mis. \"Jakarta\" atau \"Surabaya\".",
    "Type a city or town name first, e.g. \"Bandung\".": "Ketik nama kota dulu, mis. \"Bandung\".",
    "Could not use that place. Please try again.": "Tidak dapat menggunakan tempat itu. Silakan coba lagi.",
    "Could not refresh prayer alerts.": "Tidak dapat menyegarkan pengingat sholat.",
    "Something went wrong. Please try again.": "Terjadi kesalahan. Silakan coba lagi.",
    "Adhan audio is playing. Use your device's media controls to pause it.":
      "Audio adzan sedang diputar. Gunakan kontrol media perangkatmu untuk menjedanya.",
    "Adhan audio could not start. Check your connection and tap Test Adhan sound once to allow playback.":
      "Audio adzan tidak dapat dimulai. Periksa koneksimu dan ketuk Uji suara adzan sekali untuk mengizinkan pemutaran.",
    "Adhan sound enabled. Use Test Adhan sound once to confirm playback on this device.":
      "Suara adzan aktif. Gunakan Uji suara adzan sekali untuk memastikan pemutaran di perangkat ini.",
    "Sound is off; notifications remain enabled.": "Suara nonaktif; notifikasi tetap aktif.",
    "This browser does not support notifications. Adhan sound can still work while NOOR is open.":
      "Browser ini tidak mendukung notifikasi. Suara adzan tetap bisa berfungsi saat NOOR terbuka.",
    "Notifications are blocked in browser settings. Enable them there to continue.":
      "Notifikasi diblokir di pengaturan browser. Aktifkan di sana untuk melanjutkan.",
    "Notification permission was not granted. You can enable sound separately.":
      "Izin notifikasi tidak diberikan. Kamu bisa mengaktifkan suara secara terpisah.",
    "Adhan sound and notifications are both enabled.": "Suara adzan dan notifikasi keduanya aktif.",
    "Prayer notifications are enabled; sound remains off.": "Notifikasi sholat aktif; suara tetap nonaktif.",
    "Notifications are off; Adhan sound remains enabled.": "Notifikasi nonaktif; suara adzan tetap aktif.",
    "Adhan sound is enabled.": "Suara adzan aktif.",
    "Prayer notifications are enabled.": "Notifikasi sholat aktif.",

    /* ---- Qibla page ---- */
    "Find your": "Temukan",
    "direction.": "arahmu.",
    "The Qibla is the direction of the Kaaba in Makkah. Your saved location is reused automatically. Set it once on Prayer Times, or refresh it if you move.":
      "Kiblat adalah arah Ka'bah di Makkah. Lokasi tersimpanmu digunakan otomatis. Atur sekali di Waktu Sholat, atau segarkan jika kamu berpindah.",
    "CALCULATED BEARING FROM TRUE NORTH": "SUDUT TERHITUNG DARI UTARA SEJATI",
    "Awaiting location": "Menunggu lokasi",
    "Your distance to the Kaaba will appear here.": "Jarakmu ke Ka'bah akan muncul di sini.",
    "Refresh my location": "Segarkan lokasiku",
    "Location is requested only when you tap the button. If you already saved your location on this device, the Qibla direction appears automatically; set it once on Prayer Times or refresh it if you move.":
      "Lokasi hanya diminta saat kamu mengetuk tombol. Jika kamu sudah menyimpan lokasi di perangkat ini, arah Kiblat muncul otomatis; atur sekali di Waktu Sholat atau segarkan jika kamu berpindah.",
    "This page calculates a geographic bearing, not a certified magnetic-compass reading. Phone sensors can be affected by calibration, nearby metal, and interference. Follow your local mosque's guidance when precision is important.":
      "Halaman ini menghitung sudut geografis, bukan pembacaan kompas magnetik bersertifikat. Sensor ponsel dapat dipengaruhi kalibrasi, logam di dekatnya, dan interferensi. Ikuti panduan masjid setempat bila ketepatan penting.",
    "YOUR DAILY SCHEDULE": "JADWAL HARIANMU",
    "Make time for": "Luangkan waktu untuk",
    "each prayer.": "setiap sholat.",
    "View today's prayer times for your location.": "Lihat waktu sholat hari ini untuk lokasimu.",
    "Calculating Qibla direction…": "Menghitung arah Kiblat…",
    "Direction calculated from your coordinates. This is a geographic bearing, not a live magnetic compass.":
      "Arah dihitung dari koordinatmu. Ini sudut geografis, bukan kompas magnetik langsung.",

    /* ---- Quran reader ---- */
    "READ · REFLECT · RETURN": "BACA · RENUNGI · KEMBALI",
    "Words to": "Kalam untuk",
    "guide the heart.": "menuntun hati.",
    "Read every verse in Arabic, follow a pronunciation guide, explore the English and Indonesian meanings, and listen to a male recitation — or open the mushaf and turn its pages.":
      "Baca setiap ayat dalam bahasa Arab, ikuti panduan pelafalan, pelajari makna Inggris dan Indonesia, dan dengarkan bacaannya — atau buka mushaf dan balik halamannya.",
    "Arabic text · Pronunciation guide · English & Indonesian meaning · Verse-by-verse recitation":
      "Teks Arab · Panduan pelafalan · Makna Inggris & Indonesia · Bacaan ayat demi ayat",
    "CHOOSE A SURAH": "PILIH SURAH",
    "Open the mushaf": "Buka Mushaf",
    "Loading Quran index…": "Memuat indeks Al-Qur'an…",
    "The reader will appear here once the Quran text is loaded.": "Pembaca akan muncul di sini setelah teks Al-Qur'an dimuat.",
    "Quran text, Indonesian and English translations provided by AlQuran Cloud.":
      "Teks Al-Qur'an serta terjemahan Indonesia dan Inggris disediakan oleh AlQuran Cloud.",
    "▶ Play whole surah": "▶ Putar seluruh surah",
    "Play whole surah": "Putar seluruh surah",
    "⏸ Pause": "⏸ Jeda",
    "Pause": "Jeda",
    "⏹ Stop": "⏹ Berhenti",
    "Stop": "Berhenti",
    "▶ Resume": "▶ Lanjutkan",
    "Resume": "Lanjutkan",
    "↻ Repeat verse: off": "↻ Ulangi ayat: nonaktif",
    "↻ Repeat verse: on": "↻ Ulangi ayat: aktif",
    "Repeat verse": "Ulangi ayat",
    "▶ Listen": "▶ Dengarkan",
    "Listen": "Dengarkan",
    "⏸ Playing": "⏸ Memutar",
    "Translation": "Terjemahan",
    "Transliteration": "Transliterasi",
    "☆ Save verse": "☆ Simpan ayat",
    "★ Saved": "★ Tersimpan",
    "Verse saved to your collection.": "Ayat disimpan ke koleksimu.",
    "Verse removed from your saved collection.": "Ayat dihapus dari koleksi tersimpanmu.",
    "Could not update your saved verses.": "Tidak dapat memperbarui ayat tersimpanmu.",
    "Reading progress could not be saved.": "Progres membaca tidak dapat disimpan.",
    "Loading verses…": "Memuat ayat…",
    "Loading recitation audio for this surah…": "Memuat audio bacaan untuk surah ini…",
    "Recitation audio is not available right now.": "Audio bacaan tidak tersedia saat ini.",
    "Audio could not be played. Please try again.": "Audio tidak dapat diputar. Silakan coba lagi.",
    "Recitation finished. Taqabbalallahu minna wa minkum.": "Bacaan selesai. Taqabbalallahu minna wa minkum.",
    "Playing male Quran recitation": "Memutar bacaan Al-Qur'an",
    "The Quran text service is temporarily unavailable. Please try again.": "Layanan teks Al-Qur'an sedang tidak tersedia. Silakan coba lagi.",
    "The Quran text could not be loaded.": "Teks Al-Qur'an tidak dapat dimuat.",
    "This surah is not available right now.": "Surah ini tidak tersedia saat ini.",
    "Could not load the Quran text.": "Tidak dapat memuat teks Al-Qur'an.",
    "Could not load this surah.": "Tidak dapat memuat surah ini.",
    "Please reconnect and reload the page.": "Silakan sambungkan kembali lalu muat ulang halaman.",
    "Could not load the Quran index. Check your connection and try again.":
      "Tidak dapat memuat indeks Al-Qur'an. Periksa koneksimu dan coba lagi.",

    /* ---- Mushaf ---- */
    "THE MUSHAF": "MUSHAF",
    "Turn the pages of": "Balik halaman",
    "the Book.": "Kitabullah.",
    "The 604-page Madinah mushaf, page by page. Swipe or tap the edges to turn, listen to the page, and let your eyes rest on the words of Allah.":
      "Mushaf Madinah 604 halaman, halaman demi halaman. Geser atau ketuk tepi untuk membalik, dengarkan halamannya, dan istirahatkan matamu pada kalam Allah.",
    "Loading surahs…": "Memuat surah…",
    "Go": "Buka",
    "▶ Play this page": "▶ Putar halaman ini",
    "Loading the mushaf…": "Memuat mushaf…",
    "Opening the mushaf…": "Membuka mushaf…",
    "‹ Previous page": "‹ Halaman sebelumnya",
    "Next page ›": "Halaman berikutnya ›",
    "Madinah layout": "tata letak Madinah",
    "swipe or tap the page edges to turn.": "geser atau ketuk tepi halaman untuk membalik.",
    "Quran text in the Madinah mushaf page layout · Recitation: Mishary Rashid Alafasy":
      "Teks Al-Qur'an dalam tata letak mushaf Madinah · Bacaan: Mishary Rashid Alafasy",
    "The mushaf text service is temporarily unavailable. Please try again.": "Layanan teks mushaf sedang tidak tersedia. Silakan coba lagi.",
    "This page could not be loaded.": "Halaman ini tidak dapat dimuat.",
    "Could not load this page. Check your connection and try again.": "Tidak dapat memuat halaman ini. Periksa koneksimu dan coba lagi.",
    "Audio could not be played. Check your connection and try again.": "Audio tidak dapat diputar. Periksa koneksimu dan coba lagi.",

    /* ---- Bookmarks ---- */
    "Verses to": "Ayat-ayat untuk",
    "return to.": "dibuka kembali.",
    "Your saved verses stay connected to your account, ready whenever you want to revisit them.":
      "Ayat tersimpanmu tetap terhubung ke akunmu, siap kapan pun kamu ingin membukanya kembali.",
    "Remove ×": "Hapus ×",
    "Read this surah": "Baca surah ini",
    "Your collection begins with one verse.": "Koleksimu dimulai dengan satu ayat.",
    "When a verse speaks to you, save it here so you can return to it later.":
      "Saat sebuah ayat menyentuhmu, simpan di sini agar kamu bisa kembali lagi nanti.",
    "YOUR PERSONAL COLLECTION": "KOLEKSI PRIBADIMU",
    "Recently saved verses": "Ayat yang baru disimpan",
    "Saved for reflection": "Disimpan untuk direnungkan",

    /* ---- Duas & dhikr ---- */
    "REMEMBER · REFLECT · RETURN": "INGAT · RENUNGI · KEMBALI",
    "Words for": "Kata-kata untuk",
    "the heart.": "hati.",
    "A carefully referenced collection of authentic supplications and well-known dhikr, with English and Indonesian meanings. Read the meaning, reflect on the source, and take your time.":
      "Koleksi doa autentik dan dzikir masyhur dengan referensi cermat, beserta makna Inggris dan Indonesia. Baca maknanya, renungkan sumbernya, dan luangkan waktumu.",
    "Search the collection": "Cari dalam koleksi",
    "Search words, meanings, or sources…": "Cari kata, makna, atau sumber…",
    "All": "Semua",
    "Guidance": "Petunjuk",
    "Learning": "Ilmu",
    "Steadfastness": "Keteguhan",
    "Family": "Keluarga",
    "Trust": "Tawakal",
    "Before Sleeping": "Sebelum Tidur",
    "After Waking": "Setelah Bangun",
    "Morning & Evening": "Pagi & Petang",
    "Eating": "Makan",
    "Leaving Home": "Keluar Rumah",
    "Travelling": "Perjalanan",
    "Protection": "Perlindungan",
    "Remembrance": "Dzikir",
    "Forgiveness": "Ampunan",
    "REFERENCE": "REFERENSI",
    "Copy Arabic": "Salin teks Arab",
    "Copy meaning": "Salin makna",
    "Count +": "Hitung +",
    "Reset": "Atur ulang",
    "No items match your search. Try another word or category.": "Tidak ada yang cocok dengan pencarianmu. Coba kata atau kategori lain.",
    "Copied to clipboard.": "Disalin ke papan klip.",
    "Copy is not available in this browser. You can select the text manually.":
      "Salin tidak tersedia di browser ini. Kamu bisa memilih teksnya secara manual.",
    "This is a starter collection, not a complete guide to supplication. Quran references are provided for Quranic duas; hadith references are included for dhikr. For detailed rulings, wording variants, or religious questions, consult a qualified scholar and a trusted edition of the source.":
      "Ini koleksi awal, bukan panduan doa yang lengkap. Referensi Al-Qur'an disediakan untuk doa dari Al-Qur'an; referensi hadits disertakan untuk dzikir. Untuk hukum rinci, variasi lafaz, atau pertanyaan agama, konsultasikan dengan ulama yang berkompeten dan edisi sumber yang tepercaya.",

    /* ---- Islamic calendar ---- */
    "MARK THE MOMENTS THAT MATTER": "TANDAI MOMEN YANG BERARTI",
    "The Islamic": "Kalender",
    "calendar.": "Hijriah.",
    "Keep track of meaningful days across the Hijri year, from Ramadan and the two Eids to the Day of Arafah and other important occasions.":
      "Pantau hari-hari bermakna sepanjang tahun Hijriah, dari Ramadan dan dua hari raya hingga Hari Arafah dan peringatan penting lainnya.",
    "UPCOMING OCCASIONS": "PERINGATAN MENDATANG",
    "Plan with": "Rencanakan dengan",
    "intention.": "niat.",
    "Using approximate dates. Local moon sighting and official announcements may differ.":
      "Menggunakan tanggal perkiraan. Rukyat hilal dan pengumuman resmi setempat mungkin berbeda.",
    "Refresh dates": "Segarkan tanggal",
    "Preparing upcoming Islamic dates…": "Menyiapkan tanggal Islam mendatang…",
    "Loading Islamic occasions": "Memuat hari besar Islam",
    "Upcoming dates will appear here.": "Tanggal mendatang akan muncul di sini.",
    "Hijri dates can differ by a day or more depending on moon sighting, local religious authorities, and country-specific announcements. Please confirm public holidays with your local mosque or official authority.":
      "Tanggal Hijriah dapat berbeda satu hari atau lebih tergantung rukyat hilal, otoritas agama setempat, dan pengumuman masing-masing negara. Mohon konfirmasi hari libur dengan masjid atau otoritas resmi setempat.",
    "Checking the Hijri calendar for the next year…": "Memeriksa kalender Hijriah untuk tahun ke depan…",
    "Showing estimates using Jakarta as a starting point. Set your location in Prayer Times for a more local calendar.":
      "Menampilkan perkiraan dengan Jakarta sebagai titik awal. Atur lokasimu di Waktu Sholat untuk kalender yang lebih lokal.",
    "Using your saved device location. Dates are still estimates until confirmed locally.":
      "Menggunakan lokasi tersimpan perangkatmu. Tanggal tetap perkiraan sampai dikonfirmasi secara lokal.",
    "Calendar service is temporarily unavailable.": "Layanan kalender sedang tidak tersedia.",
    "The Hijri calendar could not be loaded.": "Kalender Hijriah tidak dapat dimuat.",
    "No upcoming dates were returned. Please refresh in a moment.": "Belum ada tanggal mendatang yang diterima. Silakan segarkan sebentar lagi.",
    "Could not load Islamic dates. Please try again.": "Tidak dapat memuat tanggal Islam. Silakan coba lagi.",
    "Islamic New Year": "Tahun Baru Islam",
    "Day of Ashura": "Hari Asyura",
    "Mawlid an-Nabi (observance varies)": "Maulid Nabi (peringatan bervariasi)",
    "Isra and Mi'raj (commonly observed)": "Isra dan Mi'raj (umum diperingati)",
    "Mid-Sha'ban (observance varies)": "Nisfu Sya'ban (peringatan bervariasi)",
    "First day of Ramadan": "Hari pertama Ramadan",
    "Nuzul al-Quran (commonly observed)": "Nuzulul Qur'an (umum diperingati)",
    "Eid al-Fitr": "Idul Fitri",
    "Day of Arafah": "Hari Arafah",
    "Eid al-Adha": "Idul Adha",
    "Days of Tashreeq begin": "Hari-hari Tasyrik dimulai",
    "The first day of Muharram marks the beginning of the Hijri year.": "Hari pertama Muharram menandai awal tahun Hijriah.",
    "The tenth of Muharram; observances and practices vary among Muslim communities.":
      "Tanggal sepuluh Muharram; peringatan dan praktiknya bervariasi antar komunitas Muslim.",
    "Some communities commemorate the birth of Prophet Muhammad ﷺ on this date.":
      "Sebagian komunitas memperingati kelahiran Nabi Muhammad ﷺ pada tanggal ini.",
    "A night remembered for the Prophet's journey; observance varies by community.":
      "Malam yang diingat sebagai perjalanan Nabi; peringatannya bervariasi antar komunitas.",
    "A date observed by some communities before Ramadan.": "Tanggal yang diperingati sebagian komunitas sebelum Ramadan.",
    "The beginning of the month of fasting, subject to local moon sighting.": "Awal bulan puasa, mengikuti rukyat hilal setempat.",
    "A date commonly used in some countries to remember the revelation of the Quran.":
      "Tanggal yang umum digunakan di sebagian negara untuk mengingat turunnya Al-Qur'an.",
    "The celebration marking the end of Ramadan. Confirm the date with local authorities.":
      "Perayaan yang menandai berakhirnya Ramadan. Konfirmasi tanggalnya dengan otoritas setempat.",
    "A significant day during Hajj; the date follows the local Hijri calendar.":
      "Hari penting saat haji; tanggalnya mengikuti kalender Hijriah setempat.",
    "The Festival of Sacrifice during the days of Hajj. Confirm local announcements.":
      "Hari Raya Kurban di hari-hari haji. Konfirmasi pengumuman setempat.",
    "The 11th–13th of Dhul Hijjah are known as the Days of Tashreeq.":
      "Tanggal 11–13 Dzulhijah dikenal sebagai Hari-hari Tasyrik.",

    /* ---- Tracker ---- */
    "SMALL STEPS, SINCERE INTENTIONS": "LANGKAH KECIL, NIAT YANG TULUS",
    "Your spiritual": "Perjalanan",
    "journey.": "spiritualmu.",
    "Keep a gentle record of your daily worship. This is a private tool for reflection, not a measure of your worth or faith.":
      "Simpan catatan lembut ibadah harianmu. Ini alat pribadi untuk refleksi, bukan ukuran nilai atau keimananmu.",
    "TODAY'S PROGRESS": "PROGRES HARI INI",
    "completed": "selesai",
    "Begin where you are.": "Mulailah dari posisimu.",
    "Every sincere step matters.": "Setiap langkah tulus berarti.",
    "THIS WEEK": "PEKAN INI",
    "of possible check-ins": "dari kemungkinan catatan",
    "ACTIVE DAYS": "HARI AKTIF",
    "days with an activity": "hari dengan aktivitas",
    "CURRENT STREAK": "RENTETAN SAAT INI",
    "day": "hari",
    "days": "hari",
    "with an activity": "dengan aktivitas",
    "CHECK-INS THIS WEEK": "CATATAN PEKAN INI",
    "activities completed": "aktivitas selesai",
    "Your daily intentions": "Niat harianmu",
    "PRIVATE TO YOU": "PRIBADI UNTUKMU",
    "Quran reading": "Baca Al-Qur'an",
    "Read or reflect": "Baca atau renungkan",
    "Dhikr": "Dzikir",
    "Remember Allah": "Ingat Allah",
    "Gratitude": "Syukur",
    "Notice a blessing": "Sadari satu nikmat",
    "A thought to carry with you": "Pemikiran untuk dibawa",
    "OPTIONAL": "OPSIONAL",
    "What are you grateful for today?": "Apa yang kamu syukuri hari ini?",
    "Up to 500 characters. Visible only to your account.": "Maksimal 500 karakter. Hanya terlihat oleh akunmu.",
    "Save your checklist to keep today's progress.": "Simpan daftar ini untuk menjaga progres hari ini.",
    "Save today's progress": "Simpan progres hari ini",
    "THE LAST SEVEN DAYS": "TUJUH HARI TERAKHIR",
    "Consistency over perfection.": "Konsistensi di atas kesempurnaan.",
    "8 ACTIVITIES / DAY": "8 AKTIVITAS / HARI",
    "Days without a saved entry appear as zero. If you miss a day, simply begin again.":
      "Hari tanpa catatan tampil sebagai nol. Jika ada yang terlewat, mulailah lagi begitu saja.",
    "Check today's schedule": "Cek jadwal hari ini",
    "Read the Quran": "Baca Al-Qur'an",
    "Continue reading and save verses": "Lanjutkan membaca dan simpan ayat",
    "Make room for remembrance": "Beri ruang untuk dzikir",

    /* ---- Dashboard ---- */
    "A gentle space to return to what matters. Every sincere step counts; begin again whenever you need.":
      "Ruang tenang untuk kembali pada hal yang terpenting. Setiap langkah tulus berarti; mulailah lagi kapan pun kamu perlu.",
    "TODAY'S JOURNEY": "PERJALANAN HARI INI",
    "Start with one small intention today.": "Mulailah dengan satu niat kecil hari ini.",
    "All eight intentions checked in. May your day be blessed.": "Kedelapan niat telah dicatat. Semoga harimu diberkahi.",
    "You have made a start. Keep moving gently.": "Kamu sudah memulai. Teruslah melangkah dengan lembut.",
    "Continue today's check-in": "Lanjutkan catatan hari ini",
    "Set today's intentions": "Tetapkan niat hari ini",
    "QURAN SAVED": "AL-QUR'AN TERSIMPAN",
    "verses in your collection": "ayat dalam koleksimu",
    "A LITTLE EVERY DAY": "SEDIKIT SETIAP HARI",
    "Your last seven days": "Tujuh hari terakhirmu",
    "View full journey": "Lihat perjalanan lengkap",
    "Your progress is personal. A quiet day is not a failure; return when you're ready.":
      "Progresmu bersifat pribadi. Hari yang sepi bukanlah kegagalan; kembalilah saat kamu siap.",
    "A MOMENT TO REFLECT": "MOMEN UNTUK MERENUNG",
    "Begin with what matters today.": "Mulailah dengan apa yang terpenting hari ini.",
    "Make room for prayer, remembrance, learning, and gratitude—one step at a time.":
      "Beri ruang untuk sholat, dzikir, belajar, dan syukur—satu langkah demi satu langkah.",
    "Your daily companion": "Teman harianmu",
    "View today's prayer schedule using your current location.": "Lihat jadwal sholat hari ini menggunakan lokasimu saat ini.",
    "View prayer times": "Lihat waktu sholat",
    "Qibla direction": "Arah Kiblat",
    "Find the direction toward the Kaaba when you choose to share your location.":
      "Temukan arah menuju Ka'bah saat kamu memilih membagikan lokasimu.",
    "Find Qibla": "Temukan Kiblat",
    "Continue the Quran": "Lanjutkan Al-Qur'an",
    "Read Arabic, pronunciation guidance, English meaning, and listen to male verse recitation.":
      "Baca teks Arab, panduan pelafalan, dan maknanya, lalu dengarkan bacaan ayatnya.",
    "Continue reading": "Lanjutkan membaca",
    "Revisit verses you have chosen to keep close.": "Buka kembali ayat-ayat yang kamu pilih untuk disimpan.",
    "Supplications and remembrance with English meanings and references.": "Doa dan dzikir dengan makna dan referensinya.",
    "Open collection": "Buka koleksi",
    "Spiritual journey": "Perjalanan spiritual",
    "Track daily intentions, reflection, and weekly consistency.": "Catat niat harian, refleksi, dan konsistensi pekanan.",
    "Track my day": "Catat hariku",
    "See upcoming Ramadan, Eid al-Fitr, Eid al-Adha, and other Hijri occasions.":
      "Lihat Ramadan, Idul Fitri, Idul Adha, dan hari besar Hijriah lainnya yang akan datang.",
    "View upcoming dates": "Lihat tanggal mendatang",
    "Explore general Islamic learning with careful explanations and source links. AI answers require setup.":
      "Jelajahi pembelajaran Islam umum dengan penjelasan cermat dan tautan sumber. Jawaban AI memerlukan pengaturan.",
    "Open Ask Noor": "Buka Tanya Noor",
    "View all": "Lihat semua",
    "Your worship notes and saved verses are private to your account. Location is requested only when you choose to use a worship tool. Quran text and translation are supplied by AlQuran Cloud. For personal religious rulings, consult a qualified scholar.":
      "Catatan ibadah dan ayat tersimpanmu bersifat pribadi di akunmu. Lokasi hanya diminta saat kamu memilih menggunakan alat ibadah. Teks dan terjemahan Al-Qur'an disediakan oleh AlQuran Cloud. Untuk hukum agama pribadi, konsultasikan dengan ulama yang berkompeten.",

    /* ---- Login & signup ---- */
    "WELCOME BACK": "SELAMAT DATANG KEMBALI",
    "Return to your": "Kembali ke",
    "quiet center.": "pusat ketenanganmu.",
    "Pick up where you left off and make space for the things that matter most.":
      "Lanjutkan dari terakhir kali dan beri ruang untuk hal-hal yang paling penting.",
    "YOUR PERSONAL SPACE": "RUANG PRIBADIMU",
    "Welcome back": "Selamat datang kembali",
    "Log in to continue your journey.": "Masuk untuk melanjutkan perjalananmu.",
    "Username": "Nama pengguna",
    "Password": "Kata sandi",
    "New to Noor?": "Baru di Noor?",
    "Create an account": "Buat akun",
    "Keep your password private and secure.": "Jaga kerahasiaan dan keamanan kata sandimu.",
    "YOUR JOURNEY BEGINS HERE": "PERJALANANMU DIMULAI DI SINI",
    "A little more": "Sedikit lebih banyak",
    "light, every day.": "cahaya, setiap hari.",
    "Create your personal space for worship, learning, reflection, and steady spiritual growth.":
      "Ciptakan ruang pribadimu untuk ibadah, belajar, refleksi, dan pertumbuhan spiritual yang konsisten.",
    "WELCOME TO NOOR": "SELAMAT DATANG DI NOOR",
    "Create your account": "Buat akunmu",
    "Start your daily journey with NOOR FOR LIVING.": "Mulai perjalanan harianmu bersama NOOR FOR LIVING.",
    "Create my account": "Buat akun saya",
    "Already have an account?": "Sudah punya akun?",
    "Your account is personal. We will never ask you to share your password.":
      "Akunmu bersifat pribadi. Kami tidak akan pernah memintamu membagikan kata sandi.",

    /* ---- Ask Noor ---- */
    "Ask": "Tanya",
    "LEARN · REFLECT · VERIFY": "BELAJAR · RENUNGI · VERIFIKASI",
    "Explore general Islamic questions with careful explanations and links to sources. Use this as a learning companion, not as a replacement for qualified scholarly guidance.":
      "Jelajahi pertanyaan Islam umum dengan penjelasan cermat dan tautan sumber. Gunakan ini sebagai teman belajar, bukan pengganti bimbingan ulama yang berkompeten.",
    "YOUR LEARNING SPACE": "RUANG BELAJARMU",
    "What would you like to understand?": "Apa yang ingin kamu pahami?",
    "Keep your question general. You do not need to share private or identifying details.":
      "Buat pertanyaanmu tetap umum. Kamu tidak perlu membagikan detail pribadi atau identitas.",
    "When enabled, questions are processed by an external AI service. Do not include names, contact details, or sensitive personal information. NOOR FOR LIVING does not save questions or answers to your app account.":
      "Saat aktif, pertanyaan diproses oleh layanan AI eksternal. Jangan sertakan nama, detail kontak, atau informasi pribadi sensitif. NOOR FOR LIVING tidak menyimpan pertanyaan atau jawaban ke akunmu.",
    "Understanding dhikr": "Memahami dzikir",
    "Gratitude in the Quran": "Syukur dalam Al-Qur'an",
    "Building a Quran habit": "Membangun kebiasaan membaca Al-Qur'an",
    "Your question": "Pertanyaanmu",
    "For example: What does the Quran say about patience?": "Misalnya: Apa kata Al-Qur'an tentang kesabaran?",
    "AI answers are not enabled yet. The reading tools and learning page are available; Ask Noor will respond once the service is configured by the administrator.":
      "Jawaban AI belum diaktifkan. Alat baca dan halaman belajar tersedia; Tanya Noor akan merespons setelah layanan dikonfigurasi oleh administrator.",
    "A CAREFUL STARTING POINT": "TITIK AWAL YANG CERMAT",
    "Your answer": "Jawabanmu",
    "Sources to explore": "Sumber untuk dipelajari",
    "No source links were returned for this response. Treat it as an unverified starting point and check a trusted source before relying on it.":
      "Tidak ada tautan sumber yang diterima untuk jawaban ini. Anggap sebagai titik awal yang belum terverifikasi dan periksa sumber tepercaya sebelum menggunakannya.",
    "Knowledge with humility": "Ilmu dengan kerendahan hati",
    "AI can make mistakes or miss differences between scholarly views. Ask Noor does not issue fatwas and is not a substitute for a qualified scholar. For personal rulings—especially marriage, divorce, inheritance, finance, health, or legal matters—please consult an appropriate qualified professional.":
      "AI dapat membuat kesalahan atau melewatkan perbedaan pandangan ulama. Tanya Noor tidak mengeluarkan fatwa dan bukan pengganti ulama yang berkompeten. Untuk hukum pribadi—terutama pernikahan, perceraian, warisan, keuangan, kesehatan, atau masalah hukum—silakan konsultasikan dengan profesional yang berkompeten.",
    "Please enter a question first.": "Silakan masukkan pertanyaan dulu.",
    "Please keep your question under 1,200 characters.": "Jaga pertanyaanmu di bawah 1.200 karakter.",
    "You've asked several questions recently. Please wait a minute before asking again.":
      "Kamu baru saja mengajukan beberapa pertanyaan. Silakan tunggu semenit sebelum bertanya lagi.",

    /* ---- Offline ---- */
    "Take a quiet moment.": "Beristirahatlah sejenak.",
    "You appear to be offline. Please reconnect to continue exploring your daily companion.":
      "Sepertinya kamu sedang luring. Silakan sambungkan kembali untuk melanjutkan.",
    "Try again": "Coba lagi",

    /* ---- Common ---- */
    "Search": "Cari",
    "Save": "Simpan",
    "Cancel": "Batal",
    "Loading…": "Memuat…",
    "Mon": "Sen", "Tue": "Sel", "Wed": "Rab", "Thu": "Kam",
    "Fri": "Jum", "Sat": "Sab", "Sun": "Min"
  };

  /* ---- Pattern translations for dynamic strings (numbers, dates, names) ---- */
  const dateFn = withYear => (m, wd, mo, d, y) => {
    const W = DAY_NAMES[wd], M = MONTH_NAMES[mo];
    if (!W || !M) return null;
    return W + ", " + d + " " + M + (withYear ? " " + y : "");
  };
  const PATTERNS = [
    [/^(\d+) of 8 intentions$/, (m, n) => n + " dari 8 niat"],
    [/^(\d+) OF 8$/, (m, n) => n + " DARI 8"],
    [/^(\d+) readings?$/, (m, n) => n + " bacaan"],
    [/^My saved verses \((\d+)\)$/, (m, n) => "Ayat tersimpanku (" + n + ")"],
    [/^Resume (.+), verse (\d+)\.$/, (m, s, v) => "Lanjutkan " + s + ", ayat " + v + "."],
    [/^in (\d{2}:\d{2}:\d{2})$/, (m, t) => "dalam " + t],
    [/^Loading page (\d+)…$/, (m, n) => "Memuat halaman " + n + "…"],
    [/^Loading surah (\d+)…$/, (m, n) => "Memuat surah " + n + "…"],
    [/^Mushaf page (\d+)$/, (m, n) => "Halaman mushaf " + n],
    [/^Page (.+) of (.+)$/, (m, a, b) => "Halaman " + a + " dari " + b],
    [/^(\d+) VERSES$/, (m, n) => n + " AYAT"],
    [/^([A-Z]{1,3}) from true north$/, (m, c) => c + " dari utara sejati"],
    [/^[\d.,]+ km to the Kaaba$/, m => m.replace(/ km to the Kaaba$/, " km menuju Ka'bah")],
    [/^Approx\. (\d+) m accuracy$/, (m, n) => "Akurasi ± " + n + " m"],
    [/^(\w+) Adhan is playing\.$/, (m, n) => "Adzan " + (PRAYER_ID[n] || n) + " sedang berkumandang."],
    [/^It is time for (\w+) prayer\.$/, (m, n) => "Sudah masuk waktu sholat " + (PRAYER_ID[n] || n) + "."],
    [/^Searching for "(.+)"…$/, (m, q) => 'Mencari "' + q + '"…'],
    [/^Showing (\d+) upcoming occasions across the next 12 months\. Dates are estimates and may shift with local moon sighting\.$/,
      (m, n) => "Menampilkan " + n + " peringatan mendatang dalam 12 bulan ke depan. Tanggal bersifat perkiraan dan dapat bergeser mengikuti rukyat hilal setempat."],
    [/^Showing (.+) with Arabic, pronunciation guide, English and Indonesian meanings, and male recitation\.$/,
      (m, s) => "Menampilkan " + s + " dengan teks Arab, panduan pelafalan, makna Inggris dan Indonesia, serta bacaan."],
    [/\. Please confirm locally before relying on it\.$/,
      m => m.replace(/\. Please confirm locally before relying on it\.$/, ". Mohon konfirmasi secara lokal sebelum menggunakannya.")],
    [/^([A-Z][a-z]{2,8}), ([A-Z][a-z]{2,8}) (\d{1,2}), (\d{4})$/, dateFn(true)],
    [/^([A-Z][a-z]{2,8}), ([A-Z][a-z]{2,8}) (\d{1,2})$/, dateFn(false)],
    [/^(.+) AH$/, (m, rest) => rest + " H"]
  ];
  const applyPatterns = core => {
    for (const [re, fn] of PATTERNS) {
      const match = core.match(re);
      if (match) {
        const out = fn(...match);
        if (out) return out;
      }
    }
    return null;
  };

  const stored = localStorage.getItem(STORAGE_KEY);
  const browserLang = (navigator.language || "").toLowerCase();
  const lang = (stored === "id" || stored === "en") ? stored : (browserLang.startsWith("id") ? "id" : "en");
  document.documentElement.lang = lang;

  const translateString = value => {
    if (!value) return value;
    const lead = (value.match(/^\s*/) || [""])[0];
    const trail = (value.match(/\s*$/) || [""])[0];
    let core = value.slice(lead.length, value.length - trail.length);
    if (!core) return value;
    /* separable affixes: "← Back" style prefixes and "↗ / ↻" trailing arrows */
    let prefix = "", suffix = "";
    if (core.startsWith("← ")) { prefix = "← "; core = core.slice(2); }
    const arrow = core.match(/\s(↗|↻)$/);
    if (arrow) { suffix = " " + arrow[1]; core = core.slice(0, core.length - arrow[0].length); }
    let out = DICT[core];
    if (!out && core.startsWith("Hello, ")) out = "Halo, " + core.slice(7);
    if (!out) out = applyPatterns(core);
    if (!out && core.includes(" · ")) {
      const joined = core.split(" · ").map(part => DICT[part] || applyPatterns(part) || part).join(" · ");
      if (joined !== core) out = joined;
    }
    if (!out || out === core) return value;
    return lead + prefix + out + suffix + trail;
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
      ".lang-switcher .lang-btn:hover{color:#3d2f16}",
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
    document.title = document.title.split(/\s+[—–]\s+/).map(part => translateString(part)).join(" — ");
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
    if (!scheduled && pending.size) { scheduled = true; requestAnimationFrame(flush); }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
