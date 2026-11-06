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

export type BgmSearchResultItem =
    BgmCharacterSearchResultItem | BgmSubjectSearchResultItem | BgmPersonSearchResultItem;

/** 热榜条目：/api/trending 与 /api/trending-templates 返回的形状 */
export interface TrendingItem {
    id: number | string;
    name: string;
    image?: string;
    images?: {
        small?: string;
        grid?: string;
        large?: string;
        medium?: string;
        common?: string;
    };
    count?: number;
}

export interface ExportTemplateConfig {
    cols: number;
    creator?: string;
    filler?: string;
}

// 角色详情数据类型
export interface GridItemCharacter {
    id: number | string;
    name: string;
    image?: string; // Legacy Base64 or URL (Deprecated for Base64, use imageId)
    imageId?: string; // Pointer to ImagePool (UUID)
    // V3 Analytics Data
    bangumiId?: number;
    category?: "character" | "subject" | "person" | "custom";
    subjectType?: string; // e.g. 'anime', 'game'
}

// 格子数据类型
export interface GridItem {
    label: string;
    character?: GridItemCharacter;
}
/**
 * 拖拽落位载荷（Grid / GridCanvas → GridEditor）
 *
 * 两种来源：格子之间移动（带 item），或从 Dock 拖入（只带 itemId）。
 */
export interface DropItemPayload {
    index: number;
    item?: GridItemCharacter;
    itemId?: string;
    isMove?: boolean;
}

/** 搜索结果被选中时的载荷（Search → GridEditor） */
export interface SearchAddPayload {
    item: GridItemCharacter;
    rect?: DOMRect;
}

/**
 * 各种缩略图尺寸。
 *
 * 不同上游返回的档位不完全一样（角色有 small/grid/large/medium，
 * 作品还多一个 common），所以统一成「全可选」。
 */
export interface ImageVariants {
    small?: string;
    grid?: string;
    large?: string;
    medium?: string;
    common?: string;
}

// 统计数据类型
export interface StatsCandidate {
    id: string | number;
    name: string;
    image: string;
    count: number;
}

export type StatsResponse = Record<string, StatsCandidate[]>;
