(() => {
  const KAABA = { lat: 21.422487, lon: 39.826206 };
  const prayerButton = document.getElementById("locate-button");
  const qiblaButton = document.getElementById("qibla-locate-button");
  const prayerStatus = document.getElementById("prayer-status");
  const qiblaStatus = document.getElementById("qibla-status");
  const prayerGrid = document.getElementById("prayer-grid");
  const dateLabel = document.getElementById("prayer-date");
  const locationTitle = document.getElementById("location-title");
  const locationDetail = document.getElementById("location-detail");
  const bearingLabel = document.getElementById("qibla-bearing");
  const cardinalLabel = document.getElementById("qibla-cardinal");
  const distanceLabel = document.getElementById("qibla-distance");
  const needle = document.getElementById("qibla-needle");
  const prayerNames = [
    ["Fajr", "Before sunrise"], ["Sunrise", "Sunrise"],
    ["Dhuhr", "Midday prayer"], ["Asr", "Afternoon prayer"],
    ["Maghrib", "After sunset"], ["Isha", "Night prayer"]
  ];

  function setStatus(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-error", isError);
  }

  function readSavedLocation() {
    try { const saved = JSON.parse(localStorage.getItem("noor.savedLocation") || "null"); return saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lon) ? saved : null; }
    catch (_) { return null; }
  }
  function saveLocation(location) {
    const value = {lat: location.lat, lon: location.lon, accuracy: location.accuracy || 0, savedAt: Date.now()};
    localStorage.setItem("noor.savedLocation", JSON.stringify(value));
    return value;
  }
  function getLocation(force = false) {
    const cached = !force && readSavedLocation();
    if (cached) return Promise.resolve(cached);
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("This browser does not support location services."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(saveLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        })),
        (error) => {
          const messages = {
            1: "Location permission was denied. Enable it in your browser settings and try again.",
            2: "Your location could not be determined. Check your device location settings.",
            3: "Location request timed out. Please try again."
          };
          reject(new Error(messages[error.code] || "Unable to access your location."));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
      );
    });
  }

  function formatDateForApi(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return day + "-" + month + "-" + date.getFullYear();
  }

  let reminderTimers = [];
  let activeAdhan = null;
  const adhanAudioUrls = {
    Fajr: "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_01_Fajr_Adhan.mp3",
    Dhuhr: "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_02_Dhuhr_Adhan.mp3",
    Asr: "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_03_Asr_Adhan.mp3",
    Maghrib: "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_04_Maghrib_Adhan.mp3",
    Isha: "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_05_Isha_Adhan.mp3"
  };
  const soundToggle = document.getElementById("adhan-sound-toggle");
  const notificationToggle = document.getElementById("prayer-notification-toggle");
  const testAdhanButton = document.getElementById("test-adhan-button");
  const alertPreferenceStatus = document.getElementById("alert-preference-status");
  function soundEnabled() { return localStorage.getItem("noor.adhanSound") === "on"; }
  function notificationsEnabled() { return localStorage.getItem("noor.prayerNotifications") === "on" || (localStorage.getItem("noor.prayerReminders") === "on" && "Notification" in window && Notification.permission === "granted"); }
  function setAlertStatus(message, isError = false) { if (!alertPreferenceStatus) return; alertPreferenceStatus.textContent = message; alertPreferenceStatus.style.color = isError ? "#a64235" : ""; }
  async function playAdhan(name = "Dhuhr", preview = false) {
    const audioUrl = adhanAudioUrls[name] || adhanAudioUrls.Dhuhr;
    try {
      if (activeAdhan) { activeAdhan.pause(); activeAdhan.currentTime = 0; }
      activeAdhan = new Audio(audioUrl); activeAdhan.preload = "none"; activeAdhan.volume = 1;
      await activeAdhan.play();
      setAlertStatus(preview ? "Adhan audio is playing. Use your device's media controls to pause it." : name + " Adhan is playing.");
      activeAdhan.addEventListener("ended", () => { activeAdhan = null; }, {once:true});
      return true;
    } catch (_) { setAlertStatus("Adhan audio could not start. Check your connection and tap Test Adhan sound once to allow playback.", true); return false; }
  }
  function stopAdhan() { if (activeAdhan) { activeAdhan.pause(); activeAdhan.currentTime = 0; activeAdhan = null; } }
  function schedulePrayerReminders(timings) {
    reminderTimers.forEach(clearTimeout); reminderTimers = [];
    if (!(soundEnabled() || (notificationsEnabled() && "Notification" in window && Notification.permission === "granted"))) return;
    ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach(name => {
      const match = String(timings[name] || "").match(/^(\d{1,2}):(\d{2})/);
      if (!match) return;
      const target = new Date(); target.setHours(Number(match[1]), Number(match[2]), 0, 0);
      const delay = target.getTime() - Date.now();
      if (delay <= 0 || delay > 86400000) return;
      reminderTimers.push(setTimeout(async () => {
        if (soundEnabled()) await playAdhan(name);
        if (notificationsEnabled() && "Notification" in window && Notification.permission === "granted") {
          try { const registration = await navigator.serviceWorker.ready; await registration.showNotification("NOOR FOR LIVING · " + name, {body:"It is time for " + name + " prayer.",tag:"noor-prayer-" + name.toLowerCase()}); } catch (_) {}
        }
      }, delay));
    });
  }

  function showPrayerTimes(timings) {
    if (!prayerGrid) return;
    prayerGrid.innerHTML = "";
    prayerNames.forEach(([name, hint]) => {
      const time = timings[name];
      const card = document.createElement("article");
      card.className = "prayer-card";
      const title = document.createElement("span");
      title.textContent = name.toUpperCase();
      const value = document.createElement("strong");
      value.textContent = typeof time === "string" ? time.split(" ")[0] : "—:—";
      const caption = document.createElement("small");
      caption.textContent = hint;
      card.append(title, value, caption);
      prayerGrid.appendChild(card);
    });
  }

  async function loadPrayerTimes(location) {
    setStatus(prayerStatus, "Calculating today's schedule…");
    if (locationTitle) locationTitle.textContent = "Location found";
    if (locationDetail) locationDetail.textContent = location.lat.toFixed(4) + ", " + location.lon.toFixed(4) + " · Approx. " + Math.round(location.accuracy) + " m accuracy";
    const date = new Date();
    if (dateLabel) dateLabel.textContent = new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(date);
    const url = new URL("https://api.aladhan.com/v1/timings/" + formatDateForApi(date));
    url.searchParams.set("latitude", String(location.lat));
    url.searchParams.set("longitude", String(location.lon));
    url.searchParams.set("method", "20");
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("The prayer-time service is temporarily unavailable. Please try again later.");
    const payload = await response.json();
    if (payload.code !== 200 || !payload.data || !payload.data.timings) {
      throw new Error("Prayer times could not be calculated for this location.");
    }
    showPrayerTimes(payload.data.timings);
    schedulePrayerReminders(payload.data.timings);
    const method = payload.data.meta && payload.data.meta.method && payload.data.meta.method.name;
    setStatus(prayerStatus, "Schedule loaded" + (method ? " · " + method : "") + ". Please confirm locally before relying on it.");
  }

  function qiblaData(location) {
    const toRad = (degrees) => degrees * Math.PI / 180;
    const toDeg = (radians) => radians * 180 / Math.PI;
    const lat1 = toRad(location.lat);
    const lat2 = toRad(KAABA.lat);
    const deltaLon = toRad(KAABA.lon - location.lon);
    const y = Math.sin(deltaLon);
    const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(deltaLon);
    const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
    const dLat = lat2 - lat1;
    const dLon = deltaLon;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return { bearing, distance };
  }

  function cardinalDirection(degrees) {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return directions[Math.round(degrees / 22.5) % 16];
  }

  async function loadQibla(location) {
    setStatus(qiblaStatus, "Calculating Qibla direction…");
    const result = qiblaData(location);
    if (needle) needle.style.transform = "translate(-50%, -50%) rotate(" + result.bearing + "deg)";
    if (bearingLabel) bearingLabel.textContent = result.bearing.toFixed(1) + "°";
    if (cardinalLabel) cardinalLabel.textContent = cardinalDirection(result.bearing) + " from true north";
    if (distanceLabel) distanceLabel.textContent = Math.round(result.distance).toLocaleString("en") + " km to the Kaaba";
    setStatus(qiblaStatus, "Direction calculated from your coordinates. This is a geographic bearing, not a live magnetic compass.");
  }

  if (soundToggle) {
    soundToggle.checked = soundEnabled();
    soundToggle.addEventListener("change", () => {
      if (soundToggle.checked) { localStorage.setItem("noor.adhanSound", "on"); setAlertStatus("Adhan sound enabled. Use Test Adhan sound once to confirm playback on this device."); }
      else { localStorage.removeItem("noor.adhanSound"); stopAdhan(); setAlertStatus(notificationsEnabled() ? "Sound is off; notifications remain enabled." : "Both alert options are off."); }
      const cached = readSavedLocation(); if (cached && prayerGrid) loadPrayerTimes(cached).catch(() => {});
    });
  }
  if (notificationToggle) {
    notificationToggle.checked = notificationsEnabled() && "Notification" in window && Notification.permission === "granted";
    notificationToggle.addEventListener("change", async () => {
      if (!("Notification" in window)) { notificationToggle.checked = false; setAlertStatus("This browser does not support notifications. Adhan sound can still work while NOOR is open.", true); return; }
      if (notificationToggle.checked) {
        if (Notification.permission === "denied") { notificationToggle.checked = false; setAlertStatus("Notifications are blocked in browser settings. Enable them there to continue.", true); return; }
        const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
        if (permission !== "granted") { notificationToggle.checked = false; localStorage.removeItem("noor.prayerNotifications"); setAlertStatus("Notification permission was not granted. You can enable sound separately.", true); return; }
        localStorage.setItem("noor.prayerNotifications", "on"); localStorage.removeItem("noor.prayerReminders");
        setAlertStatus(soundEnabled() ? "Adhan sound and notifications are both enabled." : "Prayer notifications are enabled; sound remains off.");
      } else {
        localStorage.removeItem("noor.prayerNotifications"); localStorage.removeItem("noor.prayerReminders");
        setAlertStatus(soundEnabled() ? "Notifications are off; Adhan sound remains enabled." : "Both alert options are off.");
      }
      const cached = readSavedLocation();
      if (cached && prayerGrid) { try { await loadPrayerTimes(cached); } catch (error) { setStatus(prayerStatus, error.message || "Could not refresh prayer alerts.", true); } }
    });
  }
  if (testAdhanButton) testAdhanButton.addEventListener("click", () => { playAdhan("Dhuhr", true); });
  if (soundEnabled() || notificationsEnabled()) setAlertStatus(soundEnabled() && notificationsEnabled() ? "Adhan sound and notifications are enabled." : soundEnabled() ? "Adhan sound is enabled." : "Prayer notifications are enabled.");

  if (prayerButton) prayerButton.addEventListener("click", async () => {
    prayerButton.disabled = true;
    prayerButton.classList.add("is-loading");
    try {
      await loadPrayerTimes(await getLocation(true));
    } catch (error) {
      setStatus(prayerStatus, error.message || "Something went wrong. Please try again.", true);
    } finally {
      prayerButton.disabled = false;
      prayerButton.classList.remove("is-loading");
    }
  });

  const savedLocation = readSavedLocation();
  if (savedLocation && prayerGrid) loadPrayerTimes(savedLocation).catch(error => setStatus(prayerStatus, error.message, true));
  if (savedLocation && needle) loadQibla(savedLocation).catch(error => setStatus(qiblaStatus, error.message, true));

  if (qiblaButton) qiblaButton.addEventListener("click", async () => {
    qiblaButton.disabled = true;
    qiblaButton.classList.add("is-loading");
    try {
      await loadQibla(await getLocation(true));
    } catch (error) {
      setStatus(qiblaStatus, error.message || "Something went wrong. Please try again.", true);
    } finally {
      qiblaButton.disabled = false;
      qiblaButton.classList.remove("is-loading");
    }
  });
})();
