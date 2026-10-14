interface Env {
    DB: D1Database;
}

/**
 * 只接受这几个 period，其余一律回落到 24h。
 *
 * 不含 '12h'：前端只有周榜/日榜/总榜三个 tab，从未使用 12h，
 * 而它会多一次 COUNT(DISTINCT)，使快照刷新成本涨 30%。
 * 写入端（workers/snapshot-refresh）也同样不生成 12h。
 *
 * period 会参与缓存键和快照键；如果允许任意值，攻击者只要循环请求
 * ?period=x1、?period=x2…… 就能每次都绕过缓存/快照直查数据库。
 */
const VALID_PERIODS = new Set(['24h', 'week', 'all']);

/**
 * 快照键前缀。
 *
 * **写入方是 `workers/snapshot-refresh/src/index.ts`，两边必须保持一致**，
 * 改动时请同时更新两处。
 */
const SNAPSHOT_KEY_PREFIX = 'trending:';

/**
 * 边缘缓存时长（秒）。
 *
 * 快照本身每 12 小时才由 cron 刷新一次，这里只是再挡一层重复请求，
 * 让同一时间窗内的重复访问完全不碰 D1。
 */
const CACHE_TTL_SECONDS = 1800;

/**
 * 热榜读取
 *
 * 历史：本接口原先每次请求都执行一次实时聚合 —— 实测单次读取 568,255 行，
 * 而每天被调用约 440 次，合计约 2.5 亿行/天，是 D1 免费额度（5,000,000 行/天）
 * 被击穿的主要原因（约占 85%）。
 *
 * 现在：聚合结果由 `workers/snapshot-refresh` 预先算好写进 snapshot_cache，
 * 本接口只做一次主键查找（读 1 行）。
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { env, request } = context;

    try {
        let url: URL;
        try {
            url = new URL(request.url);
        } catch {
            return jsonError(400, 'Malformed request URL');
        }

        const requested = url.searchParams.get('period') || '24h';
        const period = VALID_PERIODS.has(requested) ? requested : '24h';

        // 1) 边缘缓存：命中则完全不碰 D1
        const cache = caches.default;
        const cacheKey = new Request(`https://trending-cache.internal/${period}`, {
            method: 'GET',
        });
        const cached = await cache.match(cacheKey);
        if (cached) return relayWithCacheStatus(cached, 'HIT');

        // 2) 读快照。(key) 是主键，只读 1 行。
        //
        //    这里刻意**不做**「快照缺失就回落实时聚合」：实时聚合一次要读
        //    568,255 行，一旦快照长期缺失（cron 挂了、被误删），这条回落路径
        //    就会把配额重新烧光。宁可返回空列表并留下明显日志 ——
        //    读路径必须做到「无论上游怎样都不可能击穿配额」。
        const snapshot = await env.DB.prepare(
            'SELECT data, updated_at FROM snapshot_cache WHERE key = ?',
        )
            .bind(`${SNAPSHOT_KEY_PREFIX}${period}`)
            .first<{ data: string; updated_at: number }>();

        const response = buildSnapshotResponse(snapshot, period);

        // 3) 写边缘缓存；失败也不影响本次响应
        const forCache = response.clone();
        context.waitUntil(cache.put(cacheKey, forCache).catch(() => undefined));

        return response;
    } catch (error) {
        console.error('[Trending] read failed:', error);
        // 不把原始 D1 错误（含额度提示等内部信息）泄露给客户端
        return jsonError(500, 'Failed to load trending');
    }
};

// =============================================================================
// 辅助
// =============================================================================

function jsonError(status: number, error: string): Response {
    return new Response(JSON.stringify({ error }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
        },
    });
}

/**
 * 缓存里存的是当初那条响应，其头部标的是 MISS。
 * 这里重建一次响应并改写标记，否则命中时也会显示 MISS，观测就失真了。
 */
function relayWithCacheStatus(cached: Response, status: string): Response {
    const relay = new Response(cached.body, {
        status: cached.status,
        headers: new Headers(cached.headers),
    });
    relay.headers.set('X-Trending-Cache', status);
    return relay;
}

function buildSnapshotResponse(
    snapshot: { data: string; updated_at: number } | null,
    period: string,
): Response {
    let results: unknown[] = [];

    if (!snapshot || typeof snapshot.data !== 'string') {
        // 引导阶段（快照还没被写过）或快照被误删。
        // 返回空列表：便宜、无副作用，且不会击穿配额。
        console.error(
            `[Trending] 快照缺失 key=${SNAPSHOT_KEY_PREFIX}${period}，返回空列表。` +
                ' 请检查 workers/snapshot-refresh 是否已运行。',
        );
    } else {
        try {
            const parsed = JSON.parse(snapshot.data) as unknown;
            results = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error(
                `[Trending] 快照 JSON 解析失败 key=${SNAPSHOT_KEY_PREFIX}${period}:`,
                error,
            );
        }
    }

    const ageSeconds = snapshot
        ? Math.max(0, Math.floor(Date.now() / 1000) - snapshot.updated_at)
        : 0;

    return new Response(JSON.stringify({ results }), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
            'X-Trending-Cache': 'MISS',
            // 便于观测快照新鲜度；none 表示快照不存在
            'X-Trending-Snapshot-Age': snapshot ? String(ageSeconds) : 'none',
        },
    });
}
