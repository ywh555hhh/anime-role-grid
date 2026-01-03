/**
 * src/v3/platform/schemas/asset.ts
 * The "Guard" for external data.
 * All Sources MUST validate their output against these schemas.
 */
import { z } from 'zod';

// 1. Asset Type Enum
export const AssetTypeSchema = z.enum(['image', 'video', 'audio', 'text']);
export type AssetType = z.infer<typeof AssetTypeSchema>;

// 2. The Universal Asset Schema
export const AssetSchema = z.object({
    id: z.string().describe('Unique identifier from source (e.g. Bangumi ID)'),

    type: AssetTypeSchema.default('image'),

    title: z.string().min(1, 'Title cannot be empty'),

    // The "Source of Truth" URL
    url: z.string().url('Must be a valid URL'),

    thumbnail: z.string().url().optional(),

    // Original metadata (Bag)
    meta: z.object({
        width: z.number().optional(),
        height: z.number().optional(),
        mime: z.string().optional(),
        // Extra info
        originalId: z.string().optional(),
        author: z.string().optional(),
    }).passthrough().optional()
});

export type StrictAsset = z.infer<typeof AssetSchema>;

// 3. Source Capability Enum (Runtime Check)
export const SourceCapability = {
    Search: 'search',
    Pagination: 'pagination',
    Recommend: 'recommend',
    Upload: 'upload'
} as const;

export type SourceCapability = typeof SourceCapability[keyof typeof SourceCapability];
