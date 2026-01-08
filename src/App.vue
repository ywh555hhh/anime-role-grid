<script setup lang="ts">
// App.vue is just a router shell now
import GlobalAnnouncement from './components/GlobalAnnouncement.vue'
import ModalDispatcher from './components/ModalDispatcher.vue'

import { Toaster } from 'vue-sonner'
import { useGridStore } from '~/stores/gridStore'
import { useModalStore } from '~/stores/modalStore'
import { watch, computed } from 'vue'
const gridStore = useGridStore()
const modalStore = useModalStore

// Unified Scroll Lock Logic
const shouldLockScroll = computed(() => {
    return gridStore.isStreamerMode.value || !!modalStore.activeModalId.value
})

watch(shouldLockScroll, (val) => {
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
  <ModalDispatcher />
  <router-view />
</template>
