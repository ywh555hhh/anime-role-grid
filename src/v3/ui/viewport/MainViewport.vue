<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useViewport } from '../composables/useViewport'
import { useWorld } from '../composables/useWorld'
import EntityRenderer from './EntityRenderer.vue'

// --- Viewport Logic ---
const viewportRef = ref<HTMLElement | null>(null)
const { state, containerStyle, panBy, zoomAt } = useViewport()
const { registry, state: worldState } = useWorld()

// --- Event Handlers ---

// Panning (Middle Click or Space+Drag logic could go here, for now simpler Right Click or Drag)
// Actually, standard is: Space+Drag or Middle Click Drag for Pan. Wheel for Zoom.
const isPanning = ref(false)

function onWheel(e: WheelEvent) {
  // Ctrl+Wheel or Pinch Pad usually is Zoom. 
  // Standard Editor: Wheel = Pan Y, Shift+Wheel = Pan X, Ctrl+Wheel = Zoom
  // Let's implement ease-of-use style: Wheel = Zoom centered on mouse
  
  if (e.ctrlKey || e.metaKey) {
     e.preventDefault()
     zoomAt(e.clientX, e.clientY, e.deltaY)
  } else {
     // Normal wheel = Pan Y ? Or Zoom? 
     // Let's stick to "Wheel zooms by default" like many simple image viewers?
     // OR "Wheel pans vertically".
     
     // PRO APPROACH: Wheel -> Pan Vertical. Shift+Wheel -> Pan Horizontal. Ctrl+Wheel -> Zoom.
     // BUT user might expect Maps style: Wheel -> Zoom.
     // Let's go with Maps style for now as it's intuitive for "Infinite Canvas".
     e.preventDefault()
     zoomAt(e.clientX, e.clientY, e.deltaY)
  }
}

function onMouseDown(e: MouseEvent) {
  // Middle click (button 1) or Left click + Space (TODO)
  if (e.button === 1 || (e.button === 0 && e.altKey)) { 
      isPanning.value = true
      e.preventDefault()
  }
}

function onMouseMove(e: MouseEvent) {
  if (isPanning.value) {
      panBy(e.movementX, e.movementY)
  }
}

function onMouseUp() {
  isPanning.value = false
}

// Global Event Listeners for seamless drag
onMounted(() => {
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('mousemove', onMouseMove)
})

// --- Entity Filtering ---
// We need a helper to get all Renderable Entities.
// In a real ECS optimization, we might cache this query.
// For now, reactive computation is fine for < 1000 entities.

// Note: Registry in V3 Basic implementation might not expose a reactive list suitable for v-for directly
// if it's using Maps. We might need a computed wrapper.
// Assuming useWorld provides a reactive way or we access registry.entities if it's reactive.
// Let's inspect useWorld / Registry implementation if needed. 
// Assuming `registry.entities` is a Reactive Map or similar.
</script>

<template>
  <div 
    ref="viewportRef"
    class="w-full h-full bg-gray-50 overflow-hidden relative cursor-crosshair select-none"
    @wheel="onWheel"
    @mousedown="onMouseDown"
  >
     <!-- Grid Background (Optional Decorator) -->
     <div 
        class="absolute inset-0 z-0 pointer-events-none opacity-20"
        :style="{
            backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
            backgroundSize: `${20 * state.scale}px ${20 * state.scale}px`,
            backgroundPosition: `${state.x}px ${state.y}px`
        }"
     />

     <!-- World Layer -->
     <div 
        class="viewport-layer absolute top-0 left-0 w-full h-full origin-top-left will-change-transform z-10"
        :style="containerStyle"
     >
        <!-- Entity Layer -->
         <!-- 
            Pro Tip: In ECS, we usually query: registry.query(['Visual', 'Transform']) 
            For Vue reactivity, we assume registry.entities is reactive.
         -->
        <EntityRenderer 
            v-for="id in worldState.entities" 
            :key="id" 
            :id="id" 
        />
     </div>
     
     <!-- HUD Layer (Overlays that don't zoom) -->
     <div class="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg shadow border border-gray-200 text-xs font-mono z-[100] pointer-events-none">
         Zoom: {{ state.scale.toFixed(2) }}x <br>
         Pos: {{ state.x.toFixed(0) }}, {{ state.y.toFixed(0) }}
     </div>

  </div>
</template>

<style scoped>
.viewport-layer {
    /* Optimization: Tells browser to promote to compositor layer */
    transform-style: preserve-3d; 
}
</style>
