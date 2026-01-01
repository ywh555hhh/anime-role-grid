<script setup lang="ts">
import { useWorkbench } from '../../platform/workbench/useWorkbench';
import NormalLayout from './layouts/NormalLayout.vue';
import StreamerLayout from './layouts/StreamerLayout.vue';
import ActivityBar from './ActivityBar.vue';

const { mode } = useWorkbench();
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex flex-col md:flex-row bg-[#FDFDFD]">
      <!-- Global Navigation (View/Dock Switcher) -->
      <ActivityBar />

      <!-- Main Layout Area -->
      <div class="flex-1 relative h-full overflow-hidden">
        <Transition name="fade" mode="out-in">
            <KeepAlive>
                <NormalLayout v-if="mode === 'NORMAL'" />
                <StreamerLayout v-else-if="mode === 'STREAMER'" />
            </KeepAlive>
        </Transition>
      </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
