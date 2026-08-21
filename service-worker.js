const CACHE_NAME = "colosobot-v1";
const APP_SHELL = [
  "./index.html",
  "./dashboard.html",
  "./manifest.json",
  "./assets/bot-avatar.jpg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-192.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Jamais de cache pour les appels API : toujours des données Discord en direct
  if (request.url.includes("/api/")) return;

  // On ne gère que les requêtes GET same-origin, le reste suit son chemin normal
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  // Pages HTML : réseau en priorité (contenu à jour), cache en secours si hors-ligne
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Fichiers statiques (icônes, images...) : cache en priorité, réseau en secours
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
