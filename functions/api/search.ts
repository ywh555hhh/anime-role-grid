/**
 * 只接受非负整数，其它一律丢弃。
 *
 * limit/offset 来自客户端 JSON，是不可信输入。这里收紧成整数后再拼进上游 URL ——
 * 既能防止把任意值（如 "[object Object]"）原样转发给 Bangumi，
 * 也让「上游 URL 的取值仅来自白名单 + 已校验整数」这件事对读者一目了然。
 */
function toNonNegativeInt(value: unknown): number | null {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isInteger(n) || n < 0) return null
    return n
}

/**
 * 是否为本项目自家的来源。
 *
 * 所有第一方调用本来都是**同源**的（主站 / Pages 预览部署 / 本地开发），
 * 同源请求根本不需要 CORS 头；只有跨域的第三方才需要。
 */
function isOwnOrigin(origin: string): boolean {
    try {
        const { hostname, protocol } = new URL(origin)
        if (protocol !== 'https:' && protocol !== 'http:') return false
        return (
            hostname === 'oshigrid.me' ||
            hostname.endsWith('.oshigrid.me') ||
            hostname.endsWith('.anime-role-grid.pages.dev') ||
            // 本地开发：vite dev / wrangler pages dev
            hostname === 'localhost' ||
            hostname === '127.0.0.1'
        )
    } catch {
        return false
    }
}

/**
 * 按**当前请求**现算 CORS 头，不跟着缓存走。
 *
 * 为什么不用 `Access-Control-Allow-Origin: *`：
 *   本接口背后是我们自己的 Bangumi token，通配符等于让任何网站都能白用一个
 *   带鉴权的代理、消耗我们的配额。（常听到的理由「允许带凭据的跨域请求」
 *   在这里其实不成立 —— 按 CORS 规范 `*` 本来就不能与凭据共存；
 *   真正的风险是 token 被白用。）
 *   因此只对自家来源回显 Origin，其余一律不发 CORS 头。
 */
function withCors(response: Response, request: Request): Response {
    const origin = request.headers.get('Origin')
    if (!origin || !isOwnOrigin(origin)) return response

    const out = new Response(response.body, {
        status: response.status,
        headers: new Headers(response.headers),
    })
    out.headers.set('Access-Control-Allow-Origin', origin)
    // 同一 URL 对不同 Origin 的响应不同，必须声明 Vary
    out.headers.set('Vary', 'Origin')
    return out
}

export const onRequestPost = async (context: any) => {
    const { request, env } = context;

    try {
        // 1. Parse Request
        const body = await request.clone().json(); // Clone because we might need it for cache key
        // 分页参数必须提出来放到 query string 上：
        // Bangumi v0 的搜索**不读 body 里的 limit/offset**，只认 URL 查询参数。
        // 实测：body 里传 limit=1 / limit=25 都只返回 10 条；offset=10 / 20 拿到的是同一页。
        const { searchMode, limit, offset, ...bangumiPayload } = body;

        // 2. Determine Endpoint
        let targetUrl = 'https://api.bgm.tv/v0/search/characters';
        if (searchMode === 'subject') targetUrl = 'https://api.bgm.tv/v0/search/subjects';
        else if (searchMode === 'person') targetUrl = 'https://api.bgm.tv/v0/search/persons';

        // SSRF 安全：上游主机来自上面三个**字面量常量**，客户端无法影响；
        // 客户端只能影响 query 的值，而 searchParams.set 会做百分号编码，
        // 因此无法改到其它主机或路径。limit/offset 再收紧成非负整数。
        const upstream = new URL(targetUrl);
        const pageLimit = toNonNegativeInt(limit);
        const pageOffset = toNonNegativeInt(offset);
        if (pageLimit !== null) upstream.searchParams.set('limit', String(pageLimit));
        if (pageOffset !== null) upstream.searchParams.set('offset', String(pageOffset));

        // 3. CACHE STRATEGY (Risk B)
        // Create a unique cache key based on the request body
        const cacheUrl = new URL(request.url);
        // 缓存键必须带上分页参数，否则第 2 页会命中第 1 页的缓存。
        // （body 里已经不再有 limit/offset，所以显式补上。）
        cacheUrl.searchParams.set(
            'cache_key',
            JSON.stringify({ ...bangumiPayload, limit: pageLimit, offset: pageOffset }),
        );
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

            const bgmRes = await fetch(upstream.toString(), {
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

            // 注意：缓存里存的是**不含 CORS 头**的版本。
            // 否则第一个调用方的 Origin 会被缓存下来、回给后来的其他人。
            response = new Response(JSON.stringify(data), {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
                }
            });

            // Put into cache (must use await waitUntill in Workers, but here we just await)
            await cache.put(cacheKey, response.clone());
        } else {
            console.log('[Search] Cache hit!');
        }

        // CORS 头按当前请求现算（同源调用拿不到也不影响）
        return withCors(response, request);

    } catch (err: any) {
        // Global Error Masking (Risk C)
        console.error('[Internal Proxy Error]', err);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
