<script setup lang="ts">
// App.vue is just a router shell now
import GlobalAnnouncement from './components/GlobalAnnouncement.vue'
import { Toaster } from 'vue-sonner' // NEW

</script>

<template>
  <GlobalAnnouncement />
  <Toaster position="top-center" richColors />
  <router-view />
</template>
