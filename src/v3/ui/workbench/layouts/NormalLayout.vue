<script setup lang="ts">
import { computed } from 'vue';
import { useWorkbench } from '../../../platform/workbench/useWorkbench';
import { getCommandService } from '../../../platform/loader';
import V1Header from '../components/V1Header.vue';
import V1Toolbar from '../components/V1Toolbar.vue';
import V1Footer from '../components/V1Footer.vue';
import { overlays } from '../../../platform/services/OverlayManager';
import { StandardGridPlugin } from '../../../plugins/grid-standard';

const { activeView } = useWorkbench();

// Dynamic Actions from Plugin
const toolbarActions = computed(() => {
    // Logic: If active view is Grid, show Grid actions.
    if (activeView.value?.id === 'builtin.views.grid') {
        return StandardGridPlugin.contributions?.toolbar || [];
    }
    return [];
});

const handleAction = (cmdId: string) => {
    getCommandService().execute(cmdId);
};

// Placeholder Actions
const handleSave = () => { getCommandService().execute('grid:export'); };
const handleExport = () => { getCommandService().execute('grid:export-dom'); };
const handleCreate = () => { overlays.alert('自定义出题功能 (Custom Mode) 待开发'); }; 
const handleReset = () => { overlays.confirm('确定要重置当前画布吗？').then(ok => { if(ok) overlays.alert('重置逻辑待接入 (ECS Clear Command)'); }) };
</script>

<template>
  <!-- Main Container: bg-white for seamless look, remove gray gaps -->
  <div class="flex flex-col h-full bg-white overflow-y-auto">
    <!-- 1. Header -->
    <V1Header />

    <!-- 2. Main Canvas -->
    <!-- Use flex-auto to ensure it grows to fit content (Sticky Footer pattern) -->
    <!-- Removed p-2 md:p-4 to allow full bleed if needed, but StandardGrid has its own padding -->
    <!-- Actually StandardGrid matches V1 which has white background. -->
    <main class="flex-auto flex flex-col"> 
        <component v-if="activeView" :is="activeView.component" />
        <div v-else class="flex-1 flex items-center justify-center text-gray-400">
            No Active View
        </div>
    </main>

    <!-- 3. Toolbar -->
    <!-- Removing visible borders to create seamless flow, relying on spacing or subtle shadow -->
    <section class="bg-white shrink-0">
        <V1Toolbar 
            :actions="toolbarActions"
            @action="handleAction"
            @save="handleSave"
            @export-dom="handleExport"
            @create-new="handleCreate"
            @reset="handleReset"
        />
    </section>

    <!-- 4. Footer -->
    <V1Footer />
  </div>
</template>

<style scoped>
.safe-area-pb {
    padding-bottom: env(safe-area-inset-bottom);
}
</style>
