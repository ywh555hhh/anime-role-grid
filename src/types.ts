// bangumi-anime-grid character version

// 从 POST /v0/search/characters 返回的数据类型
export interface BgmCharacterSearchResultItem {
    id: number;
    name: string;
    relation: string;
    actors: {
        name: string;
    }[];
    images: {
        small: string;
        grid: string;
        large: string;
        medium: string;
    };
}

export interface BgmSubjectSearchResultItem {
    id: number;
    name: string;
    name_cn: string;
    date?: string; // e.g. "2023-09-29"
    platform?: string; // e.g. "TV", "漫画", "小说", "游戏"
    type?: number; // 2=Anime, 1=Book, 4=Game
    rank?: number;
    score?: number;
    images: {
        small: string;
        grid: string;
        large: string;
        medium: string;
        common: string;
    };
}

export interface BgmPersonSearchResultItem {
    id: number;
    name: string;
    type: number; // 1 = Individual, 2 = Corp, etc.
    images: {
        small: string;
        grid: string;
        large: string;
        medium: string;
    };
    career?: string[];
}

export type BgmSearchResultItem = BgmCharacterSearchResultItem | BgmSubjectSearchResultItem | BgmPersonSearchResultItem;

// 角色详情数据类型
export interface GridItemCharacter {
    id: number | string;
    name: string;
    image?: string; // Legacy Base64 or URL (Deprecated for Base64, use imageId)
    imageId?: string; // Pointer to ImagePool (UUID)
    // V3 Analytics Data
    bangumiId?: number;
    category?: 'character' | 'subject' | 'person' | 'custom';
    subjectType?: string; // e.g. 'anime', 'game'
}

// 格子数据类型
export interface GridItem {
    label: string;
    character?: GridItemCharacter;
}
// 统计数据类型
export interface StatsCandidate {
    id: string | number;
    name: string;
    image: string;
    count: number;
}

export type StatsResponse = Record<string, StatsCandidate[]>;
