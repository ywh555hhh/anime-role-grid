import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// =============================================================================
// 1. Saves Table (Stores user created grids)
// =============================================================================
export const saves = sqliteTable('saves', {
    id: text('id').primaryKey(), // UUID
    templateId: text('template_id').notNull(),
    customTitle: text('custom_title'),

    // Privacy & Analytics (V2 Standard)
    userHash: text('user_hash'), // X-User-Hash header
    deviceType: text('device_type'),
    referer: text('referer'),

    // V2 Json Snapshot (Stores the entire logic state)
    // Replaces the old 'save_items' table for V2 logic
    snapshot: text('snapshot', { mode: 'json' }),

    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    userHashIdx: index('idx_saves_user_hash').on(table.userHash),
    templateIdIdx: index('idx_saves_template_id').on(table.templateId),
}));

// =============================================================================
// 2. Custom Templates Table
// =============================================================================
export const customTemplates = sqliteTable('custom_templates', {
    id: text('id').primaryKey(),
    type: text('type').default('grid').notNull(),
    title: text('title'),
    authorIpHash: text('author_ip_hash'),
    config: text('config', { mode: 'json' }), // Full Template JSON Schema
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// =============================================================================
// 3. Statistics Table (For Party War)
// =============================================================================
export const statistics = sqliteTable('statistics_cache', {
    templateId: text('template_id').notNull(),
    period: text('period').notNull(), // '24h', 'week', 'all'
    data: text('data', { mode: 'json' }), // Cached Top Lists
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    pk: index('pk_stats').on(table.templateId, table.period), // Composite Key Logic
}));
