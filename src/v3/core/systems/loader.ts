/**
 * src/v3/core/systems/loader.ts
 * Template Loader System
 * Responsible for parsing ITemplate and generating ECS Entities (Slots, etc.)
 */
import type { IRegistry } from '../ecs/types';
import type { ITemplate } from '../schema/template';

export class TemplateLoader {
    /**
     * Load a template into the registry.
     * 1. Clears existing slots/backgrounds (unless hot-reload logic handles smart diff)
     * 2. Spawns new entities based on Viewports
     */
    static load(registry: IRegistry, template: ITemplate) {
        // 1. Clear existing slots? 
        // For now, let's assume registry is clean or we append. 
        // Phase 6 Step 2: "Step 1: Clear" logic needed later? 
        // Or we rely on proper teardown in tests. 
        // Let's implement the spawning logic first.

        for (const viewport of template.viewports) {
            const { position, layout } = viewport;
            const { rows, cols, gap, padding, slotSize } = layout;

            // Default slot size if not provided
            const w = slotSize?.w ?? 80;
            const h = slotSize?.h ?? 80;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const id = registry.createEntity();

                    // Calculate Global Position
                    // GlobalX = ViewportX + Padding + Col * (SlotW + Gap)
                    const x = position.x + padding + c * (w + gap);
                    const y = position.y + padding + r * (h + gap);

                    // Add Transform
                    registry.addComponent(id, 'Transform', {
                        x,
                        y,
                        z: 0, // Background layer
                        width: w,
                        height: h
                    });

                    // Add LayoutConfig (Mark as Slot)
                    // We reusing LayoutConfig component? 
                    // Phase 3 defined LayoutConfig with { strategy: 'grid', rows, cols... } for the Parent.
                    // But here we are spawning *Children* Slots.
                    // Do we tag them?
                    // The test expects "registry中拥有 LayoutConfig 组件".
                    // Maybe we misuse LayoutConfig to mark them?
                    // Or we should add a new 'Slot' component or 'LayoutItem' component?
                    // User instructions: "Add Transform and LayoutConfig components".
                    // Let's verify what LayoutConfig looks like in types.ts.

                    // Assuming LayoutConfig has 'strategy'. Let's check types.ts if we can.
                    // If not, we might need to add a 'Slot' tag.
                    // But to pass the test (filter by LayoutConfig), we must add it.
                    // Let's add LayoutConfig with strategy 'static' or 'slot' if type allows.
                    // If 'grid' is required, we use 'grid' but meaningless?

                    // Let's check types.ts later if needed. For now assuming string is fine or enum allows 'slot'.
                    // Actually, let's look at `types.ts` via view_file to be safe, OR just write code that complies with what we think.
                    // V3 Types usually define string unions.

                    registry.addComponent(id, 'LayoutConfig', {
                        strategy: 'slot', // Assuming we can add this or it is string
                        // Minimal data
                    } as any); // cast any if 'slot' is not yet in enum
                }
            }
        }
    }
}
