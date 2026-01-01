# RFC 007: Unified Overlay System

## 1. Summary
A centralized service (`OverlayManager`) to manage all transient UI elements (Modals, Dialogs, Bottom Sheets, Toasts) with priority, stacking, and plugin-safety.

## 2. Motivation
In V2, modals were ad-hoc components or managed by a simple `modalStore`.
V3 Plugins need a standard way to say "Ask the user for input" or "Show this component" without importing specific Vue components or messing with z-index manually.

## 3. Interface Design

### 3.1 The `IOverlayManager`
Exposed to plugins via `context.overlays`.

```typescript
interface IOverlayManager {
    // Basic Wrappers
    alert(message: string, options?: AlertOptions): Promise<void>;
    confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
    prompt(message: string, options?: PromptOptions): Promise<string | null>;

    // Custom Component Overlay
    open<T = any>(
        component: any, // Vue Component or ID
        props?: Record<string, any>,
        options?: OverlayOptions
    ): Promise<T>; // Returns result when closed/resolved

    close(overlayId: string, result?: any): void;
    closeAll(): void;
}
```

### 3.2 `OverlayOptions`
```typescript
interface OverlayOptions {
    id?: string;            // Fixed ID (singleton behavior)
    priority?: number;      // Higher = On Top
    position?: 'center' | 'bottom' | 'top'; // Layout hint
    backdrop?: boolean;     // Show dim background?
    closeOnBackdrop?: boolean;
}
```

## 4. Implementation Strategy

### 4.1 The `OverlayHost` Component
A single Vue component placed at the root of `Workbench.vue` (z-index 9999).
It renders the **Overlay Stack**.

```vue
<template>
  <div class="overlay-layer">
     <div 
        v-for="overlay in stack" 
        :key="overlay.id"
        class="overlay-wrapper"
        :style="{ zIndex: overlay.priority }"
     >
        <!-- Backdrop -->
        <div v-if="overlay.backdrop" class="modal-backdrop" @click="handleBackdrop(overlay)" />
        
        <!-- Content -->
        <component 
            :is="overlay.component" 
            v-bind="overlay.props" 
            @close="(res) => resolve(overlay.id, res)"
        />
     </div>
  </div>
</template>
```

### 4.2 Stacking Logic
Unlike V2 which replaced the active modal, V3 supports **Stacking**.
*   Example: `SettingsModal` -> Click "Pick Color" -> `ColorPickerModal` (on top).
*   The `OverlayManager` maintains an array `stack`.

## 5. Plugin Integration
Plugins can register "Overlay Views" just like they register "Main Views".

```typescript
// Plugin Code
ctx.overlays.register('my.plugin.search', SearchComponent);

// Usage
ctx.overlays.open('my.plugin.search', { initialQuery: 'Naruto' });
```
