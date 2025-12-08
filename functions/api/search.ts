export const onRequestPost = async (context: any) => {
    const { request } = context;

    try {
        // Read the body from the client
        const body = await request.json();
        const { searchMode, ...bangumiPayload } = body; // Extract searchMode, leave the rest for Bangumi

        // Determine correct endpoint
        // Default to characters if not specified or invalid (safety fallback)
        // Determine correct endpoint
        // Default to characters if not specified or invalid (safety fallback)
        let targetUrl = 'https://api.bgm.tv/v0/search/characters';

        if (searchMode === 'subject') {
            targetUrl = 'https://api.bgm.tv/v0/search/subjects';
        } else if (searchMode === 'person') {
            targetUrl = 'https://api.bgm.tv/v0/search/persons';
        }

        // Get the client's auth header
        const authHeader = request.headers.get('Authorization');

        // Forward to Bangumi
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader || '',
                // Use a fixed User-Agent for the proxy to ensure compliance
                'User-Agent': 'AnimeGrid/1.0 (https://github.com/ywh555hhh/anime-role-grid)',
            },
            body: JSON.stringify(bangumiPayload),
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Allow CORS
            },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
