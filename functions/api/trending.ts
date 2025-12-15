interface Env {
    DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { env, request } = context;

    try {
        const url = new URL(request.url);
        const period = url.searchParams.get('period') || '24h';

        let timeCondition = '';
        let limit = 30;

        // Logic for different periods
        if (period === '12h') {
            timeCondition = "AND s.created_at > (strftime('%s', 'now') - 43200)"; // 12 * 3600
        } else if (period === '24h') {
            timeCondition = "AND s.created_at > (strftime('%s', 'now') - 86400)";
        } else if (period === 'week') {
            timeCondition = "AND s.created_at > (strftime('%s', 'now') - 604800)"; // 7 * 24 * 3600
        } else if (period === 'all') {
            timeCondition = ""; // No time filter
        } else {
            // Fallback to 24h
            timeCondition = "AND s.created_at > (strftime('%s', 'now') - 86400)";
        }

        const stmt = env.DB.prepare(`
            SELECT 
                si.character_name as name, 
                si.bangumi_id as id, 
                si.img_url as image, -- Note: This might be NULL if it was a custom base64, but for Bangumi items it's a URL
                COUNT(*) as count
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

        // If no results (e.g. fresh DB), return empty list or maybe distinct random items? 
        // For now just return what we have.

        return new Response(JSON.stringify({ results }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60' // Cache for 1 min (Updates often)
            }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
