<script setup lang="ts">
defineProps<{
  name: string
}>()

const emit = defineEmits(['update:name', 'search'])

function handleInput(e: Event) {
  emit('update:name', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <header class="flex flex-col items-center gap-6 mb-8">
    <div class="relative group">
      <input
        :value="name"
        class="text-4xl font-bold text-center bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-colors px-2 py-1 text-gray-800"
        type="text"
        @input="handleInput"
      >
      <div i-carbon-edit class="absolute -right-8 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </header>
</template>
