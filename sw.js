// Casino Night — Service Worker
// Caches the app shell so it loads offline / instantly

var CACHE = 'casino-night-v1';
var ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Mono:wght@300;400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install: cache app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // Cache what we can, don't fail if CDN is unavailable
      return Promise.allSettled(ASSETS.map(function(url) {
        return cache.add(url).catch(function(){});
      }));
    })
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Fetch: network first, fall back to cache for HTML
// Always network-first so Supabase API calls go through
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Always fetch Supabase API requests from network — never cache them
  if (url.includes('supabase.co')) {
    return; // let browser handle it normally
  }

  // For the app shell: network first, cache as fallback
  e.respondWith(
    fetch(e.request).then(function(response) {
      // Update cache with fresh version
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE).then(function(cache){ cache.put(e.request, clone); });
      }
      return response;
    }).catch(function() {
      // Network failed — serve from cache
      return caches.match(e.request);
    })
  );
});
