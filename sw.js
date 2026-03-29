const CACHE_NAME = 'dante-premium-cache-v1';

// Recursos de alta criticidade e interface que não mudam
const PRECACHE_ASSETS = [
    '/',
    '/index.html'
    // Imagens, vídeos e assets dinâmicos serão oxigenados automaticamente
];

// O Service Worker instala e guarda os dados críticos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Limpeza de cache antigo sempre que soltar uma versão nova (V2, V3...)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Stale-while-revalidate (Entrega o que tem super rápido e atualiza por trás)
self.addEventListener('fetch', event => {
    // Escapa vídeos do Vimeo e recursos de terceiros para não sobrecarregar
    if (event.request.url.includes('vimeo') || event.request.url.includes('unsplash')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                // Guarda a nova cópia
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            });

            // Se tem no cache, serve instantaneamente a cópia visual. 
            // Paralelamente, a network faz o update pro próximo carregamento!
            return cachedResponse || fetchPromise;
        }).catch(() => {
            // Em caso de offline, se não tiver cache, apenas encerra
            return new Response('Conteúdo offline.');
        })
    );
});
