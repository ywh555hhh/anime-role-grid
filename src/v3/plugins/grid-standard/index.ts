import { defineComponent, h } from 'vue';
import type { IPlugin, IPluginContext } from '../../platform/api/IPlugin';
import type { IPreset } from '../../core/types/preset';
import StandardGridView from './StandardGridView.vue';
import { StandardGridSystem } from './StandardGridSystem';

// --- V1 Presets (Migrated) ---
const presets: IPreset[] = [
    {
        id: 'standard.classic',
        name: '经典 (3x3)',
        description: '最基础的九宫格，适合大多数场景。',
        category: 'character',
        tags: ['基础', '热门'],
        targetViewId: 'builtin.views.grid',
        data: {
            config: {
                cols: 3,
                title: '我的二次元成分表',
                // V1 Template: Classic
            }
        }
    },
    {
        id: 'standard.oshi',
        name: '真爱/Oshi (4x4)',
        description: '专为单推人设计，属性更细分。',
        category: 'character',
        tags: ['属性'],
        targetViewId: 'builtin.views.grid',
        data: {
            config: {
                cols: 4,
                title: '我的 Oshi 果然有问题'
                // We will add 'items' (labels) support later in System
            }
        }
    },
    {
        id: 'standard.toku',
        name: '特摄综合 (4x3)',
        description: '假面骑士/奥特曼入坑必填。',
        category: 'work',
        tags: ['特摄'],
        targetViewId: 'builtin.views.grid',
        data: {
            config: {
                cols: 4,
                title: '我的特摄喜好果然有问题'
            }
        }
    }
];

export const StandardGridPlugin: IPlugin = {
    id: 'builtin.grid',
    version: '1.0.0',
    meta: {
        name: 'Standard Grid',
        description: 'The classic V1 Grid experience.'
    },
    presets: presets,
    activate(ctx: IPluginContext) {
        console.log('[StandardGrid] Activating...');

        // 1. Register View
        ctx.registerView({
            id: 'builtin.views.grid',
            component: StandardGridView
        });

        // 2. Register System
        ctx.systems.register(new StandardGridSystem());

        // 3. Bootstrap Default Grid (if empty)
        const slots = ctx.registry.query(['Layout', 'Visual']);
        if (slots.size === 0) {
            console.log('[StandardGrid] Bootstrapping default grid (9 slots)...');
            const registry = ctx.registry;

            // Create 9 slots
            for (let i = 0; i < 9; i++) {
                const eid = registry.createEntity();

                registry.addComponent(eid, 'Layout', {
                    x: (i % 3),
                    y: Math.floor(i / 3),
                    w: 1,
                    h: 1,
                    order: i,
                    parent: 'root',
                    type: 'slot'
                });

                registry.addComponent(eid, 'Visual', {
                    src: '',
                    visible: true,
                    label: '',
                    type: 'image'
                });

                registry.addComponent(eid, 'Meta', {
                    id: `slot_${i}`,
                    name: `Slot ${i}`,
                    createdTime: Date.now()
                });
            }
        }
    },

    deactivate(ctx: IPluginContext) {
        console.log('[StandardGrid] Deactivating...');
        ctx.systems.unregister('builtin.systems.grid');
    }
};
