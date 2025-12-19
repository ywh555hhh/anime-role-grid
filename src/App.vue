<script setup lang="ts">
// App.vue is just a router shell now
import GlobalAnnouncement from './components/GlobalAnnouncement.vue'
import { Toaster } from 'vue-sonner' // NEW
import { useGridStore } from '~/stores/gridStore'
import { watch } from 'vue'

const { isStreamerMode } = useGridStore()

watch(isStreamerMode, (val) => {
  if (val) {
    document.documentElement.classList.add('noscroll')
  } else {
    document.documentElement.classList.remove('noscroll')
  }
}, { immediate: true })

</script>

<template>
  <GlobalAnnouncement />
  <Toaster position="top-center" richColors />
  <router-view />
</template>
