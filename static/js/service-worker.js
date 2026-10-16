const CACHE_NAME = "noor-for-living-v11";
const APP_SHELL = ["/", "/offline/", "/static/css/app.css", "/static/css/luxury.css", "/static/css/calendar.css", "/static/js/calendar.js", "/static/js/app.js", "/static/css/auth.css", "/static/css/worship.css", "/static/js/worship.js", "/static/css/quran.css", "/static/js/quran.js", "/static/css/remembrance.css", "/static/js/remembrance.js", "/static/css/tracker.css", "/static/css/ask-noor.css", "/static/css/dashboard.css", "/daily-remembrance/", "/prayer-times/", "/qibla/", "/islamic-calendar/"];
const PRIVATE_PATHS = ["/accounts/dashboard/", "/my-bookmarks/", "/quran/", "/ask-noor/", "/my-journey/"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    if (PRIVATE_PATHS.some(path => url.pathname.startsWith(path))) {
      event.respondWith(fetch(event.request));
      return;
    }
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) { const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)); }
      return response;
    }).catch(async()=> (await caches.match(event.request)) || (await caches.match("/offline/"))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached || fetch(event.request).then(response=>{
    if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(event.request,response.clone()));
    return response;
  })));
});
