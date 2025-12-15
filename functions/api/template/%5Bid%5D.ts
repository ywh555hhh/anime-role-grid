interface Env {
    DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { params, env } = context;
    const id = params.id as string;

    if (!id) {
        return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });
    }

    try {
        const result = await env.DB.prepare(
            'SELECT type, title, config, created_at FROM custom_templates WHERE id = ?'
        ).bind(id).first();

        if (!result) {
            return new Response(JSON.stringify({ error: 'Template not found' }), { status: 404 });
        }

        return new Response(JSON.stringify(result), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600'
            }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
