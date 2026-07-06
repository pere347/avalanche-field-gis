const CACHE_NAME = "upan-allaus-cache-v7";

const URLS_TO_CACHE = [
    "./",
    "./index.html",
    "./observacio.html",
    "./accident.html",
    "./pendents.html",
    "./manifest.json",
    "./css/styles.css",
    "./js/common.js",
    "./js/observacio.js",
    "./js/accident.js",
    "./js/pendents.js",
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    "https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js"
];


// Instal·lació del Service Worker
self.addEventListener("install", event => {
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(URLS_TO_CACHE);
            })
            .catch(error => {
                console.error("Error afegint fitxers a la cache:", error);
            })
    );
});


// Activació del Service Worker i neteja de caches antigues
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

    self.clients.claim();
});


// Intercepció de peticions
self.addEventListener("fetch", event => {

    // Les peticions POST, PUT, DELETE, etc. no es poden guardar a Cache API.
    // Per tant, les deixem passar directament cap a la xarxa.
    if (event.request.method !== "GET") {
        event.respondWith(fetch(event.request));
        return;
    }

    // Per a peticions GET fem estratègia Network First:
    // primer intenta xarxa; si falla, usa cache.
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Si la resposta no és vàlida, la retornem sense cachejar
                if (
                    !response ||
                    response.status !== 200 ||
                    response.type === "opaque"
                ) {
                    return response;
                }

                const responseClone = response.clone();

                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });

                return response;
            })
            .catch(() => {
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // Fallback simple si no hi ha cache
                    if (event.request.mode === "navigate") {
                        return caches.match("./index.html");
                    }

                    return new Response("Recurs no disponible offline", {
                        status: 503,
                        statusText: "Service Unavailable",
                        headers: {
                            "Content-Type": "text/plain"
                        }
                    });
                });
            })
    );
});