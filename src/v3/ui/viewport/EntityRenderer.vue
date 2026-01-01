<script setup lang="ts">
import { computed, ref } from 'vue'
import { ImagePool } from '../../core/systems/assets/ImagePool'
import { useWorld } from '../composables/useWorld'
import type { EntityId, ComponentData } from '../../core/ecs/types'

const props = defineProps<{
  id: EntityId
}>()

const pool = ImagePool.getInstance()
const { registry } = useWorld()

// Reactive visual data
const visual = computed(() => registry.getComponent(props.id, 'Visual'))
const transform = computed(() => registry.getComponent(props.id, 'Transform'))
const interaction = computed(() => registry.getComponent(props.id, 'Interaction'))

const imageUrl = ref('')

import { watchEffect } from 'vue'

watchEffect(async () => {
    if (visual.value?.src) {
        imageUrl.value = await pool.getImage(visual.value.src) || ''
    } else {
        imageUrl.value = ''
    }
})

const style = computed(() => {
  if (!transform.value) return {}
  return {
    transform: `translate(${transform.value.x}px, ${transform.value.y}px)`,
    zIndex: transform.value.z,
    width: '100px', // TODO: Make configurable or dynamic based on Grid Layout
    height: '150px'
  }
})

const isSelected = computed(() => interaction.value?.isSelected)

import { onMounted } from 'vue'
onMounted(() => {
    console.log(`[EntityRenderer] Mounted ${props.id}`, { 
        visual: visual.value, 
        transform: transform.value,
        imageUrl: imageUrl.value 
    })
})
</script>

<template>
  <div 
    v-if="visual && transform"
    class="absolute top-0 left-0 transition-shadow duration-200 select-none will-change-transform"
    :class="{ 
      'ring-2 ring-primary shadow-lg': isSelected,
      'hover:ring-2 hover:ring-primary/50': !isSelected && interaction?.isSelectable
    }"
    :style="style"
  >
    <!-- Image Content -->
    <div class="w-full h-full rounded-lg overflow-hidden bg-gray-100 shadow-sm border border-gray-200">
      <img 
        v-if="imageUrl" 
        :src="imageUrl" 
        class="w-full h-full object-cover pointer-events-none"
        draggable="false"
      >
      <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
        <div i-carbon-image class="text-2xl" />
      </div>
    </div>
  </div>
</template>
