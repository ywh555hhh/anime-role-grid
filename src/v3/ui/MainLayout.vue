<script setup lang="ts">
import { onMounted } from 'vue';
import Workbench from './workbench/Workbench.vue';
import { activateBuiltinPlugins } from '../plugins/builtin';

onMounted(() => {
    // Bootstrap the Platform
    // In the future, this will be handled by a proper 'AppBootstrapper' service
    activateBuiltinPlugins();
});
</script>

<template>
  <!-- The New V3 Shell -->
  <Workbench />
</template>
