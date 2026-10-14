/**
 * 快照刷新 Worker
 * ==============
 *
 * 职责：定期把「热榜 / 热门模板 / 投票统计」三类聚合结果算好写进数据库，
 * 让读取端只查一行，而不是每次请求都全量扫描 save_items。
 *
 * ## 为什么需要它
 * 实测线上每天读 2~4 亿行，而 D1 免费额度只有 5,000,000 行/天。逐项拆开：
 *
 * | 端点                        | 单次读行数 | 每天调用 | 合计      |
 * | --------------------------- | ---------- | -------- | --------- |
 * | /api/trending               |    568,255 |      440 | ≈250M     |
 * | /api/stats/<id>             |    791,290 |       54 | ≈ 43M     |
 * | /api/trending-templates     |     63,039 |       70 | ≈4.4M     |
 * | /api/search（有 Cache API） |          0 |      336 | 0         |
 *
 * 而真正需要的数据量极小：最近 24h 只有 122 条 item，最近 7 天只有 1,616 条。
 *
 * ## 关键设计
 * 1. **一次扫描算出全部周期**：热榜的 4 个周期（12h/24h/week/all）用一条 SQL
 *    的 `COUNT(DISTINCT CASE WHEN ...)` 一起算出来，扫描只发生一次。
 * 2. **结果集必须小**：外层用「各周期各取前 63 的并集」把返回行数压到 ≤252，
 *    避免把几万行聚合中间结果传回 Worker（已验证：7 万行数据下返回 205 行）。
 * 3. **投票统计按模板分组**：每个模板一次查询，结果按格子取前 50。
 *    每个 item 只会被它所属的模板读到一次，所以「算全部模板」的总读取量
 *    约等于一次全表扫描 —— 因此不必只挑热门模板。
 * 4. **非实时可接受**：站点每天只新增约 188 条 item，12 小时刷新一次无感知。
 *
 * ## 部署
 *   cd workers/snapshot-refresh && npx wrangler deploy
 *   npx wrangler secret put REFRESH_TOKEN      # 手动触发用的令牌
 * 手动触发（首次引导 / 排障）：
 *   curl -X POST https://<worker>.workers.dev/refresh -H "Authorization: Bearer <token>"
 */

interface Env {
    DB: D1Database;
    /** 手动触发 /refresh 所需的令牌；未配置则手动触发被禁用 */
    REFRESH_TOKEN?: string;
}

// =============================================================================
// 配置
// =============================================================================

/**
 * 快照键名。**必须与 functions/ 侧读取端保持一致**，
 * 改动时请同时更新：
 *   - functions/api/trending.ts
 *   - functions/api/trending-templates.ts
 */
const SNAPSHOT_KEYS = {
    trending: (period: string) => `trending:${period}`,
    trendingTemplates: 'trending-templates',
} as const;

/** 热榜周期。与前端 Search.vue 里的 tab 一致 */
const TRENDING_PERIODS = ['12h', '24h', 'week', 'all'] as const;

/** 热榜每个周期取前多少名（与旧实现一致） */
const TRENDING_LIMIT = 63;

/** 投票统计每个格子保留的候选数量（与旧实现一致） */
const STATS_TOP_PER_SLOT = 50;

/** 单次刷新最多处理多少个模板（按 saves 数降序） */
const STATS_MAX_TEMPLATES = 400;

/** 投票统计聚合的并发度 */
const STATS_CONCURRENCY = 8;

/** 写入 batch 每次最多多少条语句 */
const WRITE_BATCH_SIZE = 50;

/** 各周期对应的聚合列名 */
const TRENDING_WINDOW_COLUMN: Record<string, string> = {
    '12h': 'c12h',
    '24h': 'c24h',
    'week': 'cWeek',
    'all': 'cAll',
};

// =============================================================================
// 热榜快照
// =============================================================================

/**
 * 一次扫描算出 4 个周期的排名。
 *
 * 已验证的查询计划（本地 SQLite，72 万行数据）：
 *   MATERIALIZE agg
 *   SEARCH si USING INDEX idx_items_category (item_category=?)   ← 唯一一次扫描
 *   ...（后续 4 次 SCAN agg 都发生在内存临时表上）
 *
 * 外层 `id IN (各周期前 63 的并集)` 是为了把返回行数压到 ≤252。
 * 若不这么做，agg 的全部中间结果（线上约数万行）都要传回 Worker。
 */
const TRENDING_SQL = `
WITH agg AS MATERIALIZED (
    SELECT si.bangumi_id AS id,
           MAX(si.character_name) AS name,
           MAX(si.img_url)        AS image,
           COUNT(DISTINCT CASE WHEN s.created_at > strftime('%s','now') - 43200  THEN s.user_hash END) AS c12h,
           COUNT(DISTINCT CASE WHEN s.created_at > strftime('%s','now') - 86400  THEN s.user_hash END) AS c24h,
           COUNT(DISTINCT CASE WHEN s.created_at > strftime('%s','now') - 604800 THEN s.user_hash END) AS cWeek,
           COUNT(DISTINCT s.user_hash) AS cAll
    FROM save_items si
    JOIN saves s ON si.save_id = s.id
    WHERE si.item_category = 'character'
    GROUP BY si.bangumi_id
)
SELECT id, name, image, c12h, c24h, cWeek, cAll
FROM agg
WHERE id IN (
    SELECT id FROM (SELECT id FROM agg WHERE c12h  > 0 ORDER BY c12h  DESC LIMIT ${TRENDING_LIMIT})
    UNION
    SELECT id FROM (SELECT id FROM agg WHERE c24h  > 0 ORDER BY c24h  DESC LIMIT ${TRENDING_LIMIT})
    UNION
    SELECT id FROM (SELECT id FROM agg WHERE cWeek > 0 ORDER BY cWeek DESC LIMIT ${TRENDING_LIMIT})
    UNION
    SELECT id FROM (SELECT id FROM agg WHERE cAll  > 0 ORDER BY cAll  DESC LIMIT ${TRENDING_LIMIT})
)
`;

interface TrendingRow {
    id: number;
    name: string;
    image: string | null;
    c12h: number;
    c24h: number;
    cWeek: number;
    cAll: number;
}

interface TrendingItem {
    name: string;
    id: number;
    image: string | null;
    count: number;
}

async function refreshTrending(db: D1Database): Promise<{ aggRows: number; written: number }> {
    const { results } = await db.prepare(TRENDING_SQL).all<TrendingRow>();

    const now = Math.floor(Date.now() / 1000);
    const statements = TRENDING_PERIODS.map((period) => {
        const column = TRENDING_WINDOW_COLUMN[period];
        const top: TrendingItem[] = results
            .filter((row) => (row[column as keyof TrendingRow] as number) > 0)
            .sort(
                (a, b) =>
                    (b[column as keyof TrendingRow] as number) -
                    (a[column as keyof TrendingRow] as number),
            )
            .slice(0, TRENDING_LIMIT)
            .map((row) => ({
                name: row.name,
                id: row.id,
                image: row.image,
                count: row[column as keyof TrendingRow] as number,
            }));

        return db
            .prepare(
                'INSERT OR REPLACE INTO snapshot_cache (key, data, updated_at) VALUES (?, ?, ?)',
            )
            .bind(SNAPSHOT_KEYS.trending(period), JSON.stringify(top), now);
    });

    await db.batch(statements);
    return { aggRows: results.length, written: statements.length };
}

// =============================================================================
// 热门模板快照
// =============================================================================

async function refreshTrendingTemplates(db: D1Database): Promise<{ written: number }> {
    const { results } = await db
        .prepare(
            `SELECT template_id AS id, COUNT(*) AS count
             FROM saves
             GROUP BY template_id
             ORDER BY count DESC
             LIMIT 100`,
        )
        .all<{ id: string; count: number }>();

    await db
        .prepare(
            'INSERT OR REPLACE INTO snapshot_cache (key, data, updated_at) VALUES (?, ?, ?)',
        )
        .bind(
            SNAPSHOT_KEYS.trendingTemplates,
            JSON.stringify(results),
            Math.floor(Date.now() / 1000),
        )
        .run();

    return { written: results.length };
}

// =============================================================================
// 投票统计快照
// =============================================================================

/**
 * 单个模板的投票统计。
 *
 * 用窗口函数在 SQL 里就截到「每个格子前 50」，避免把该模板的全部
 * (slot, character) 组合都传回来。
 * 注意：不能对 `COUNT(DISTINCT ...)` 直接用窗口函数（SQLite 不支持），
 * 所以先聚合出 votes，再对聚合结果做 ROW_NUMBER。
 */
const TEMPLATE_STATS_SQL = `
WITH agg AS (
    SELECT i.slot_label      AS slot,
           i.character_name  AS cname,
           i.bangumi_id      AS bid,
           MAX(i.img_url)    AS img,
           COUNT(DISTINCT s.user_hash) AS votes
    FROM saves s
    JOIN save_items i ON i.save_id = s.id
    WHERE s.template_id = ?
    GROUP BY i.slot_label, i.character_name
),
ranked AS (
    SELECT slot, cname, bid, img, votes,
           ROW_NUMBER() OVER (PARTITION BY slot ORDER BY votes DESC) AS rn
    FROM agg
)
SELECT slot, cname, bid, img, votes
FROM ranked
WHERE rn <= ?
`;

interface StatsRow {
    slot: string;
    cname: string;
    bid: number | null;
    img: string | null;
    votes: number;
}

type StatsBySlot = Record<
    string,
    Array<{ name: string; id: number | null; image: string | null; count: number }>
>;

async function computeTemplateStats(db: D1Database, templateId: string): Promise<StatsBySlot> {
    const { results } = await db
        .prepare(TEMPLATE_STATS_SQL)
        .bind(templateId, STATS_TOP_PER_SLOT)
        .all<StatsRow>();

    const bySlot: StatsBySlot = {};
    for (const row of results) {
        if (!bySlot[row.slot]) bySlot[row.slot] = [];
        bySlot[row.slot].push({
            name: row.cname,
            id: row.bid,
            image: row.img,
            count: row.votes,
        });
    }
    return bySlot;
}

async function refreshStats(
    db: D1Database,
    maxTemplates: number,
): Promise<{ templates: number }> {
    const { results: templates } = await db
        .prepare(
            `SELECT template_id, COUNT(*) AS saves
             FROM saves
             GROUP BY template_id
             ORDER BY saves DESC
             LIMIT ?`,
        )
        .bind(maxTemplates)
        .all<{ template_id: string; saves: number }>();

    const now = Math.floor(Date.now() / 1000);
    const cacheWrites: D1PreparedStatement[] = [];

    for (let i = 0; i < templates.length; i += STATS_CONCURRENCY) {
        const chunk = templates.slice(i, i + STATS_CONCURRENCY);
        const computed = await Promise.all(
            chunk.map((t) => computeTemplateStats(db, t.template_id)),
        );

        for (let j = 0; j < chunk.length; j++) {
            cacheWrites.push(
                db
                    .prepare(
                        'INSERT OR REPLACE INTO statistics_cache (template_id, period, data, updated_at) VALUES (?, ?, ?, ?)',
                    )
                    // period 固定为 'all'：/api/stats 只会请求这一档
                    .bind(chunk[j].template_id, 'all', JSON.stringify(computed[j]), now),
            );
        }
    }

    for (let i = 0; i < cacheWrites.length; i += WRITE_BATCH_SIZE) {
        await db.batch(cacheWrites.slice(i, i + WRITE_BATCH_SIZE));
    }

    return { templates: cacheWrites.length };
}

// =============================================================================
// 主流程
// =============================================================================

interface RefreshOutcome {
    trigger: string;
    at: string;
    ms: number;
    trending?: { aggRows: number; written: number };
    trendingTemplates?: { written: number };
    stats?: { templates: number };
    /** 本次刷新中失败的任务；非空表示这次刷新不完整 */
    failures: Array<{ task: string; error: string }>;
}

async function runRefresh(env: Env, trigger: string): Promise<RefreshOutcome> {
    const startedAt = Date.now();
    const outcome: RefreshOutcome = {
        trigger,
        at: new Date(startedAt).toISOString(),
        ms: 0,
        failures: [],
    };

    // 三个任务各自兜住异常：某一个失败不应该丢掉已经算好的其它快照。
    // 失败会记进 outcome.failures，由调用方决定是否上报为失败。
    try {
        outcome.trending = await refreshTrending(env.DB);
    } catch (error) {
        outcome.failures.push({ task: 'trending', error: String(error) });
        console.error('[snapshot-refresh] trending failed:', error);
    }

    try {
        outcome.trendingTemplates = await refreshTrendingTemplates(env.DB);
    } catch (error) {
        outcome.failures.push({ task: 'trending-templates', error: String(error) });
        console.error('[snapshot-refresh] trending-templates failed:', error);
    }

    try {
        outcome.stats = await refreshStats(env.DB, STATS_MAX_TEMPLATES);
    } catch (error) {
        outcome.failures.push({ task: 'stats', error: String(error) });
        console.error('[snapshot-refresh] stats failed:', error);
    }

    outcome.ms = Date.now() - startedAt;
    console.log('[snapshot-refresh]', JSON.stringify(outcome));
    return outcome;
}

function isAuthorized(request: Request, env: Env): boolean {
    const expected = env.REFRESH_TOKEN;
    // 未配置令牌时禁用手动触发，避免被随意调用（每次调用都要花掉额度）
    if (!expected) return false;
    return request.headers.get('authorization') === `Bearer ${expected}`;
}

export default {
    /** 定时触发：由 wrangler.toml 的 [triggers] crons 驱动 */
    async scheduled(_controller, env, ctx) {
        ctx.waitUntil(
            runRefresh(env, 'cron').then((outcome) => {
                // 只要有任务失败就把整次运行标记为失败，
                // 这样它在 Cloudflare dashboard / 告警里是可见的，
                // 而不是静默地「半成功」——快照陈旧是很难被发现的故障。
                if (outcome.failures.length > 0) {
                    throw new Error(
                        `snapshot refresh incomplete: ${JSON.stringify(outcome.failures)}`,
                    );
                }
            }),
        );
    },

    /** 手动触发：仅用于首次引导和排障，需要 Bearer REFRESH_TOKEN */
    async fetch(request, env) {
        let url: URL;
        try {
            url = new URL(request.url);
        } catch {
            return new Response('Malformed request URL', { status: 400 });
        }

        if (url.pathname !== '/refresh') {
            return new Response('Not found', { status: 404 });
        }
        if (!isAuthorized(request, env)) {
            return new Response('Unauthorized', { status: 401 });
        }
        if (request.method !== 'POST') {
            return new Response('Use POST', { status: 405 });
        }

        const result = await runRefresh(env, 'manual');
        return new Response(JSON.stringify(result, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
    },
} satisfies ExportedHandler<Env>;

