/**
 * @file shared/schema/domain.ts
 * @description Zod Schemas for Domain Entities
 * Used for API Validation (Backend) and Form Validation (Frontend).
 */
import { z } from 'zod';

// =============================================================================
// 1. Photo Schema
// =============================================================================
export const PhotoMetaSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    originId: z.string().optional(),
    sourceWork: z.string().optional(),
    copyright: z.string().optional(),
});

export const PhotoSchema = z.object({
    id: z.string().uuid(),
    url: z.string().url(),
    meta: PhotoMetaSchema,
    provider: z.enum(['bangumi', 'local', 'anilist', 'other']),
});

// =============================================================================
// 2. Card Schema
// =============================================================================
export const CardStateSchema = z.object({
    isObtained: z.boolean().default(false),
    isLocked: z.boolean().default(false),
    isFlipped: z.boolean().optional(),
});

export const CardSchema = z.object({
    id: z.string().uuid(),
    photoId: z.string().uuid(),
    gameData: z.record(z.unknown()).default({}),
    state: CardStateSchema,
});

// =============================================================================
// 3. Template Schema
// =============================================================================
export const TemplateCategorySchema = z.enum(['character', 'work', 'relation', 'fun', 'nsfw', 'custom']);

export const GridSlotSchema = z.object({
    index: z.number().int().min(0),
    label: z.string(),
    rules: z.record(z.unknown()).optional(),
    aspectRatio: z.number().positive().optional(),
});

export const TemplateLayoutSchema = z.object({
    cols: z.number().int().min(1).max(20),
    itemAspectRatio: z.number().positive().default(1.0),
});

export const TemplateSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    category: TemplateCategorySchema,
    layout: TemplateLayoutSchema,
    items: z.array(GridSlotSchema),
    author: z.string().optional(),
    version: z.number().int().default(1),
});

// Type inference helpers
export type PhotoDTO = z.infer<typeof PhotoSchema>;
export type CardDTO = z.infer<typeof CardSchema>;
export type TemplateDTO = z.infer<typeof TemplateSchema>;
