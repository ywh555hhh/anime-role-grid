<script setup lang="ts">
import { useWorkbench } from '../../../platform/workbench/useWorkbench';
import V1Header from '../components/V1Header.vue';
import V1Toolbar from '../components/V1Toolbar.vue';
import V1Footer from '../components/V1Footer.vue';
import { overlays } from '../../../platform/services/OverlayManager';
import PresetGalleryOverlay from '../../overlays/PresetGalleryOverlay.vue';

const { activeView, setMode } = useWorkbench();

// Placeholder Actions
const handleSave = () => { overlays.alert('保存功能开发中 (Phase 4)'); };
const handleExport = () => { overlays.alert('视频导出功能开发中 (Phase 4)'); };
const handleCreate = () => { overlays.alert('自定义出题功能 (Custom Mode) 待开发'); }; // Separated from Gallery
const handleReset = () => { overlays.confirm('确定要重置当前画布吗？').then(ok => { if(ok) overlays.alert('重置逻辑待接入 (ECS Clear Command)'); }) };

// Temporary: Expose Gallery via a global hotkey or a new Dev button?
// Or better: clicking the "Template Name" in StandardGridView should open Gallery.
// But StandardGridView is a view, it shouldn't know about the overlay directly ideally.
// Let's add a temporary debug button or instruction.
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
            @save="handleSave"
            @export-video="handleExport"
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
