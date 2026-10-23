/* Bump CACHE_NAME whenever shell files change, so old caches get dropped. */
var CACHE_NAME = "kotmai-chaoban-v1";
var TOPIC_INDEX = "data/topics.json";
var SHELL = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "manifest.json",
  "icons/icon.svg",
  TOPIC_INDEX
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return fetch(TOPIC_INDEX); })
      .then(function (r) { return r.json(); })
      .then(function (list) {
        return caches.open(CACHE_NAME).then(function (cache) {
          return cache.addAll(list.map(function (row) { return "data/topics/" + row.id + ".json"; }));
        });
      })
      .catch(function () {})
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Stale-while-revalidate: serve from cache instantly, refresh cache in the background.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var fetchPromise = fetch(event.request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () { return cached; });
      return cached || fetchPromise;
    })
  );
});
