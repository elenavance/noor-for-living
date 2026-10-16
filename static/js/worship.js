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

  function getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("This browser does not support location services."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        }),
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

  if (prayerButton) prayerButton.addEventListener("click", async () => {
    prayerButton.disabled = true;
    prayerButton.classList.add("is-loading");
    try {
      await loadPrayerTimes(await getLocation());
    } catch (error) {
      setStatus(prayerStatus, error.message || "Something went wrong. Please try again.", true);
    } finally {
      prayerButton.disabled = false;
      prayerButton.classList.remove("is-loading");
    }
  });

  if (qiblaButton) qiblaButton.addEventListener("click", async () => {
    qiblaButton.disabled = true;
    qiblaButton.classList.add("is-loading");
    try {
      await loadQibla(await getLocation());
    } catch (error) {
      setStatus(qiblaStatus, error.message || "Something went wrong. Please try again.", true);
    } finally {
      qiblaButton.disabled = false;
      qiblaButton.classList.remove("is-loading");
    }
  });
})();
