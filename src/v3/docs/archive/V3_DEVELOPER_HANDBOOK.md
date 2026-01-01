# V3 Architect Developer Handbook 📘

> **For the Next Agent / Developer**: This document outlines the distinct architecture of V3, which differs significantly from V1/V2. It is based on an Entity-Component-System (ECS) pattern. Follow these standards to maintain system integrity.

---

## 1. System Architecture (The Mental Model) 🧠

V3 separates **Data (ECS)** from **Presentation (Vue)**.

```mermaid
graph TD
    subgraph Core "V3 Core (Pure TS)"
        REG[Registry] -->|Manage| ENT[Entities]
        REG -->|Manage| COM[Components]
        SYS[Systems] -->|Process| REG
        CMD[Command Stack] -->|Execute/Undo| REG
        POOL[ImagePool] -- Storage --> IDB[(IndexedDB)]
    end

    subgraph UI "V3 UI (Vue 3)"
        COMP[Composables] -->|Read/Write| REG
        VIEW[MainViewport] -->|Render| DOM[DOM Layer]
        DOM -->|v-for| ECARD[EntityRenderer]
    end
    
    ECARD -- 1. Read Data --> COMP
    ECARD -- 2. Get Blob --> POOL
```

### Key Modules
1.  **Registry (`core/ecs/Registry.ts`)**: The database. Stores all state.
    *   **Rule**: Never mutate state directly. Use `Commands`.
    *   **Methodology**: **TDD (Test-Driven Development)**. All ECS core logic MUST be covered by unit tests before simple integration.
2.  **Commands (`core/ecs/command.ts`)**: The only way to change state.
    *   **Rule**: Always wrap changes in `createSetComponentCommand()` to get free Undo/Redo.
3.  **ImagePool (`core/systems/assets/ImagePool.ts`)**: The asset manager.
    *   **Rule**: Never store Blobs or Base64 in Components. Store the `UUID` string.

---

## 2. API-First Development Structure 🧱

**We write Contracts (`interfaces`), then Plugins.** 
Do not hardcode functionality into the Core.

### The Extension API
If you want to add a new "Source" (e.g. Steam Games), you do **NOT** modify `Search.vue`.
Instead, you implement:

```typescript
// core/interfaces/ISourceProvider.ts
export interface ISourceProvider {
    id: string; // 'steam'
    name: string; // 'Steam Store'
    search(query: string): Promise<RawData[]>;
    normalize(data: RawData): EntityComponentData;
}
```

Then register it:
```typescript
ProviderRegistry.register(new SteamProvider());
```

This ensures the platform grows indefinitely ("VS Code Style") without becoming a monolith.

---

## 3. Frontend Integration Standards (The Bridge) 🌉

### `useWorld()`
The entry point for any UI component to access the engine.

```typescript
import { useWorld } from '../composables/useWorld'

// 1. Get the Reactive State (for templates)
// 2. Get the Mutable Registry (for logic/commands)
const { state, registry, history } = useWorld()
```

### `useViewport()`
The Infinite Canvas coordinator. It manages the `Screen <-> World` matrix.
*   **Editor Components** (e.g., Search, Settings) -> Use **Screen Coordinates**.
*   **Canvas Components** (e.g., EntityCard) -> Use **World Coordinates**.

---

## 3. Mature Component Standard (How to Write UI) ✍️

A "Mature V3 Component" must be **Reactive**, **Safe**, and **Decoupled**.

### Example: `EntityRenderer.vue`

```vue
<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useWorld } from '../composables/useWorld'
import { ImagePool } from '../../core/systems/assets/ImagePool'

const props = defineProps<{ id: string }>()

// 1. Access Singleton Systems
const { registry } = useWorld()
const pool = ImagePool.getInstance()

// 2. Computed Reactivity (Reading from ECS)
// PRO TIP: Use shallow access. Registry is optimized for this.
const visual = computed(() => registry.getComponent(props.id, 'Visual'))
const transform = computed(() => registry.getComponent(props.id, 'Transform'))

// 3. Async Asset Loading (The ImagePool Pattern)
const imageUrl = ref('')

watchEffect(async () => {
    if (visual.value?.src) {
        // ASYNC: Always await the blob from IDB
        imageUrl.value = await pool.getImage(visual.value.src) || ''
    }
})

// 4. Reactive Styling (World -> Screen / CSS)
const style = computed(() => {
    if (!transform.value) return { display: 'none' }
    return {
        transform: `translate(${transform.value.x}px, ${transform.value.y}px)`,
        zIndex: transform.value.z
    }
})
</script>

<template>
  <div class="entity-card" :style="style">
      <img :src="imageUrl" />
  </div>
</template>
```

---

## 4. Layout Strategy (Multiple Dimensions) 📐

V3 aims to support a "Multi-Experience" editor:

1.  **Multi-Source**: Ingest data from Bangumi, Steam, Local Files, etc.
2.  **Multi-Dock**: Support multiple holding areas (e.g., Gacha Pile, Clipboard) in addition to the main Grid.
3.  **Multi-Display**: Future support for Pyramid, Tier Lists, etc.

### Implementing Streamer Mode vs. Normal Mode

### The Strategy
*   **MainLayout.vue**: The "Shell".
*   **MainViewport.vue**: The "Stage".
*   **EntityRenderer.vue**: The "Actor".

### Implementing Streamer Mode vs. Normal Mode
Do **NOT** write `StreamerLayout.vue` and `NormalLayout.vue` separately.
Instead, use the **Docking Prop** on `MainLayout`.

```typescript
// IN PROGRESS ARCHITECTURE
const mode = ref<'normal' | 'streamer'>('normal')

// Streamer Mode:
// 1. Hide TopBar
// 2. Lock Viewport Pan/Zoom (Optional)
// 3. Float the Sidebar (Dock)
```

**Next Agent Task**: Implement the `useLayoutMode()` composable to toggle these CSS states globally in `MainLayout.vue`.

---

## 5. Critical Constraints (Do Not Break) ⚠️

1.  **No `any`**: Fix your types in `src/v3/core/ecs/types.ts`.
2.  **No Direct DOM Manipulation**: Use `useViewport` for pan/zoom.
3.  **No Huge Base64 Strings**: Always use `ImagePool`.
4.  **V1 Parity**: Ensure every visual element matches V1 via Tailwind/UnoCSS tokens.
    *   **Constraint**: Use Serif fonts ("Songti") ONLY for the Canvas/Export content. Use Sans-Serif for the Editor UI.

---

> **Ready for Handover**: The Core Kernel is stable. The UI Shell is active. The Viewport is functional but needs polish implementation of Drag-n-Drop and Grid Snapping.
