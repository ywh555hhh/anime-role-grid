/**
 * 统计结果缓存时长（秒）。
 *
 * 为什么要缓存：重算一次要全量扫描 save_items（实测约 791,290 行），
 * 而 D1 免费额度只有 5,000,000 行/天 —— 也就是**一天最多只够算 6 次**。
 * 在此之前这个文件的缓存读取被注释掉了（调试残留），导致每个请求都重算，
 * 实测每天因此消耗约 2 亿行。
 *
 * 为什么取 6 小时：统计是「大家填了什么」榜单，不需要实时；
 * 而线上每天只有约 7 个不同的 (模板, 周期) 被请求，请求间隔远大于短 TTL，
 * 因此短 TTL 几乎不起作用。6 小时是「能真正减少重算」与「可接受的新鲜度」的折中。
 *
 * 注意：这只是止血。要让这个接口真正廉价，必须改写查询本身。
 */
const CACHE_TTL_SECONDS = 21600

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
