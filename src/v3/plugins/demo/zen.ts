import { defineComponent, h } from 'vue';
import type { IPlugin } from '../../platform/api/IPlugin';

/**
 * Demo Plugin: Zen Mode
 * Tests: View, Dock
 */
export const ZenPlugin: IPlugin = {
    id: 'demo.zen',
    version: '1.0.0',
    meta: { name: 'Zen Mode Plugin' },

    activate(ctx) {
        // 1. Register View
        ctx.registerView({
            id: 'demo.zen.view',
            name: 'Zen Space',
            icon: 'leaf',
            capabilities: { zoom: false, export: false, culling: false },
            component: defineComponent({
                setup() {
                    return () => h('div', { class: 'w-full h-full flex items-center justify-center bg-teal-50 text-teal-800 flex-col' }, [
                        h('h1', { class: 'text-6xl font-thin mb-4' }, '🌿'),
                        h('h2', { class: 'text-2xl font-light' }, 'Breathe in... Breathe out...'),
                    ])
                }
            })
        });

        // 2. Register Dock
        ctx.registerDock({
            id: 'demo.zen.controls',
            title: 'Meditation',
            location: 'right', // Streamer layout defaults to left, but supports right technically (though layout might ignore it)
            component: defineComponent({
                setup() {
                    return () => h('div', { class: 'p-4 text-center' }, [
                        h('button', { class: 'px-4 py-2 bg-teal-100 rounded-full text-teal-700' }, 'Start Timer')
                    ])
                }
            }),
            dispose() { }
        });
    },

    deactivate() {
        console.log('Zen Mode deactivated');
    }
};
