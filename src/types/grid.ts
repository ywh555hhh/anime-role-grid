// src/types/grid.ts

// --- Core Entities ---

/**
 * Represents a single character/subject filling a slot
 */
export interface GridCharacter {
    id: string | number;
    name: string;
    image?: string; // Legacy Base64 or URL (Deprecated for Base64, use imageId)
    imageId?: string; // Pointer to ImagePool (UUID)
    // Analytics / Source Data
    bangumiId?: number;
    category?: "character" | "subject" | "person" | "custom";
    subjectType?: string; // e.g. 'anime', 'game'
}

/**
 * Represents a Candidate Pool for "Party War" (Voting)
 */
export interface CandidatePool {
    id: string; // Unique ID for this pool
    candidates: GridCharacter[]; // The restricted options
    allowCustom: boolean; // If true, user can add their own besides pool
}

/**
 * Represents a cell in the grid
 */
export interface GridItem {
    label: string; // The question/category (e.g. "Best Waifu")
    character?: GridCharacter; // The answer

    // UGC Extension
    pool?: CandidatePool; // If present, filling is restricted/guided
    locked?: boolean; // If true, only Creator can edit this cell
}

// --- Configuration & Templates ---

export interface TemplateConfig {
    cols: number;
    items: string[]; // Default labels
    limitSubjectId?: number; // Global constraint (e.g. "Only Naruto characters")

    // Visuals
    coverImage?: string;
    theme?: string;

    // Metadata
    creator?: string;
    templateName?: string;

    // 投票开关。自定义模板创建时会写进 D1 的 config JSON，
    // 但目前还没有读取方 —— 先把形状定下来，别再用 any 蒙混过去。
    voting?: {
        enabled: boolean;
    };
}

/**
 * 当前生效的模板配置。
 *
 * 官方模板与自定义模板（从 D1 读回来的）合并后的形状：
 * 自定义模板的 `config` 是一份 TemplateConfig，再补一个 defaultTitle。
 * 单独命名是因为「存的那份」和「在用的那份」形状并不完全一样。
 */
export interface ActiveTemplateConfig extends TemplateConfig {
    defaultTitle?: string;
}

export interface CustomTemplate {
    id: string;
    type: "grid" | "bingo" | "tier";
    title: string;
    author_ip_hash?: string;
    config: TemplateConfig;
    created_at?: number;
}

// --- API Payloads ---

export interface SaveGridPayload {
    templateId: string; // REQUIRED. Link to the template.
    customTitle?: string;
    items: GridItem[]; // The filled content

    // Analytics
    deviceType?: string;
    referer?: string;
}

export interface VotePayload {
    templateId: string;
    slotLabel: string;
    characterName: string;
    characterId?: number | string;
}

export interface StatsResponse {
    [slotLabel: string]: Array<{
        name: string;
        id: number;
        image: string;
        count: number;
    }>;
}

export type GridItemCharacter = GridCharacter;
