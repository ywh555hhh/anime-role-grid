interface Env {
    DB: D1Database;
}

/**
 * 只接受这几个 period，其余一律回落到 24h。
 *
 * 这不只是参数校验：period 会参与缓存键，如果允许任意值，
 * 攻击者只要循环请求 ?period=x1、?period=x2…… 就能每次都造成缓存 miss，
 * 每次触发一次 56 万行的全量扫描，直接把 D1 配额烧光。
 */
const VALID_PERIODS = new Set(['12h', '24h', 'week', 'all']);

/**
 * 热榜缓存时长（秒）。
 *
 * 为什么要缓存：这个查询实测每次读取约 568,255 行 —— 它从低选择性的
 * idx_items_category 驱动（item_category='character' 占全部 items 的 71.8%），
 * saves 上的时间条件完全无法缩小扫描范围。而 D1 免费额度只有 5,000,000 行/天，
 * 也就是**一天只够跑 8 次左右**。
 *
 * 为什么取 30 分钟：热榜只有 4 个 period 键，按每天约 250 次请求估算，
 * 同一键的平均请求间隔约 17 分钟，TTL 必须大于这个间隔才有意义。
 * 日榜/周榜/总榜本身也不需要实时。
 *
 * 注意：这只是止血。查询本身仍需改写（把 created_at 冗余进 save_items
 * 并建复合索引），否则单次 56 万行的成本长期仍无法承受。
 */
const CACHE_TTL_SECONDS = 1800;

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { env, request } = context;

    try {
        let url: URL;
        try {
            url = new URL(request.url);
        } catch {
            return new Response(JSON.stringify({ error: 'Malformed request URL' }), { status: 400 });
        }

        const requested = url.searchParams.get('period') || '24h';
        const period = VALID_PERIODS.has(requested) ? requested : '24h';

        let timeCondition = '';
        const limit = 63;

        // Logic for different periods
        if (period === '12h') {
            timeCondition = "AND s.created_at > (strftime('%s', 'now') - 43200)"; // 12 * 3600
        } else if (period === '24h') {
            timeCondition = "AND s.created_at > (strftime('%s', 'now') - 86400)";
        } else if (period === 'week') {
            timeCondition = "AND s.created_at > (strftime('%s', 'now') - 604800)"; // 7 * 24 * 3600
        } else {
            // 'all' —— 无时间过滤
            timeCondition = "";
        }

        // 缓存键刻意只按已校验的 period 区分：忽略客户端传来的随机参数（cache-buster），
        // 否则每次请求都会成为一次缓存 miss，缓存形同虚设。
        const cache = caches.default;
        const cacheKey = new Request(`https://trending-cache.internal/${period}`, { method: 'GET' });

        const cached = await cache.match(cacheKey);
        if (cached) {
            // 注意：缓存里存的是当初那条响应，其头部标的是 MISS。
            // 这里重建一次响应并改写标记，否则命中时也会显示 MISS，观测就失真了。
            const hit = new Response(cached.body, {
                status: cached.status,
                headers: new Headers(cached.headers),
            });
            hit.headers.set('X-Trending-Cache', 'HIT');
            return hit;
        }

        const stmt = env.DB.prepare(`
            SELECT 
                si.character_name as name, 
                si.bangumi_id as id, 
                si.img_url as image, -- Note: This might be NULL if it was a custom base64, but for Bangumi items it's a URL
                COUNT(DISTINCT s.user_hash) as count
            FROM save_items si
            JOIN saves s ON si.save_id = s.id
            WHERE 1=1
            ${timeCondition}
            AND si.item_category = 'character' -- Focus on characters for now
            GROUP BY si.bangumi_id
            ORDER BY count DESC
            LIMIT ?
        `).bind(limit);

        const { results } = await stmt.all();

        const response = new Response(JSON.stringify({ results }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
                'X-Trending-Cache': 'MISS'
            }
        });

        // 写入边缘缓存；失败也不影响本次响应
        const forCache = response.clone();
        context.waitUntil(cache.put(cacheKey, forCache).catch(() => undefined));

        return response;

    } catch (e: any) {
        console.error('[Trending] query failed', e);
        // 不再把原始 D1 错误（其中包含额度提示等内部信息）泄露给客户端
        return new Response(JSON.stringify({ error: 'Failed to load trending' }), { status: 500 });
    }
}
