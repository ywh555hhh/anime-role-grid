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

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { params, env } = context
    const templateId = params.templateId as string

    try {
        let url: URL
        try {
            url = new URL(context.request.url)
        } catch {
            return new Response(JSON.stringify({ error: 'Malformed request URL' }), { status: 400 })
        }
        const period = url.searchParams.get('period') || 'all'

        if (!templateId) {
            return new Response(JSON.stringify({ error: 'Missing template ID' }), { status: 400 })
        }

        // 1. 先读缓存。(template_id, period) 是主键，命中只读 1 行。
        const cached = await env.DB.prepare(
            'SELECT data, updated_at FROM statistics_cache WHERE template_id = ? AND period = ?'
        ).bind(templateId, period).first<{ data: string; updated_at: number }>()

        if (cached && typeof cached.data === 'string') {
            const age = Math.floor(Date.now() / 1000) - (cached.updated_at || 0)
            if (age >= 0 && age < CACHE_TTL_SECONDS) {
                return new Response(cached.data, {
                    headers: {
                        'Content-Type': 'application/json',
                        // 浏览器/边缘只需缓存到本条数据过期为止
                        'Cache-Control': `public, max-age=${Math.max(60, CACHE_TTL_SECONDS - age)}`,
                        'X-Stats-Cache': 'HIT',
                    },
                })
            }
        }

        // 2. 未命中或已过期 → 重算（updateStats 内部会写回缓存）
        const freshData = await updateStats(env, templateId, period)
        return new Response(JSON.stringify(freshData), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
                'X-Stats-Cache': cached ? 'STALE' : 'MISS',
            },
        })
    } catch (err: any) {
        console.error('[Stats API] Fatal Error', err)
        // 不再把 stack 返回给客户端
        return new Response(JSON.stringify({ error: 'Failed to load statistics' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}

// The Heavy Lifter
async function updateStats(env: Env, templateId: string, period: string) {
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

    const { results } = await env.DB.prepare(sql).bind(templateId).all()

    // Process results in JS to group by slot
    const statsBySlot: Record<string, any[]> = {}

    if (!results) return {} // Graceful exit

    for (const row of results) {
        const label = row.slot_label as string
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
