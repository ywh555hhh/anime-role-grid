export const onRequestPost = async (context: any) => {
    const { request, env } = context;

    try {
        // 1. Parse Request
        const body = await request.clone().json(); // Clone because we might need it for cache key
        const { searchMode, ...bangumiPayload } = body;

        // 2. Determine Endpoint
        let targetUrl = 'https://api.bgm.tv/v0/search/characters';
        if (searchMode === 'subject') targetUrl = 'https://api.bgm.tv/v0/search/subjects';
        else if (searchMode === 'person') targetUrl = 'https://api.bgm.tv/v0/search/persons';

        // 3. CACHE STRATEGY (Risk B)
        // Create a unique cache key based on the request body
        const cacheUrl = new URL(request.url);
        cacheUrl.searchParams.set('cache_key', JSON.stringify(body)); // Simple cache key (Unique per query)
        // Critical Fix: Cache API only accepts GET requests. We synthesize a GET request as the key.
        const cacheKey = new Request(cacheUrl.toString(), {
            method: 'GET',
        });
        const cache = caches.default;

        let response = await cache.match(cacheKey);

        if (!response) {
            console.log('[Search] Cache miss, fetching from Bangumi...');

            // Get Token
            const token = env.BANGUMI_TOKEN;
            if (!token) throw new Error('Server Config Error: Missing Bangumi Token');

            const bgmRes = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'User-Agent': 'AnimeGrid/1.0 (https://github.com/ywh555hhh/anime-role-grid)',
                },
                body: JSON.stringify(bangumiPayload),
            });

            // 4. Handle External API Errors (Risk C)
            if (!bgmRes.ok) {
                // Return generic 502/500, do NOT leak upstream body
                console.error(`[Bangumi Error] ${bgmRes.status} ${bgmRes.statusText}`);
                return new Response(JSON.stringify({ error: 'Upstream Service Unavailable' }), {
                    status: 502,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 5. Wrap response and Cache it
            const data = await bgmRes.json();

            response = new Response(JSON.stringify(data), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
                }
            });

            // Put into cache (must use await waitUntill in Workers, but here we just await)
            await cache.put(cacheKey, response.clone());
        } else {
            console.log('[Search] Cache hit!');
        }

        return response;

    } catch (err: any) {
        // Global Error Masking (Risk C)
        console.error('[Internal Proxy Error]', err);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
