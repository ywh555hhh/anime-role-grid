<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import { useWorld } from '../composables/useWorld';
import { useDrag } from '../composables/useDrag';
import type { EntityId } from '../../core/ecs/types';
import { LAYERS } from '../../core/ecs/types';

const props = defineProps<{
  id: EntityId;
}>();

const { registry, state } = useWorld();
const { startDrag, onDrag, endDrag, dragContext } = useDrag();

const transform = computed(() => registry.getComponent(props.id, 'Transform'));
const visual = computed(() => registry.getComponent(props.id, 'Visual'));

const style = computed((): CSSProperties => {
  if (!transform.value) return { display: 'none' };
  const { x, y, z } = transform.value;
  return {
    transform: `translate3d(${x}px, ${y}px, 0)`,
    zIndex: isDragging.value ? LAYERS.CARD_DRAGGING : (z || LAYERS.CARD_IDLE),
    width: '80px',
    height: '80px', 
    position: 'absolute',
    top: 0,
    left: 0,
    cursor: 'grab'
  };
});

const isDragging = computed(() => dragContext.activeId === props.id);

const visualContent = computed(() => {
    if (!visual.value) return { type: 'none', value: '' };

    return {
        type: visual.value.type,
        value: visual.value.src
    };
});

// Use Composable for Async Image Loading
// Pass a getter since visualContent is computed
import { useAsset } from '../composables/useAsset';
const { url: imageUrl, isLoading } = useAsset(() => 
    visualContent.value.type === 'image' ? visualContent.value.value : undefined
);

function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return; // Left click only
    startDrag(e, props.id);
}
</script>

<template>
  <div 
    v-if="transform && visual"
    class="entity-card"
    :class="{ 'is-dragging': isDragging }"
    :style="style"
    @pointerdown="handlePointerDown"
    @pointermove="onDrag"
    @pointerup="endDrag"
    @pointercancel="endDrag"
  >
    <!-- Content Rendering -->
    <div v-if="visualContent.type === 'color'" 
         class="visual-box"
         :style="{ backgroundColor: visualContent.value }">
    </div>
    
    <div v-else-if="visualContent.type === 'text'" 
         class="visual-box text-mode">
       {{ visualContent.value }}
    </div>

    <div v-else-if="visualContent.type === 'image'" class="visual-box relative">
        <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-gray-100 text-xs text-gray-400">
            Loading...
        </div>
        <img v-if="imageUrl" 
            :src="imageUrl" 
            class="visual-img" 
            draggable="false" 
            alt="Entity" />
    </div>
  </div>
</template>

<style scoped>
.entity-card {
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  border-radius: 12px;
  background: white;
  user-select: none;
  touch-action: none;
  transition: transform 0.05s linear, box-shadow 0.2s, scale 0.2s;
  overflow: hidden; /* For image corners */
  will-change: transform;
}

.entity-card.is-dragging {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  scale: 1.15;
  z-index: 9999 !important; /* Ensure on top of everything */
  cursor: grabbing !important;
  transition: none; 
}

.visual-box {
  width: 100%;
  height: 100%;
}

.text-mode {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eee;
  font-size: 12px;
  padding: 5px;
  word-break: break-all;
}

.visual-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  display: block;
}
</style>
