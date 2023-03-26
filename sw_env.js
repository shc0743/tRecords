globalThis.sw_env = {
    cacheName: 't_records-f922cc1f492141fa8ea6d63d03b1381c',
    cacheFiles: [
        'main.js',
    ],
    NO_CACHE: Symbol('No Cache'),
};

globalThis.sw_replaces = {
    async 'sw_content.js'(req) {
        return new Response(new Blob(['globalThis.swAlive = true'], { type: 'text/javascript' }));
    },
    async 'version'(req) {
        if (!navigator.onLine) {
            const cacheResult = await caches.match(req);
            return cacheResult || fetch(req).catch(nop);
        }
        const newRequest = new Request(req.url, Object.assign(Object.assign({}, req), {
            cache: 'no-cache',
        }));
        const resp = await fetch(newRequest);
        const cacheResult = await caches.match(req);
        if (!cacheResult) {
            const cache = await caches.open(globalThis.sw_env.cacheName);
            try { await cache.put(req, resp.clone()); } catch (error) {}
        }
        return resp;
    },
};

