import type { ISource, SourceItem, SourceResult } from '../../platform/contracts';
import { SourceCapability } from '../../platform/schemas/asset';
import { useBgmSearch } from '../../../logic/search';

export class BangumiSource implements ISource {
    id = 'builtin.sources.bangumi';
    name = 'Bangumi 番组计划';

    capabilities = {
        [SourceCapability.Search]: true,
        [SourceCapability.Pagination]: true,
        [SourceCapability.Recommend]: true, // New in V3
        [SourceCapability.Upload]: false
    };

    async search(query: string, page: number, options?: Record<string, any>): Promise<SourceResult> {
        console.log(`[Bangumisource] Searching: ${query}`, options);

        // Extract type from options, default to 'character'
        const type = options?.type || 'character';
        const year = options?.year;

        try {
            const data = await useBgmSearch(query, page, type, year);

            // Map to SourceItem
            const items: SourceItem[] = data.items ? data.items.map((item: any) => ({
                id: String(item.id),
                title: item.name_cn || item.name,
                thumbnail: item.images?.medium || item.images?.large || item.images?.common,
                // Keep original metadata
                original: item
            })) : [];

            return {
                items,
                total: data.total || 0,
                hasMore: (data.total || 0) > (page * 20)
            };
        } catch (e) {
            console.error(e);
            return {
                items: [],
                total: 0,
                hasMore: false
            };
        }
    }

    async recommend(options?: Record<string, any>): Promise<SourceItem[]> {
        const period = options?.period || 'week';

        // Use the same endpoint as V1
        // Note: In local dev, this proxies to the backend. In prod, it should be handled by functions.
        try {
            const res = await fetch(`/api/trending?period=${period}`);
            if (!res.ok) {
                console.warn('[BangumiSource] Trending API failed, falling back to empty.');
                return [];
            }
            const data = await res.json();
            const results = data.results || [];

            return results.map((item: any) => ({
                id: item.id?.toString() ?? '0',
                title: item.name || 'Unknown',
                // Handle V1 and Bangumi image formats
                thumbnail: item.images?.large || item.images?.common || item.images?.grid || item.image,
                original: item
            }));
        } catch (e) {
            console.error('[BangumiSource] Failed to fetch trending:', e);
            return [];
        }
    }

    normalize(item: SourceItem): Record<string, any> {
        const original = item.original;
        // Return ECS Components
        return {
            Visual: {
                src: item.thumbnail,
                label: item.title,
                origin: 'bangumi'
            },
            Meta: {
                originId: original?.id,
                description: original?.name_cn
            }
        };
    }
}
