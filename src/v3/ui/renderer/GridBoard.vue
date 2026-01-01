<script setup lang="ts">
import { computed } from 'vue';
import { useWorld } from '../composables/useWorld';
import { LayoutSystem } from '../../core/systems/layout';
import type { EntityId } from '../../core/ecs/types';

const props = defineProps<{
  id: EntityId;
}>();

const { registry, state } = useWorld();

// Reactive calculations
const transform = computed(() => registry.getComponent(props.id, 'Transform'));
const slots = computed(() => {
    // This will re-calculate if transform or layout config changes 
    // (assuming getComponent returns reactive objects from shallowReactive registry)
    // Note: getComponent returns the Raw object inside the shallowReactive Map.
    // If we mutate transform.x, 'transform' computed triggers? 
    // Registry implementation: storage.get(id) returns the object. 
    // The object itself is NOT deep reactive unless we made it so.
    // Wait, in useDrag we did a direct mutation: `registry.addComponent`.
    // That replaces the object reference in the Map? No, we likely need to check Registry implementation.
    // Registry.addComponent: storage.set(id, markRaw(data)). This triggers Map change.
    // So yes, computed depends on registry.getComponent which depends on keys/values of the reactive Map.
    return LayoutSystem.calculateSlots(props.id, registry);
});

const boardStyle = computed(() => {
    if (!transform.value) return {};
    return {
        position: 'absolute' as const,
        left: `${transform.value.x}px`,
        top: `${transform.value.y}px`,
        width: `${transform.value.width}px`,
        height: `${transform.value.height}px`,
        backgroundColor: '#f0f0f0',
        zIndex: 0,
        borderRadius: '8px'
    };
});
</script>

<template>
  <div v-if="transform" :style="boardStyle" class="grid-board">
     <!-- Render Ghost Slots -->
     <div 
        v-for="slot in slots" 
        :key="slot.index"
        class="ghost-slot"
        :style="{
            left: `${slot.x - transform.x}px`, /* Relative to Board */
            top: `${slot.y - transform.y}px`,
            width: `${slot.width}px`,
            height: `${slot.height}px`
        }"
     >
       <span class="slot-idx">{{ slot.index + 1 }}</span>
     </div>
  </div>
</template>

<style scoped>
.grid-board {
    box-shadow: inset 0 0 10px rgba(0,0,0,0.05);
}
.ghost-slot {
    position: absolute;
    border: 2px dashed #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    pointer-events: none; /* Let clicks pass through */
}
.slot-idx {
    color: #ccc;
    font-size: 24px;
    font-weight: bold;
    opacity: 0.5;
}
</style>
