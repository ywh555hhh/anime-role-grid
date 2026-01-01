import { defineComponent } from 'vue';
import type { ISystem, IRegistry } from '../../core/ecs/types';

export class StandardGridSystem implements ISystem {
    id = 'builtin.systems.grid';
    priority = 100;

    init(registry: IRegistry) {
        console.log('[StandardGridSystem] Initialized');
    }

    execute(delta: number, time: number, registry: IRegistry) {
        // 1. Check for Commands
        const cmdEntities = registry.query(['Command']);
        for (const id of cmdEntities) {
            const cmd = registry.getComponent(id, 'Command');
            if (cmd && cmd.type === 'GENERATE_GRID' && !cmd.processed) {
                this.handleGenerateGrid(registry, cmd.payload);

                // Mark processed or remove
                // Ideally remove the entity or component
                registry.remove(id);
            }
        }
    }

    private handleGenerateGrid(registry: IRegistry, config: any) {
        console.log('[StandardGridSystem] Generating Grid:', config);

        const cols = config.cols || 3;
        const rows = config.rows || 3; // Default to 3 if not specified
        const count = cols * rows; // Or if items provided, use that length

        // 1. Clear Existing Slots
        // Query all entities with 'Layout' (assuming they belong to grid)
        // In a real multi-view world, we should check a 'ViewID' tag.
        // For now, wipe everything relative to Grid.
        const existing = Array.from(registry.query(['Layout', 'Visual']));
        existing.forEach(id => registry.remove(id));

        // 2. Clear/Set Title
        // Assuming Title is a config in the View Component or a separate singleton entity?
        // For StandardGridView, title is a PROP passed from Workbench or stored in a singleton.
        // Let's assume we store "GridState" singleton.
        // Check for GridState
        let stateId = Array.from(registry.query(['GridState']))[0];
        if (!stateId) {
            stateId = registry.add({ components: { 'GridState': { title: '' } } });
        }

        registry.addComponent(stateId, 'GridState', {
            title: config.title || '我的二次元成分表',
            cols: cols
        });

        // 3. Generate Slots
        console.log(`[StandardGridSystem] Creating ${count} slots...`);
        for (let i = 0; i < count; i++) {
            registry.add({
                components: {
                    'Layout': {
                        x: i % cols,
                        y: Math.floor(i / cols),
                        w: 1,
                        h: 1,
                        order: i // Explicit order
                    },
                    'Visual': {
                        src: '',
                        type: 'image',
                        visible: true,
                        label: '' // Labels could be hydrated from 'items' if provided
                    },
                    'Meta': {
                        id: `slot-${i}`,
                        name: `Slot ${i}`,
                        createdTime: Date.now()
                    }
                }
            });
        }
    }
}
