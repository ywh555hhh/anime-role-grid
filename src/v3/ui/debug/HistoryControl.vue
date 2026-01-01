<script setup lang="ts">
import { useWorld } from '../composables/useWorld';
import { onMounted, onUnmounted } from 'vue';

const { history } = useWorld();

function handleKeydown(e: KeyboardEvent) {
  // Only handle if Ctrl (or Meta for Mac) is pressed
  if (!e.ctrlKey && !e.metaKey) return;

  if (e.key === 'z' || e.key === 'Z') {
    if (e.shiftKey) {
      // Ctrl+Shift+Z -> Redo
      e.preventDefault();
      history.redo();
    } else {
      // Ctrl+Z -> Undo
      e.preventDefault();
      history.undo();
    }
  } else if (e.key === 'y' || e.key === 'Y') {
    // Ctrl+Y -> Redo
    e.preventDefault();
    history.redo();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div style="border: 2px solid #007bff; padding: 20px; margin: 20px;">
    <h3>History Control</h3>
    <div style="display: flex; gap: 10px;">
      <button 
        @click="history.undo()" 
        :disabled="!history.canUndo"
        style="padding: 10px 20px; cursor: pointer;"
      >
        Undo (Ctrl+Z)
      </button>

      <button 
        @click="history.redo()" 
        :disabled="!history.canRedo"
        style="padding: 10px 20px; cursor: pointer;"
      >
        Redo (Ctrl+Y)
      </button>
    </div>
    <div style="margin-top: 10px; color: #666;">
       (Check console for stack details)
    </div>
  </div>
</template>
