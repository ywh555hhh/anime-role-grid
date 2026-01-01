# V3 UX & Design Migration Guide 🎨

## 1. Why V1 "Feels" Good (The Secret Sauce)

After analyzing `Grid.vue`, `canvasDraw.ts`, and `gridStore.ts`, the success of V1 comes down to **Three Core Pillars**:

### A. The "Hybrid View" Architecture (DOM Edit / Canvas Export)
V1 does **NOT** use `html2canvas` to screenshot the DOM. This is crucial.
*   **Editing**: Uses HTML/CSS Grid for responsive, accessible, interactive editing.
*   **Exporting**: Uses a dedicated `CanvasGenerator` (`canvasDraw.ts`) to draw the final image from scratch.
    *   **Pro**: Guarantees High Resolution (Cells are fixed 300px width internally).
    *   **Pro**: Zero "Layout Shift" or "Blurry Text" issues common with DOM screenshots.
    *   **Pro**: Allows "Watermarks" and "Fancy Borders" to exist *only* on the exported image, keeping the editor clean.

### B. "Invisible" Persistence (State Management)
User data is immortal but lightweight.
*   **Auto-Save**: Everything relies on `useStorage` (VueUse). There is no "Save Button".
*   **Image Pooling**: `gridStore.ts` separates heavy Base64 strings into `imagePool`. The main grid state only stores `imageId` (UUIDs). This keeps the history stack light and responsive.
*   **CORS Handling**: `getImageUrl` automatically proxies images via `wsrv.nl` during export to prevent Tainted Canvas errors.

### C. Visual Polish (Micro-Interactions)
*   **Dynamic Typography**: The canvas renderer implements a `while` loop to shrink text font size until it fits the container. Long titles never break the layout.
*   **Solid Ghosts**: The Drag&Drop uses a custom `.ghost-preview` class to force the dragged item to look "solid" (opacity 1) with specific borders, rather than the browser's default semi-transparent ghost.

---

## 2. V3 Implementation Strategy (Roadmap)

> [!CAUTION]
> **V2 is Deprecated**: Do not use V2 code or design patterns. V2 is considered a failed experiment. Stick to V1's UX principles and the new V3 ECS architecture.

To match or exceed V1, V3 ECS must adopt these patterns explicitly.

### 🎨 Rendering (View Layer)
*   **DOM System (Implemented)**: Continue using Vue components (`EntityDebugger` / `GridRenderer`) for the live editor.
*   **Canvas System (To Do)**: **DO NOT** try to screenshot the V3 DOM.
    *   Create a `CanvasRenderSystem` (ECS System).
    *   Input: `WorldState` (Entities).
    *   Output: `Blob` (PNG).
    *   Logic: It should iterate entities and draw them using the *exact same* math/style constants as V1's `canvasDraw.ts`.

### 💾 Persistence (Data Layer)
*   **Serialization**: We already implemented `registry.serialize()`.
    *   **Upgrade needed**: We need an `ImagePool` mechanism. Currently, `Visual` components store raw Base64. We should extract them to `IndexedDB` or `localStorage` separate from the JSON blob.
*   **Auto-Save**: Implement a `PersistenceSystem` that subscribes to `command.onExecute` and saves a snapshot to `localStorage`.

### ✨ Interaction (UX Layer)
*   **Drag Ghosts**: `useDrag.ts` handles logic, but we need to ensure the *Visual* feedback mimics V1.
    *   Current V3: Moves the actual entity (Transform).
    *   **V1 Feel**: Keep the entity in place, show a "Ghost" at cursor, and a "Drop Indicator" at the target slot.
    *   **Action**: Upgrade `useDrag.ts` to spawn a temporary "Ghost Entity" or use a Vue-level overlay for the drag visual to match V1's solidity.

## 3. Design System Mapping (Default Appearance)

To make V3 look like V1 by default:

*   **Colors**:
    *   `bg`: `#f9fafb` (gray-50)
    *   `border`: `#000000` (Solid 2px)
    *   `accent`: `#e4007f` (Pink for highlights)
*   **Typography**:
    *   `font-canvas`: `'Noto Serif SC', serif` (For the "Magazine" feel in the Grid/Export).
    *   `font-ui`: `Inter`, `system-ui`, `sans-serif` (For the Editor interface).
*   **Layout**:
    *   `gap`: 0 (Grid lines overlap).
    *   `aspect-ratio`: `120 / 212` (Tall portrait).

## 4. Summary Checklist for V3

*   [ ] **Port `CanvasGenerator`**: Rewrite `canvasDraw.ts` to accept `Registry` instead of `GridItem[]`.
*   [ ] **Image Pool**: Refactor `TemplateLoader` / `Registry` to store images by ID, not Value.
*   [ ] **Font Scaling**: Implement the "Shrink-to-fit" logic in the V3 Text Rendering system.
*   [ ] **Smart Proxy**: Port the `wsrv.nl` proxy logic for external images.

**Verdict**: V3 has the structure (ECS) but needs the "Skin" (Canvas Renderer) and "Brain" (Persistence/Pooling) of V1 to succeed.
