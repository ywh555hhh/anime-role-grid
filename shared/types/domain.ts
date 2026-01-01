/**
 * @file shared/types/domain.ts
 * @description Core Domain Entities (Pure Types)
 * These types are shared between Frontend (Vue) and Backend (Cloudflare API).
 */

// =============================================================================
// 1. Photo (Visual Material)
// =============================================================================
export interface Photo {
    id: string; // UUID
    url: string; // CDN URL or Blob URL (local)

    // Metadata about the source
    meta: {
        name: string; // Character Name or Subject Title
        originId?: string; // Bangumi ID or other source ID
        sourceWork?: string; // "Frieren: Beyond Journey's End"
        copyright?: string; // "© Cygames, Inc."
    };

    // Where did this photo come from?
    provider: 'bangumi' | 'local' | 'anilist' | 'other';
}

// =============================================================================
// 2. Card (Contextual Entity)
// =============================================================================
export interface Card {
    id: string; // Runtime UUID (unique per session)
    photoId: string; // Reference to Photo.id

    // Dynamic component data defined by the Template Schema
    // e.g. { cost: 5, rarity: 'SSR', comment: 'Best Waifu' }
    gameData: Record<string, unknown>;

    // Runtime State (Mutable)
    state: {
        isObtained: boolean;
        isLocked: boolean;
        isFlipped?: boolean; // For "blind box" reveal
    };
}

// =============================================================================
// 3. Template (The Game Board)
// =============================================================================
export type TemplateCategory = 'character' | 'work' | 'relation' | 'fun' | 'nsfw' | 'custom';

export interface GridSlot {
    index: number; // 0-based index
    label: string; // "Main Waifu", "Top 1"

    // Constraints for this specific slot
    // e.g. { allowedTags: ['female'], maxCost: 10 }
    rules?: Record<string, unknown>;

    // Default aspect ratio for this slot (overrides global)
    aspectRatio?: number;
}

export interface Template {
    id: string;
    name: string;
    category: TemplateCategory;

    // Grid Configuration
    layout: {
        cols: number;
        // Default aspect ratio for all slots (width / height). Default 1.0 (Square)
        // 3/4 = 0.75 (Portrait), 16/9 = 1.77 (Landscape)
        itemAspectRatio?: number;
    };

    // The Slots definition
    items: GridSlot[];

    // Metadata
    author?: string;
    version: number;
}
