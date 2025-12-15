interface Env {
    DB: D1Database;
}

interface CreateTemplateRequest {
    title: string;
    type?: 'grid' | 'bingo' | 'tier';
    config: {
        cols: number;
        items: string[];
    };
}

function generateShortId(length = 5): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    try {
        const body = await request.json() as CreateTemplateRequest;

        if (!body.title || !body.config || !Array.isArray(body.config.items)) {
            return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
        }

        const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
        const SALT = 'ugc-salt-v1';
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + SALT));
        const authorHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

        let id = generateShortId();
        let retries = 3;
        while (retries > 0) {
            try {
                await env.DB.prepare(
                    'INSERT INTO custom_templates (id, type, title, author_ip_hash, config, created_at) VALUES (?, ?, ?, ?, ?, ?)'
                ).bind(
                    id,
                    body.type || 'grid',
                    body.title,
                    authorHash,
                    JSON.stringify(body.config),
                    Math.floor(Date.now() / 1000)
                ).run();
                break;
            } catch (e: any) {
                if (e.message && e.message.includes('UNIQUE constraint failed')) {
                    id = generateShortId();
                    retries--;
                } else {
                    throw e;
                }
            }
        }

        if (retries === 0) {
            return new Response(JSON.stringify({ error: 'Failed to generate ID' }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true, id }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
