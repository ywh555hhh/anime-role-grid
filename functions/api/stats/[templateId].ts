/**
 * 统计结果的“新鲜”阈值（秒）。
 *
 * 为什么是 26 小时而不是 6 小时：
 *   统计快照由 workers/snapshot-refresh 每 **24 小时**（UTC 00:15）批量重算一次。
 *   如果这里的 TTL 小于 cron 周期（比如 6 小时），那么每天 cron 之间的那些小时里，
 *   快照会被判定为「过期」而触发按需重算 —— 明明数据下一秒就会被 cron 刷新，
 *   却先花掉一次查询。TTL 必须**大于** cron 周期，否则这套预计算设计就白做了。
 *   取 26 小时 = 24 小时 cron 周期 + 2 小时余量。
 *
 * 新鲜度代价：用户新投的一票最多可能 26 小时才出现在榜单上。可以接受：
 *   站点每天只新增约 188 条 item（共 79 万条），榜单排名变化极慢。
 *
 * 兜底：若某个模板不在快照里（新建的、或排名在预计算范围之外），
 *   这里会按需重算。这个查询在加上 idx_items_save_id 后已变为
 *   「SEARCH s USING INDEX idx_saves_template」+「SEARCH i USING INDEX idx_items_save_id」，
 *   读取量与该模板的 item 数成正比，不再是全表扫描。
 */
const CACHE_TTL_SECONDS = 93600

/** 边缘缓存条目的新鲜窗口：与上面的阈值对齐（数据库里的行新鲜，缓存就新鲜） */
const FRESH_TTL_SECONDS = CACHE_TTL_SECONDS

/**
 * 缓存条目存活时间（秒）：7 天。
 *
 * 刻意远长于 FRESH_TTL_SECONDS —— 回源失败时（D1 额度耗尽、故障）
 * 缓存里还留着上一次成功的快照可以顶上，也就是 stale-if-error 语义：
 * **宁可给用户旧数据，也不要给 500。**
 */
const CACHE_ENTRY_TTL_SECONDS = 604800

/** 返回给浏览器的缓存时长（秒）。取短值，让刷新能较快看到新数据 */
const CLIENT_MAX_AGE_SECONDS = 300

/** 记录这份数据是什么时候取到的，用于判断缓存条目是否仍新鲜 */
const HEADER_FETCHED_AT = 'x-snapshot-fetched-at'

/** 观测标记 */
const HEADER_STATUS = 'X-Stats-Cache'
const HEADER_SOURCE = 'X-Stats-Source'

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { params, env } = context
    const templateId = params.templateId as string

    try {
        let url: URL
        try {
            url = new URL(context.request.url)
        } catch {
            return jsonError(400, 'Malformed request URL')
        }
        const period = url.searchParams.get('period') || 'all'

        if (!templateId) {
            return jsonError(400, 'Missing template ID')
        }

        const cache = caches.default
        const cacheKey = new Request(`https://stats-cache.internal/${templateId}/${period}`, {
            method: 'GET',
        })
        const cached = await cache.match(cacheKey)

        // 1) 边缘缓存仍新鲜 → 直接返回，完全不碰 D1
        if (cached && isFresh(cached)) {
            return forClient(cached, 'HIT')
        }

        // 2) 取数：优先读快照表，没有/过期才按需重算
        try {
            const { data, source } = await getStats(env, templateId, period)
            const response = buildResponse(data, source)
            await putCache(cacheKey, response)
            return forClient(response, cached ? 'REFRESH' : 'MISS')
        } catch (error) {
            // 3) 取数失败 → 降级到旧快照，而不是报 500
            console.error(
                `[Stats] 取数失败，尝试降级到旧快照 template=${templateId} period=${period}:`,
                error,
            )
            if (cached) return forClient(cached, 'STALE-DB-ERROR')
            return jsonError(503, 'Statistics are temporarily unavailable')
        }
    } catch (error) {
        console.error('[Stats] unexpected failure:', error)
        // 不再把 stack 返回给客户端
        return jsonError(500, 'Failed to load statistics')
    }
}

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
    })
}

function isFresh(response: Response): boolean {
    const fetchedAt = Number(response.headers.get(HEADER_FETCHED_AT) || 0)
    if (!Number.isFinite(fetchedAt) || fetchedAt <= 0) return false
    const age = Math.floor(Date.now() / 1000) - fetchedAt
    return age >= 0 && age < FRESH_TTL_SECONDS
}

/**
 * 写边缘缓存：显式 await，且不静默吞错误。
 * 详见 functions/api/trending.ts 里同名函数的注释。
 */
async function putCache(key: Request, response: Response): Promise<void> {
    try {
        await caches.default.put(key, response.clone())
    } catch (error) {
        console.error('[Stats] 写边缘缓存失败:', error)
    }
}

function forClient(response: Response, status: string): Response {
    const out = new Response(response.body, {
        status: response.status,
        headers: new Headers(response.headers),
    })
    // 长 TTL 只用于内部缓存条目的存活，不应让浏览器缓存一周
    out.headers.set('Cache-Control', `public, max-age=${CLIENT_MAX_AGE_SECONDS}`)
    out.headers.set(HEADER_STATUS, status)
    return out
}

function buildResponse(data: unknown, source: string): Response {
    return new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_ENTRY_TTL_SECONDS}`,
            [HEADER_FETCHED_AT]: String(Math.floor(Date.now() / 1000)),
            [HEADER_SOURCE]: source,
        },
    })
}

/**
 * 取统计数据：优先用快照表，没有/过期才按需重算。
 *
 * @returns data 为给前端的结构；source 标记来源（ROW=快照表，COMPUTED=本次重算）
 */
async function getStats(
    env: Env,
    templateId: string,
    period: string,
): Promise<{ data: unknown; source: 'ROW' | 'COMPUTED' }> {
    // 1) 读快照表。(template_id, period) 是主键，命中只读 1 行。
    const row = await env.DB.prepare(
        'SELECT data, updated_at FROM statistics_cache WHERE template_id = ? AND period = ?',
    )
        .bind(templateId, period)
        .first<{ data: string; updated_at: number }>()

    if (row && typeof row.data === 'string') {
        const age = Math.floor(Date.now() / 1000) - (row.updated_at || 0)
        if (age >= 0 && age < CACHE_TTL_SECONDS) {
            try {
                return { data: JSON.parse(row.data) as unknown, source: 'ROW' }
            } catch (error) {
                // 快照内容坏了：不要返回坏数据，改为重算
                console.error(
                    `[Stats] 快照 JSON 解析失败 template=${templateId} period=${period}，改为重算:`,
                    error,
                )
            }
        }
    }

    // 2) 没有 / 已过期 / 解析失败 → 重算（updateStats 内部会写回快照表）
    return { data: await updateStats(env, templateId, period), source: 'COMPUTED' }
}

interface StatsRow {
    slot_label: string
    character_name: string
    bangumi_id: number | null
    img_url: string | null
    vote_count: number
}

interface StatsCandidate {
    name: string
    id: number | null
    image: string | null
    count: number
}

/** 形如 { [格子标签]: 候选列表 } */
type StatsBySlot = Record<string, StatsCandidate[]>

// The Heavy Lifter
async function updateStats(env: Env, templateId: string, period: string): Promise<StatsBySlot> {
    // Only 'total' (all) is supported now per user request
    // No time filter needed for 'all'

    const sql = `
    SELECT 
        i.slot_label, 
        i.character_name, 
        i.bangumi_id, 
        i.img_url,
        COUNT(DISTINCT s.user_hash) as vote_count
    FROM save_items i
    JOIN saves s ON i.save_id = s.id
    WHERE s.template_id = ? 
    GROUP BY i.slot_label, i.character_name
    HAVING vote_count > 0
    ORDER BY i.slot_label, vote_count DESC
  `

    const { results } = await env.DB.prepare(sql).bind(templateId).all<StatsRow>()

    // Process results in JS to group by slot
    const statsBySlot: StatsBySlot = {}

    for (const row of results) {
        const label = row.slot_label
        if (!statsBySlot[label]) statsBySlot[label] = []

        // Limit to Top 50 per slot
        if (statsBySlot[label].length < 50) {
            statsBySlot[label].push({
                name: row.character_name,
                id: row.bangumi_id,
                image: row.img_url,
                count: row.vote_count
            })
        }
    }

    const jsonString = JSON.stringify(statsBySlot)

    // Write back to cache
    await env.DB.prepare(
        `INSERT OR REPLACE INTO statistics_cache (template_id, period, data, updated_at) VALUES (?, ?, ?, ?)`
    ).bind(templateId, period, jsonString, Math.floor(Date.now() / 1000)).run()

    return statsBySlot
}

interface Env {
    DB: D1Database
}
