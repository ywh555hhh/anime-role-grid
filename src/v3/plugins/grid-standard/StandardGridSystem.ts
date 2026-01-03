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
            if (cmd && !cmd.processed) {
                if (cmd.type === 'GENERATE_GRID') {
                    this.handleGenerateGrid(registry, cmd.payload);
                } else if (cmd.type === 'TOGGLE_NAMES') {
                    this.handleToggleNames(registry);
                } else if (cmd.type === 'RESET_LABELS') {
                    this.handleResetLabels(registry, cmd.payload);
                }

                // Generic cleanup
                registry.destroyEntity(id);
            }
        }
    }

    private handleGenerateGrid(registry: IRegistry, config: any) {
        console.log('[StandardGridSystem] Generating Grid:', config);

        const cols = config.cols || 3;
        // If items are provided, calculate total count and rows based on items
        const itemCount = config.items?.length || 0;
        let count = itemCount > 0 ? itemCount : (cols * (config.rows || 3));
        const rows = Math.ceil(count / cols);

        // 1. Clear Existing Slots
        const existing = Array.from(registry.query(['Layout', 'Visual']));
        existing.forEach(id => registry.destroyEntity(id));

        // 2. Clear/Set Title
        let stateId = Array.from(registry.query(['GridState']))[0];
        if (!stateId) {
            stateId = registry.add({ components: { 'GridState': { title: '' } } });
        }

        registry.addComponent(stateId, 'GridState', {
            title: config.title || '我的二次元成分表',
            cols: cols,
            presetId: config.presetId || '',
            showNames: true
        });

        // 3. Generate New Slots
        console.log(`[StandardGridSystem] Creating ${count} slots (${cols}x${rows})...`);
        for (let i = 0; i < count; i++) {
            registry.add({
                components: {
                    'Layout': {
                        x: i % cols,
                        y: Math.floor(i / cols),
                        w: 1,
                        h: 1,
                        order: i,
                        parent: 'root',
                        type: 'slot'
                    },
                    'Visual': {
                        src: '',
                        visible: true,
                        label: '',
                        type: 'image'
                    },
                    'Meta': {
                        name: config.items?.[i] || `Slot ${i}`,
                        createdTime: Date.now()
                    }
                }
            });
        }
    }

    private handleToggleNames(registry: IRegistry) {
        let stateId = Array.from(registry.query(['GridState']))[0];
        if (stateId) {
            const state = registry.getComponent(stateId, 'GridState');
            if (state) {
                registry.addComponent(stateId, 'GridState', {
                    ...state,
                    showNames: state.showNames === undefined ? false : !state.showNames // Toggle
                });
            }
        }
    }

    private handleResetLabels(registry: IRegistry, payload: { items?: string[] }) {
        console.log('[StandardGridSystem] Resetting Labels...');
        const slots = Array.from(registry.query(['Layout', 'Meta']));
        const items = payload.items || [];

        for (const id of slots) {
            const layout = registry.getComponent(id, 'Layout');
            const meta = registry.getComponent(id, 'Meta');

            if (layout && meta) {
                const order = layout.order;
                const newName = items[order] || `Slot ${order}`;

                registry.addComponent(id, 'Meta', {
                    ...meta,
                    name: newName
                });
            }
        }
    }
}
