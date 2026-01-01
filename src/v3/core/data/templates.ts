/**
 * src/v3/core/data/templates.ts
 * Pre-defined Templates for Demo
 */
import type { ITemplate } from '../schema/template';

export const TEMPLATES: Record<string, ITemplate> = {
    'standard': {
        meta: { name: "Standard 3x3", version: "1.0" },
        viewports: [
            {
                id: "main",
                position: { x: 50, y: 100 },
                layout: { type: "grid", rows: 3, cols: 3, gap: 10, padding: 0 }
            }
        ]
    },
    'team_builder': {
        meta: { name: "Team Builder (4-Person)", version: "1.0" },
        viewports: [
            {
                id: "team_1",
                position: { x: 50, y: 50 },
                layout: { type: "grid", rows: 1, cols: 4, gap: 15, padding: 20 }
            },
            {
                id: "team_2",
                position: { x: 50, y: 250 },
                layout: { type: "grid", rows: 1, cols: 4, gap: 15, padding: 20 }
            }
        ]
    },
    'tier_list': {
        meta: { name: "Tier List", version: "1.0" },
        viewports: [
            {
                id: "tier_s",
                position: { x: 100, y: 50 },
                layout: { type: "grid", rows: 1, cols: 5, gap: 5, padding: 5 }
            },
            {
                id: "tier_a",
                position: { x: 100, y: 150 },
                layout: { type: "grid", rows: 1, cols: 5, gap: 5, padding: 5 }
            },
            {
                id: "tier_b",
                position: { x: 100, y: 250 },
                layout: { type: "grid", rows: 1, cols: 5, gap: 5, padding: 5 }
            }
        ]
    },
    'mobile_grid': {
        meta: { name: "Mobile 1xN", version: "1.0" },
        viewports: [
            {
                id: "main_mobile",
                position: { x: 10, y: 50 },
                layout: { type: "grid", rows: 4, cols: 2, gap: 5, padding: 5, slotSize: { w: 160, h: 100 } }
                // Mobile optimized: 2 columns, wider slots
            }
        ]
    }
};
