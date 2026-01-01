<script setup lang="ts">
import { computed } from 'vue';
import { useWorld } from '../composables/useWorld';
import type { EntityId } from '../../core/ecs/types';
import { LAYERS } from '../../core/ecs/types';

const props = defineProps<{
    id: EntityId;
}>();

const { registry } = useWorld();
const transform = computed(() => registry.getComponent(props.id, 'Transform'));
</script>

<template>
    <div v-if="transform" class="slot-item" :style="{
        left: `${transform.x}px`,
        top: `${transform.y}px`,
        width: `${transform.width}px`,
        height: `${transform.height}px`,
        zIndex: LAYERS.SLOT
    }">
        <span class="idx">{{ id.slice(0, 4) }}</span>
    </div>
</template>

<style scoped>
.slot-item {
    position: absolute;
    border: 2px dashed #ddd;
    background: rgba(0,0,0,0.02);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none; /* Let drag pass through */
    /* z-index handled by inline style */
}
.idx {
    font-size: 10px;
    color: #ccc;
}
</style>
