export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { params, env } = context
    const templateId = params.templateId as string
    const url = new URL(context.request.url)
    const period = url.searchParams.get('period') || 'all'

    console.log(`[Stats API] Request for ${templateId}, period=${period}`)

    try {
        if (!templateId) {
            return new Response(JSON.stringify({ error: 'Missing template ID' }), { status: 400 })
        }

        // 1. Try to get from Cache (DISABLED FOR DEBUGGING)
        const cacheKey = `${templateId}_${period}`
        console.log(`[Stats API] Request for ${templateId}, period=${period}`)

        // FORCE FRESH
        // let cached = null;
        // ... cache read logic commented out ...

        /* 
        if (cached && typeof cached.data === 'string') {
             // ... cache hit logic ...
             return new Response(cached.data, ...)
        }
        */

        // 3. Scenario B: Miss (Always for now)
        console.log('[Stats API] Cache Skipped (Debug Check) -> Computing...')

        // 3. Scenario B: Miss (First time ever)
        console.log('[Stats API] Cache Miss -> Computing...')
        const freshData = await updateStats(env, templateId, period)
        console.log('[Stats API] Computation Done')
        return new Response(JSON.stringify(freshData), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (err: any) {
        console.error('[Stats API] Fatal Error', err)
        return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
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
