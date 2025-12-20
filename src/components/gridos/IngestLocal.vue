<script setup lang="ts">
import { ref } from 'vue'
import { useGridOS } from '~/stores/gridOS'
import type { GridOSCard } from '~/logic/gridos/core/types'

const emit = defineEmits<{
    (e: 'select', card: GridOSCard): void
}>()

const store = useGridOS()
const fileInput = ref<HTMLInputElement | null>(null)

function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
        const file = target.files[0]
        processFile(file)
    }
}

function processFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
        const result = e.target?.result as string
        if (result) {
            // Create Card from Local File
            const card: GridOSCard = {
                uuid: crypto.randomUUID(),
                meta: {
                    name: file.name.replace(/\.[^/.]+$/, ""), // Strip extension
                    coverUrl: result, // Base64
                    origin: 'local'
                },
                payload: {
                    fileType: file.type,
                    size: file.size
                }
            }
            
            // Auto-register and Select
            store.registerCard(card)
            emit('select', card)
        }
    }
    reader.readAsDataURL(file)
}

function triggerUpload() {
    fileInput.value?.click()
}
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group" @click="triggerUpload">
      <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleFileChange" />
      
      <div class="flex flex-col items-center gap-2 text-gray-400 group-hover:text-primary transition-colors">
          <div class="i-carbon-cloud-upload text-4xl" />
          <span class="text-xs font-bold uppercase tracking-widest">Click to Upload</span>
      </div>
  </div>
</template>
