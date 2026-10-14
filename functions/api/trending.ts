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
 * 新鲜度窗口（秒）：缓存条目在这个时间内视为「新鲜」，直接返回、不碰 D1。
 */
const FRESH_TTL_SECONDS = 1800;

/**
 * 缓存条目本身的存活时间（秒）：7 天。
 *
 * 刻意远长于 FRESH_TTL_SECONDS —— 这样当数据库暂时不可用时
 * （D1 额度耗尽、故障、超时），缓存里仍留着上一次成功的快照可以顶上：
 * 也就是 stale-if-error 语义。**宁可给用户几小时前的数据，也不要给 500。**
 *
 * 注意：这个长 TTL 只作用于内部缓存条目；返回给客户端时会被改写成
 * FRESH_TTL_SECONDS，避免浏览器把数据缓存一周。
 */
const CACHE_ENTRY_TTL_SECONDS = 604800;

/** 记录这份快照是什么时候从数据库取到的，用于判断新鲜度 */
const HEADER_FETCHED_AT = 'x-snapshot-fetched-at';

/** 观测标记：本次响应来自哪里 */
const HEADER_STATUS = 'X-Trending-Cache';

/**
 * 热榜读取
 *
 * 历史：本接口原先每次请求都执行一次实时聚合 —— 实测单次读取 568,255 行，
 * 而每天被调用约 440 次，合计约 2.5 亿行/天，是 D1 免费额度（5,000,000 行/天）
 * 被击穿的主要原因（约占 85%）。
 *
 * 现在：聚合结果由 `workers/snapshot-refresh` 预先算好写进 snapshot_cache，
 * 本接口只做一次主键查找（读 1 行）。
 *
 * 另外：**读路径刻意不做「快照缺失就回落实时聚合」** —— 实时聚合一次要读
 * 56 万行，一旦快照长期缺失（cron 挂了、被误删），这条回落路径就会把配额
 * 重新烧光。快照缺失时返回空列表并留错误日志，保证读路径在任何情况下
 * 都不可能击穿配额。
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

        const cache = caches.default;
        const cacheKey = new Request(`https://trending-cache.internal/${period}`, {
            method: 'GET',
        });
        const cached = await cache.match(cacheKey);

        // 1) 缓存仍新鲜 → 直接返回，完全不碰 D1
        if (cached && isFresh(cached)) {
            return forClient(cached, 'HIT');
        }

        // 2) 回源：读快照（主键查找，只读 1 行）
        try {
            const snapshot = await env.DB.prepare(
                'SELECT data, updated_at FROM snapshot_cache WHERE key = ?',
            )
                .bind(`${SNAPSHOT_KEY_PREFIX}${period}`)
                .first<{ data: string; updated_at: number }>();

            const response = buildSnapshotResponse(snapshot, period);
            // 存进边缘缓存；失败也不影响本次响应
            context.waitUntil(cache.put(cacheKey, response.clone()).catch(() => undefined));
            return forClient(response, cached ? 'REFRESH' : 'MISS');
        } catch (error) {
            // 3) 回源失败（D1 额度耗尽 / 故障）→ 降级到旧快照，而不是报 500
            console.error(`[Trending] 读快照失败，尝试降级到旧快照 period=${period}:`, error);
            if (cached) return forClient(cached, 'STALE-DB-ERROR');
            // 连旧快照都没有（服务刚上线、缓存被清空），只能如实报错
            return jsonError(503, 'Trending is temporarily unavailable');
        }
    } catch (error) {
        console.error('[Trending] unexpected failure:', error);
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
 * 判断内部缓存条目是否还在新鲜度窗口内。
 * 依据是响应头里记录的「取数时间」，而不是缓存自身有没有过期 ——
 * 缓存条目本身活 7 天（为了 stale-if-error），所以必须自己算新鲜度。
 */
function isFresh(response: Response): boolean {
    const fetchedAt = Number(response.headers.get(HEADER_FETCHED_AT) || 0);
    if (!Number.isFinite(fetchedAt) || fetchedAt <= 0) return false;
    const age = Math.floor(Date.now() / 1000) - fetchedAt;
    return age >= 0 && age < FRESH_TTL_SECONDS;
}

/**
 * 把内部响应转换成给客户端的响应：
 * - 把 Cache-Control 从「7 天」改写成「30 分钟」，
 *   长 TTL 只用于内部缓存条目的存活，不应该让浏览器缓存一周。
 * - 附上状态标记便于观测（HIT / MISS / REFRESH / STALE-DB-ERROR）。
 */
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
            'Cache-Control': `public, max-age=${CACHE_ENTRY_TTL_SECONDS}`,
            [HEADER_FETCHED_AT]: String(Math.floor(Date.now() / 1000)),
            // 便于观测快照新鲜度（这是数据本身的年龄，与缓存新鲜度无关）
            'X-Trending-Snapshot-Age': snapshot ? String(ageSeconds) : 'none',
        },
    });
}
