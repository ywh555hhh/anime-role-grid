<script setup lang="ts">
// App.vue is just a router shell now
import GlobalAnnouncement from './components/GlobalAnnouncement.vue'
import ModalDispatcher from './components/ModalDispatcher.vue'

import { Toaster } from 'vue-sonner'
import { useGridStore } from '~/stores/gridStore'
import { useModalStore } from '~/stores/modalStore'
import { watch, computed, onMounted } from 'vue'
import { getEcsRegistry, getPersistenceService, getSystemManager } from './v3/platform/loader'

const gridStore = useGridStore()
const modalStore = useModalStore

// V3 Persistence & Loop Init
onMounted(() => {
    const registry = getEcsRegistry();
    const persistence = getPersistenceService();
    const sysManager = getSystemManager();
    
    // 1. Persistence Load is now handled by Router (for V3) logic
    // or Home logic (for V2). 
    
    // 2. Start Watching (Auto-Save) - specific to V3 but harmless if empty
    persistence.watchForChanges(registry);

    // 3. Start Game Loop
    sysManager.startLoop();
});

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
