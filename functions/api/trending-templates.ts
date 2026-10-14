interface Env {
    DB: D1Database;
}

/**
 * 快照键。**写入方是 `workers/snapshot-refresh/src/index.ts`，两边必须一致**。
 */
const SNAPSHOT_KEY = 'trending-templates';

/** 新鲜度窗口（秒）：在此时间内直接返回缓存，不碰 D1 */
const FRESH_TTL_SECONDS = 1800;

/**
 * 缓存条目存活时间（秒）：7 天。
 * 与 /api/trending 同理 —— 长 TTL 让回源失败时还有旧快照可以顶上
 * （stale-if-error），返回给客户端时会被改写成 FRESH_TTL_SECONDS。
 */
const CACHE_ENTRY_TTL_SECONDS = 604800;

/** 记录这份快照是什么时候从数据库取到的，用于判断新鲜度 */
const HEADER_FETCHED_AT = 'x-snapshot-fetched-at';

/** 观测标记 */
const HEADER_STATUS = 'X-Trending-Templates-Cache';

/**
 * 热门模板列表
 *
 * 历史：原先每次请求都执行 `SELECT template_id, COUNT(*) FROM saves
 * GROUP BY template_id` —— 实测单次读取 63,039 行，每天被调用约 70 次。
 * 而且它同样只依赖一个可被随机参数击穿的 `max-age=60` 头，没有真正的缓存。
 *
 * 现在：读取由 `workers/snapshot-refresh` 预计算好的快照（主键查找，读 1 行），
 * 叠加边缘缓存，并在回源失败时降级到旧快照。
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { env } = context;

    try {
        const cache = caches.default;
        const cacheKey = new Request(`https://trending-templates-cache.internal/${SNAPSHOT_KEY}`, {
            method: 'GET',
        });
        const cached = await cache.match(cacheKey);

        // 1) 缓存仍新鲜 → 直接返回
        if (cached && isFresh(cached)) {
            return forClient(cached, 'HIT');
        }

        // 2) 回源：读快照
        try {
            const snapshot = await env.DB.prepare(
                'SELECT data, updated_at FROM snapshot_cache WHERE key = ?',
            )
                .bind(SNAPSHOT_KEY)
                .first<{ data: string; updated_at: number }>();

            const response = buildSnapshotResponse(snapshot);
            context.waitUntil(cache.put(cacheKey, response.clone()).catch(() => undefined));
            return forClient(response, cached ? 'REFRESH' : 'MISS');
        } catch (error) {
            // 3) 回源失败 → 降级到旧快照，而不是报 500
            console.error('[TrendingTemplates] 读快照失败，尝试降级到旧快照:', error);
            if (cached) return forClient(cached, 'STALE-DB-ERROR');
            return new Response(
                JSON.stringify({ error: 'Trending templates are temporarily unavailable' }),
                {
                    status: 503,
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
                },
            );
        }
    } catch (error) {
        console.error('[TrendingTemplates] unexpected failure:', error);
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

function isFresh(response: Response): boolean {
    const fetchedAt = Number(response.headers.get(HEADER_FETCHED_AT) || 0);
    if (!Number.isFinite(fetchedAt) || fetchedAt <= 0) return false;
    const age = Math.floor(Date.now() / 1000) - fetchedAt;
    return age >= 0 && age < FRESH_TTL_SECONDS;
}

function forClient(response: Response, status: string): Response {
    const out = new Response(response.body, {
        status: response.status,
        headers: new Headers(response.headers),
    });
    out.headers.set('Cache-Control', `public, max-age=${FRESH_TTL_SECONDS}`);
    out.headers.set(HEADER_STATUS, status);
    return out;
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
            'Cache-Control': `public, max-age=${CACHE_ENTRY_TTL_SECONDS}`,
            [HEADER_FETCHED_AT]: String(Math.floor(Date.now() / 1000)),
            'X-Trending-Templates-Snapshot-Age': snapshot ? String(ageSeconds) : 'none',
        },
    });
}
