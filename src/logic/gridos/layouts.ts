import type { GridOSLayout } from './core/types'

/**
 * Standard Layouts Registry
 * Future: This could be loaded from external JSON plugins.
 */

// Defines the "Template" Configuration (Scale + Tags)
export const LAYOUT_PRESETS: Record<string, GridOSLayout> = {
    // --- Layout Type: GRID ---
    'grid_3x3': {
        id: 'grid_3x3',
        name: 'Grid 3x3',
        slots: Array.from({ length: 9 }).map((_, i) => ({
            id: `slot_3x3_${i}`,
            label: `#{i + 1}`,
        }))
    },
    'grid_4x4': {
        id: 'grid_4x4',
        name: 'Grid 4x4',
        slots: Array.from({ length: 16 }).map((_, i) => ({
            id: `slot_4x4_${i}`,
            label: `#{i + 1}`,
        }))
    },

    // --- Layout Type: TIER ---
    'tier_basic': {
        id: 'tier_basic',
        name: 'Tier (S/A)',
        slots: [
            { id: 't_s_1', label: 'S Rank', x: 0, y: 0, w: 2 },
            { id: 't_s_2', label: 'S Rank', x: 2, y: 0, w: 2 },
            { id: 't_a_1', label: 'A Rank', x: 0, y: 1 },
            { id: 't_a_2', label: 'A Rank', x: 1, y: 1 },
            { id: 't_a_3', label: 'A Rank', x: 2, y: 1 },
            { id: 't_a_4', label: 'A Rank', x: 3, y: 1 },
        ]
    },
    'tier_full': {
        id: 'tier_full',
        name: 'Tier (S-D)',
        slots: [
            // S Row
            { id: 'tf_s_1', label: 'S', x: 0, y: 0, w: 2 }, { id: 'tf_s_2', label: 'S', x: 2, y: 0, w: 2 },
            // A Row
            { id: 'tf_a_1', label: 'A', x: 0, y: 1 }, { id: 'tf_a_2', label: 'A', x: 1, y: 1 }, { id: 'tf_a_3', label: 'A', x: 2, y: 1 }, { id: 'tf_a_4', label: 'A', x: 3, y: 1 },
            // B Row
            { id: 'tf_b_1', label: 'B', x: 0, y: 2 }, { id: 'tf_b_2', label: 'B', x: 1, y: 2 }, { id: 'tf_b_3', label: 'B', x: 2, y: 2 }, { id: 'tf_b_4', label: 'B', x: 3, y: 2 },
            // C Row
            { id: 'tf_c_1', label: 'C', x: 0, y: 3 }, { id: 'tf_c_2', label: 'C', x: 1, y: 3 }, { id: 'tf_c_3', label: 'C', x: 2, y: 3 }, { id: 'tf_c_4', label: 'C', x: 3, y: 3 },
        ]
    },

    // --- Layout Type: PYRAMID ---
    'pyramid_small': {
        id: 'pyramid_small',
        name: 'Pyramid (1-2)',
        slots: [
            { id: 'ps_1', label: 'King', x: 1, y: 0, w: 1, h: 1.2 },
            { id: 'ps_2_1', label: 'Guard', x: 0.5, y: 1.3 },
            { id: 'ps_2_2', label: 'Guard', x: 1.5, y: 1.3 },
        ]
    },
    'pyramid_classic': {
        id: 'pyramid_classic',
        name: 'Pyramid (1-2-3)',
        slots: [
            { id: 'pc_1', label: 'TOP 1', x: 1.5, y: 0, w: 1, h: 1.2 },
            { id: 'pc_2_1', label: 'T2', x: 0.9, y: 1.3 },
            { id: 'pc_2_2', label: 'T2', x: 2.1, y: 1.3 },
            { id: 'pc_3_1', label: 'T3', x: 0.3, y: 2.4 },
            { id: 'pc_3_2', label: 'T3', x: 1.5, y: 2.4 },
            { id: 'pc_3_3', label: 'T3', x: 2.7, y: 2.4 },
        ]
    }
}

/**
 * Helper to generate a Layout from a simple list of labels (Legacy compatibility)
 */
export function createDynamicLayout(id: string, labels: string[]): GridOSLayout {
    return {
        id,
        name: 'Custom Layout',
        slots: labels.map((label, i) => ({
            id: `${id}_${i}`,
            label
        }))
    }
}
