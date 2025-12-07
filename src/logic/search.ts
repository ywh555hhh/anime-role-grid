import type { BgmCharacterSearchResultItem, BgmSubjectSearchResultItem } from '~/types'

// 从环境变量中获取敏感信息
const accessToken = import.meta.env.VITE_BANGUMI_ACCESS_TOKEN
const userAgent = import.meta.env.VITE_BANGUMI_USER_AGENT

export class SearchError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'SearchError'
    }
}

// 搜索函数
export async function useBgmSearch(
    keyword: string,
    offset = 0,
    searchType: 'character' | 'anime' | 'manga' | 'novel' | 'game' = 'character',
    year?: string
) {
    if (!keyword)
        return []

    // 检查凭证是否存在
    if (!accessToken || !userAgent || accessToken === 'YOUR_REAL_BANGUMI_ACCESS_TOKEN') {
        throw new SearchError('请在 .env 文件中配置正确的 Bangumi Access Token 和 User Agent。')
    }

    try {
        const isCharacter = searchType === 'character'

        // Determine API Path
        const apiPath = isCharacter
            ? 'https://api.bgm.tv/v0/search/characters'
            : 'https://api.bgm.tv/v0/search/subjects' // All ACG items use subjects API

        // To be safe for Local Dev:
        const finalUrl = import.meta.env.PROD
            ? '/api/search' // WARNING: This might hardcode to characters if backend isn't changed.
            : apiPath

        // Determine Filter
        // Type IDs: 1=Book, 2=Anime, 3=Music, 4=Game, 6=Real
        let filterType: number[] = [1] // Default

        switch (searchType) {
            case 'character': filterType = [1]; break; // Character API uses type 1 for chars
            case 'anime': filterType = [2]; break;
            case 'manga': filterType = [1]; break; // Book
            case 'novel': filterType = [1]; break; // Book
            case 'game': filterType = [4]; break;
        }

        const filter = { type: filterType }

        const res = await fetch(finalUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                keyword,
                filter,
                offset,
                limit: 20,
            }),
        })

        if (!res.ok) {
            if (res.status === 401) {
                throw new SearchError('API 认证失败 (401)。请检查 Access Token 是否过期或无效。')
            }
            throw new SearchError(`API 请求失败: ${res.status} ${res.statusText}`)
        }

        const result = await res.json()
        let items = (result.data || []) as (BgmCharacterSearchResultItem | BgmSubjectSearchResultItem)[]

        // Client-side Filtering Logic
        if (!isCharacter) {
            items = items.filter(item => {
                const subject = item as BgmSubjectSearchResultItem

                // 1. Year Filter (Anime / Game)
                if (year) {
                    if (!subject.date || !subject.date.startsWith(year)) {
                        return false
                    }
                }

                // 2. Platform Filter (Manga vs Novel)
                // Both are Type 1 (Book). We must use 'platform' field to distinguish.
                if (searchType === 'manga') {
                    return subject.platform === '漫画'
                }

                if (searchType === 'novel') {
                    return subject.platform === '小说'
                }

                return true
            })
        }

        return items
    } catch (error: any) {
        if (error instanceof SearchError) {
            throw error
        }
        throw new SearchError(`网络或未知错误: ${error.message}`)
    }
}
