interface Env {
    DB: D1Database;
}

/**
 * 快照键。**写入方是 `workers/snapshot-refresh/src/index.ts`，两边必须一致**。
 */
const SNAPSHOT_KEY = 'trending-templates';

/** 边缘缓存时长（秒）。快照每 12 小时由 cron 刷新一次。 */
const CACHE_TTL_SECONDS = 1800;

/**
 * 热门模板列表
 *
 * 历史：原先每次请求都执行 `SELECT template_id, COUNT(*) FROM saves
 * GROUP BY template_id` —— 实测单次读取 63,039 行，每天被调用约 70 次。
 * 而且它同样只依赖一个可被随机参数击穿的 `max-age=60` 头，没有真正的缓存。
 *
 * 现在：读取由 `workers/snapshot-refresh` 预计算好的快照（主键查找，读 1 行），
 * 并叠加边缘缓存。
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { env } = context;

    try {
        const cache = caches.default;
        const cacheKey = new Request(`https://trending-templates-cache.internal/${SNAPSHOT_KEY}`, {
            method: 'GET',
        });

        const cached = await cache.match(cacheKey);
        if (cached) return relayWithCacheStatus(cached, 'HIT');

        const snapshot = await env.DB.prepare(
            'SELECT data, updated_at FROM snapshot_cache WHERE key = ?',
        )
            .bind(SNAPSHOT_KEY)
            .first<{ data: string; updated_at: number }>();

        const response = buildSnapshotResponse(snapshot);

        const forCache = response.clone();
        context.waitUntil(cache.put(cacheKey, forCache).catch(() => undefined));

        return response;
    } catch (error) {
        console.error('[TrendingTemplates] read failed:', error);
        // 不把原始 D1 错误泄露给客户端
        return new Response(JSON.stringify({ error: 'Failed to load trending templates' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
    }
};

// =============================================================================
// 辅助
// =============================================================================

function relayWithCacheStatus(cached: Response, status: string): Response {
    const relay = new Response(cached.body, {
        status: cached.status,
        headers: new Headers(cached.headers),
    });
    relay.headers.set('X-Trending-Templates-Cache', status);
    return relay;
}

function buildSnapshotResponse(
    snapshot: { data: string; updated_at: number } | null,
): Response {
    let results: unknown[] = [];

    if (!snapshot || typeof snapshot.data !== 'string') {
        // 与 /api/trending 同样的原则：快照缺失时返回空列表而不是回落实时聚合，
        // 保证读路径不可能击穿 D1 配额。
        console.error(
            `[TrendingTemplates] 快照缺失 key=${SNAPSHOT_KEY}，返回空列表。` +
                ' 请检查 workers/snapshot-refresh 是否已运行。',
        );
    } else {
        try {
            const parsed = JSON.parse(snapshot.data) as unknown;
            results = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error(`[TrendingTemplates] 快照 JSON 解析失败 key=${SNAPSHOT_KEY}:`, error);
        }
    }

    const ageSeconds = snapshot
        ? Math.max(0, Math.floor(Date.now() / 1000) - snapshot.updated_at)
        : 0;

    return new Response(JSON.stringify({ results }), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
            'X-Trending-Templates-Cache': 'MISS',
            'X-Trending-Templates-Snapshot-Age': snapshot ? String(ageSeconds) : 'none',
        },
    });
}
