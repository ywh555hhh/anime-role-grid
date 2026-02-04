interface Env {
    DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { env, request } = context;

    try {
        const url = new URL(request.url);

        // We can support period filtering if needed, but for "All time popular" we just count everything
        // Or we can default to 'all'

        const stmt = env.DB.prepare(`
            SELECT 
                template_id as id,
                COUNT(*) as count
            FROM saves
            GROUP BY template_id
            ORDER BY count DESC
            LIMIT 100
        `);

        const { results } = await stmt.all();

        return new Response(JSON.stringify({ results }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60' // Cache for 1 min
            }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
