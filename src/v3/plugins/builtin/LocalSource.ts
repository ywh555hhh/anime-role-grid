import type { ISource, SourceItem, SourceResult } from '../../platform/contracts';
import { SourceCapability } from '../../platform/schemas/asset';

export class LocalSource implements ISource {
    id = 'builtin.sources.local';
    name = 'Local Files';

    capabilities = {
        [SourceCapability.Search]: false,
        [SourceCapability.Pagination]: false,
        [SourceCapability.Recommend]: false,
        [SourceCapability.Upload]: true
    };

    // Local source doesn't search in the traditional sense.
    // The UI handles the drop/crop logic directly when this source is active.
    async search(_query: string, _page: number, _options?: Record<string, any>): Promise<SourceResult> {
        return { items: [], total: 0, hasMore: false };
    }

    normalize(item: SourceItem): Record<string, any> {
        return {
            Visual: {
                src: item.thumbnail, // This will be the Data URL (base64)
                label: item.title,
                origin: 'local'
            },
            Meta: {
                description: 'User Uploaded Image'
            }
        };
    }
}
