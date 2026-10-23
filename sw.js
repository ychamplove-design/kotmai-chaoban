/* Bump CACHE_NAME whenever shell files change, so old caches get dropped. */
var CACHE_NAME = "kotmai-chaoban-v3";
var TOPIC_INDEX = "data/topics.json";
var SHELL = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "manifest.json",
  "icons/icon.svg",
  "data/keywords.json",
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

// Network-first: always try to show the latest deployed content when online.
// Falls back to cache only when the network is unavailable, so the site still works offline.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
      }
      return response;
    }).catch(function () {
      return caches.match(event.request);
    })
  );
});
