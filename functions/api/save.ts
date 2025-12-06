interface Env {
    DB: D1Database;
}

interface SaveRequest {
    templateId: string;
    customTitle?: string; // NEW
    items: Array<{
        label: string,
        imgUrl?: string,
        character?: {
            name: string,
            image?: string // From frontend type
        }
    }>;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    try {
        const body = await request.json() as SaveRequest;
        const { templateId, customTitle, items } = body;

        if (!templateId || !Array.isArray(items)) {
            return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
        }

        // Generate strict UUID
        const saveId = crypto.randomUUID();

        // Prepare Batch Statements
        const statements = [];

        // 1. Insert Main Record
        statements.push(
            env.DB.prepare(
                'INSERT INTO saves (id, template_id, custom_title) VALUES (?, ?, ?)'
            ).bind(saveId, templateId, customTitle || null)
        );

        // 2. Insert Items (Only those with characters)
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.character && item.character.name) {
                // Prefer explicit imgUrl, fallback to character.image if available
                const imgUrl = item.imgUrl || item.character.image || null;

                statements.push(
                    env.DB.prepare(
                        'INSERT INTO save_items (save_id, slot_index, slot_label, character_name, img_url) VALUES (?, ?, ?, ?, ?)'
                    ).bind(saveId, i, item.label, item.character.name, imgUrl)
                );
            }
        }

        // Execute Transaction
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
