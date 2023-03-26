
importScripts('./sw_env.js');


const { cacheName, cacheFiles } = globalThis.sw_env;

globalThis.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    e.waitUntil((async function () {
        globalThis.skipWaiting();
        const cache = await caches.open(cacheName);
        return cache.addAll(cacheFiles);
    })());
});

globalThis.addEventListener('activate', function (e) {
    e.waitUntil((async function () {
        await clients.claim();
    })());
});

globalThis.addEventListener('fetch', function (e) {
    e.respondWith(async function () {
        const url = String(e.request.url);
        let allowCache = true;
        // if ((e.request.cache === 'no-store' || e.request.cache === 'no-cache')) allowCache = false; else
        for (const i in globalThis.sw_replaces) {
            if (url.endsWith(i)) {
                const result = await globalThis.sw_replaces[i](e.request);
                if (result === globalThis.sw_env.NO_CACHE) {
                    allowCache = false;
                }
                else return result;
            }
        }
        if ((!navigator.onLine) || (allowCache && !(e.request.cache === 'no-store'))) {
            const cacheResult = await caches.match(e.request, { ignoreSearch: true });
            if (cacheResult) return cacheResult;
        }
        try {
            const req = new Request(e.request.url, {
                method: e.request.method,
                headers: e.request.headers,
                body: e.request.body,
                mode: (e.request.mode === 'navigate') ? undefined : e.request.mode,
                credentials: e.request.credentials,
                cache: e.request.cache === 'no-store' ? 'no-store' : 'no-cache',
                redirect: e.request.redirect,
                referrer: e.request.referrer,
                referrerPolicy: e.request.referrerPolicy,
                integrity: e.request.integrity,
            });
            const resp = await fetch(req);
            if (
                allowCache &&
                (e.request.cache !== 'no-store') &&
                /GET/i.test(e.request.method) &&
                resp.status === 200 &&
                e.request.url.startsWith(globalThis.location.origin)
            ) try {
                const cache = await caches.open(cacheName);
                const url = new URL(e.request.url);
                url.search = '';
                const req = new Request(url, {
                    headers: e.request.headers,
                    body: e.request.body,
                });
                await cache.put(req, resp.clone());
            } catch (error) { console.warn('Failed to cache', e.request, ':', error); };
            return resp;
        } catch (error) {
            console.error('Failed to request', e.request.url, ':', error);
        }
        return new Response(new Blob([]), { status: 599, statusText: 'Service Worker Internal Error' });
    }());
});



function nop() { }



