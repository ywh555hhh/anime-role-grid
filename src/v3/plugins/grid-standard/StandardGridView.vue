<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useElementSize } from '@vueuse/core';
import { getEcsRegistry, getAssetService, getCommandService } from '../../platform/loader';
import { overlays } from '../../platform/services/OverlayManager';
import { presetService } from '../../platform/services/PresetService';
import { getExportService } from '../../platform/services/ExportService';
import { CanvasGenerator, type CanvasGridItem } from './logic/CanvasGenerator';
import PresetGalleryOverlay from '../../ui/overlays/PresetGalleryOverlay.vue';
import ContentEditable from '../../ui/shared/ContentEditable.vue';
import type { IDisposable } from '../../platform/contracts';

// --- V1 Aesthetic Constants ---
const CARD_WIDTH = 120;
const CARD_HEIGHT = 212;

// --- State ---
const registry = getEcsRegistry();
const exportDomDisposable = ref<IDisposable | null>(null);
const exportCanvasDisposable = ref<IDisposable | null>(null);
const rootCardRef = ref<HTMLElement | null>(null);
const gridRef = ref<HTMLElement | null>(null); // Used in template
const widthProbeRef = ref<HTMLElement | null>(null);

// --- Lifecycle & Export ---
onMounted(() => {
    // 1. DOM Export (Screenshot)
    if (gridRef.value) { /* Verify grid ref exists */ }
    try {
        exportDomDisposable.value = getCommandService().register('grid:export-dom', async () => {
            if (!rootCardRef.value) return;
            const title = gridState.value?.title || '我的二次元成分表';
            overlays.toast('正在截图...', 'info');
            try {
                await getExportService().exportToPng(rootCardRef.value, {
                    fileName: `${title}-screenshot`,
                    scale: 3, // Reduced from 4 to save size
                    style: { 
                        padding: '30px',
                        minHeight: 'auto', 
                        boxShadow: 'none', 
                        borderRadius: '0', 
                        width: 'fit-content',
                        margin: '0 auto'
                    }
                });
                overlays.toast('截图保存成功', 'success');
            } catch (e) {
                console.error(e);
                overlays.alert('截图失败');
            }
        });
    } catch (e) { console.warn('Command collision', e); }

    // 2. Canvas Export (High Res)
    try {
        // Changed to 'grid:export' to match V1Toolbar's Save action in NormalLayout
        exportCanvasDisposable.value = getCommandService().register('grid:export', async () => {
            const title = gridState.value?.title || '我的二次元成分表';
            const presetName = presetService.currentPreset.value?.name || '自定义模板';
            overlays.toast('正在绘制高清图片...', 'info');
            try {
                const slotEntities = slots.value;
                const items: CanvasGridItem[] = slotEntities.map(slot => ({
                    visual: { src: slot.visual?.src, label: slot.visual?.label },
                    meta: { name: slot.meta?.name }
                }));

                const generator = new CanvasGenerator();
                const blob = await generator.generate({
                    items,
                    cols: gridState.value?.cols || 3,
                    title: title,
                    templateName: presetName,
                    showNames: gridState.value?.showNames ?? true,
                    qrCodeUrl: window.location.href,
                    creator: 'Me', // Placeholder
                    filler: 'Me'
                });

                getExportService().downloadBlob(blob, title);
                overlays.toast('高清图片已生成', 'success');
            } catch (e) {
                console.error('Canvas Export Failed', e);
                overlays.alert('导出失败: ' + (e as Error).message);
            }
        });
    } catch (e) { console.warn('Command collision', e); }
});

onUnmounted(() => {
    exportDomDisposable.value?.dispose();
    exportCanvasDisposable.value?.dispose();
});

// --- Computed Props ---
const gridStateEntityId = computed(() => {
    const findings = Array.from(registry.query(['GridState']));
    return findings.length > 0 ? findings[0] : null;
});

const gridState = computed(() => {
    if (!gridStateEntityId.value) return null;
    return registry.getComponent(gridStateEntityId.value, 'GridState');
});

const showNames = computed(() => {
    return gridState.value?.showNames ?? true;
});

const updateTitle = (newVal: string) => {
    if (gridStateEntityId.value && gridState.value) {
        registry.addComponent(gridStateEntityId.value, 'GridState', {
            ...gridState.value,
            title: newVal
        });
    }
};

const currentPresetName = computed(() => {
    return presetService.currentPreset.value?.name;
});

// Responsive Scale
const { width: containerWidth } = useElementSize(widthProbeRef);

const gridScale = computed(() => {
    if (!gridState.value || containerWidth.value <= 10) return 1;
    const cols = gridState.value.cols || 3;
    const requiredWidth = cols * CARD_WIDTH + 24; 
    if (containerWidth.value < requiredWidth) {
        return containerWidth.value / requiredWidth;
    }
    return 1;
});

const slots = computed(() => {
    const ids = Array.from(registry.query(['Layout', 'Visual']));
    const items = ids.map(id => {
        const layout = registry.getComponent(id, 'Layout');
        const visual = registry.getComponent(id, 'Visual');
        const meta = registry.getComponent(id, 'Meta');
        return { id, layout, visual, meta };
    });
    return items.sort((a, b) => (a.layout?.order ?? 0) - (b.layout?.order ?? 0));
});

const gridMarginBottom = computed(() => {
    if (gridScale.value >= 1) return 0;
    const cols = gridState.value?.cols || 3;
    const rowCount = Math.ceil(slots.value.length / cols);
    const totalHeight = rowCount * CARD_HEIGHT;
    return -(totalHeight * (1 - gridScale.value));
});

// --- Interaction ---
const handleSlotClick = async (slot: any) => {
    try {
        const results = await getAssetService().pick({
            mode: 'single',
            initialQuery: '', // Fix: No auto-search topic
            title: '选人填表'
        });

        if (results && results.length > 0) {
            const entityData = results[0];
            if (entityData.Visual) {
                registry.addComponent(slot.id, 'Visual', { ...slot.visual, ...entityData.Visual });
            }
            if (entityData.Meta) {
                registry.addComponent(slot.id, 'Meta', { ...slot.meta, ...entityData.Meta });
            }
        }
    } catch (e) { /* Cancel */ }
};

const canEditLabels = computed(() => true);

const updateSlotLabel = (slot: any, newVal: string) => {
    registry.addComponent(slot.id, 'Meta', { ...slot.meta, name: newVal });
};

const handleOpenGallery = () => { overlays.open(PresetGalleryOverlay); };

const getTitleStyle = (text: string) => {
    if (!text) return { fontSize: '20px' };
    const len = text.length;
    let size = 16;
    if (len > 6) size = 14;
    if (len > 10) size = 12;
    return { fontSize: `${size}px` };
};
</script>

<template>
  <div ref="rootCardRef" class="flex flex-col items-center bg-white p-6 shadow-sm w-full rounded-xl min-h-[600px]">
     <!-- 1. Header (V1 Style) -->
     <header class="w-full mb-6 text-center relative flex flex-col items-center gap-2 group/header">
          <!-- Main Title (Editable) -->
          <ContentEditable
             tag="h1"
             class="font-bold tracking-widest text-black text-xl md:text-4xl px-4 py-2 border-b-2 border-transparent hover:border-gray-200 transition-colors cursor-text outline-none whitespace-nowrap max-w-full overflow-x-auto no-scrollbar"
             style="font-family: 'Noto Serif SC', serif;"
             placeholder="我的二次元成分表"
             :modelValue="gridState?.title === '我的二次元成分表' ? '' : (gridState?.title ?? '')"
             :editable="true"
             @update:modelValue="updateTitle"
             @keydown.enter.prevent="$event.target.blur()"
          />

          <!-- Template Name (Pink Subtitle) -->
          <h2 
            class="text-lg md:text-xl font-bold text-[#e4007f] tracking-widest cursor-pointer hover:underline hover:scale-105 transition-all whitespace-nowrap max-w-full overflow-x-auto no-scrollbar"
            style="font-family: 'Noto Serif SC', serif;"
            @click="handleOpenGallery"
          >
            — {{ currentPresetName || '基础模板' }} —
          </h2>
     </header>

     <!-- 2. The Grid (V1 Ratio) -->
     <div ref="widthProbeRef" class="w-full relative flex justify-center py-4">
      <div 
         ref="gridRef"
         class="grid border-t-[2px] border-l-[2px] border-black bg-white box-content shadow-xl transition-transform duration-300 origin-top"
         :style="{
             gridTemplateColumns: `repeat(${gridState?.cols || 3}, ${CARD_WIDTH}px)`,
             width: 'fit-content',
             transform: `scale(${gridScale})`,
             marginBottom: `${gridMarginBottom}px`
         }"
      >
         <!-- Real Slots from ECS -->
         <div 
             v-for="slot in slots" 
             :key="slot.id"
             class="relative bg-white border-r-[2px] border-b-[2px] border-black group overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors flex flex-col"
             :style="{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }"
             @click="handleSlotClick(slot)"
         >
             <!-- 1. Image Content (Flex Grow) -->
             <div class="flex-grow w-full relative overflow-hidden bg-white">
                 <img 
                    v-if="slot.visual?.src" 
                    :src="slot.visual.src" 
                    class="absolute inset-0 w-full h-full object-cover object-top select-none pointer-events-none"
                    loading="lazy"
                 />
                 <!-- Empty Placeholder: Pure White -->
                 <div v-else class="absolute inset-0 w-full h-full bg-white"></div>
                 
                 <!-- Hover Effect -->
                 <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
             </div>


             <!-- 2. Character Name (Optional, Overlay-ish or Bar) -->
             <div 
                v-if="showNames && slot.visual?.label"
                class="h-[25px] flex-shrink-0 flex items-center justify-center text-center bg-white border-t-[2px] border-black overflow-hidden px-1"
             >
                 <span 
                    class="truncate w-full font-bold text-black leading-none select-none"
                    :style="getTitleStyle(slot.visual?.label || '')"
                 >
                    {{ slot.visual?.label }}
                 </span>
             </div>

             <!-- 3. Slot Label (Meta Name, The "Topic") -->
             <div 
                class="h-[25px] flex-shrink-0 flex items-center justify-center text-center bg-white border-t-[2px] border-black overflow-hidden px-1"
                @click.stop
             >
                 <!-- Added contenteditable and @input -->
                 <ContentEditable
                    tag="span"
                    class="truncate w-full font-bold text-black leading-none outline-none"
                    :class="{ 'cursor-text hover:bg-gray-50': canEditLabels }"
                    :style="getTitleStyle(slot.meta?.name || '')"
                    :modelValue="slot.meta?.name || ''"
                    :editable="canEditLabels"
                    @click.stop
                    @update:modelValue="updateSlotLabel(slot, $event)"
                 />
             </div>
         </div>
     </div>
     </div>
     
     <!-- 3. Footer -->
      <!-- 3. Footer Removed -->
  </div>
</template>

<style scoped>
/* Force Songti for "Magazine Feel" */
:deep(.font-serif) {
    font-family: 'Noto Serif SC', serif;
}

[contenteditable].is-empty:before {
  content: attr(placeholder);
  color: #ccc;
  cursor: text;
}

[contenteditable].is-empty:focus:before {
  content: none;
}

.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
