interface Env {
    DB: D1Database;
}

interface SaveRequest {
    templateId: string;
    customTitle?: string;
    items: Array<{
        label: string,
        imgUrl?: string,
        character?: {
            name: string,
            image?: string,
            bangumiId?: number,
            category?: string,
            subjectType?: string
        }
    }>;
}

/**
 * Identify device type from User Agent
 */
function getDeviceType(userAgent: string | null): string {
    if (!userAgent) return 'Unknown';
    if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
        return 'Mobile';
    }
    return 'Desktop';
}

/**
 * Generate privacy-preserving hash from IP
 * Uses SHA-256 with a static salt
 */
async function generateUserHash(ip: string, env: any): Promise<string> {
    if (!env || !env.PRIVACY_SALT) {
        throw new Error('FATAL: PRIVACY_SALT is not configured. refusing to save data.');
    }
    const SALT = env.PRIVACY_SALT;
    const msgBuffer = new TextEncoder().encode(ip + SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    try {
        const body = await request.json() as SaveRequest;
        const { templateId, customTitle, items } = body;

        if (!templateId || !Array.isArray(items)) {
            return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
        }

        // 1. Collect Metadata
        const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
        const userAgent = request.headers.get('User-Agent');
        const referer = request.headers.get('Referer');

        // 2. Compute Privacy Data
        const userHash = await generateUserHash(ip, env);
        const deviceType = getDeviceType(userAgent);

        // 3. Generate ID
        const saveId = crypto.randomUUID();

        // 4. Prepare Database Ops
        const statements = [];

        // Insert Main Record with Analytics Data
        statements.push(
            env.DB.prepare(
                'INSERT INTO saves (id, template_id, custom_title, user_hash, device_type, referer) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(saveId, templateId, customTitle || null, userHash, deviceType, referer || null)
        );

        // Insert Items
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.character && item.character.name) {
                let imgUrl = item.imgUrl || item.character.image || null;

                // OPTIMIZATION: Do not save Base64 data to D1 to save space
                if (imgUrl && imgUrl.startsWith('data:image')) {
                    imgUrl = null;
                }

                // V3 Analytics Data
                const bangumiId = item.character.bangumiId || null;
                const category = item.character.category || null;
                const subjectType = item.character.subjectType || null;

                statements.push(
                    env.DB.prepare(
                        'INSERT INTO save_items (save_id, slot_index, slot_label, character_name, img_url, bangumi_id, item_category, subject_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                    ).bind(saveId, i, item.label, item.character.name, imgUrl, bangumiId, category, subjectType)
                );
            }
        }

        // Execute
        if (statements.length > 0) {
            await env.DB.batch(statements);
        }

        return new Response(JSON.stringify({ success: true, id: saveId }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
