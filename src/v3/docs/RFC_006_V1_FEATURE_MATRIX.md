# RFC 006: V1 Feature Matrix & V3 Strategy

## 1. Goal
To list all high-value features from the V1 / V2-Legacy codebase and map them to the V3 Plugin Architecture.

## 2. Feature Matrix

| Feature Group | Feature Name | V1 Implementation | V3 Target Architecture |
| :--- | :--- | :--- | :--- |
| **Grid Interaction** | **Fill Slot** | Click Slot -> Search | **System**: `InteractionSystem` handles click. <br> **UI**: `ctx.overlays.open('search')` |
| | **Clear Slot** | UI Button / Right Click | **Action**: `Command: CLEAR_SLOT` |
| | **Swap Slot** | Drag & Drop | **System**: `DragSystem` (already planned) |
| | **Show Name** | Global Toggle (Checkbox) | **ComponentProp**: `VisualComponent.showLabel` <br> **System**: `RenderSystem` logic |
| **Search & Assets** | **Search Panel** | `Search.vue` (Bottom Sheet) | **Plugin**: `SearchPlugin` (registers `SearchOverlay`) |
| | **Trending** | `TrendingGuideModal` | **Data**: Part of Search Logic. |
| | **Cropper** | Built-in functionality | **Plugin**: `ImageEditorPlugin` (invoked via `startCrop()` API) |
| **Template** | **Library** | `TemplateGalleryModal` | **Plugin**: `TemplateLibraryPlugin` (registers `GalleryModal`) |
| | **Custom** | "I want to create" button | **Flow**: Opens Custom Config Form (Modal) |
| **Export** | **Save Image** | `ImageExportModal` | **System**: `ExportSystem` (Generates Blob) <br> **UI**: `ExportResultModal` |
| | **Video** | `VideoExportModal` | **System**: `VideoEncoderSystem` (WebCodecs) |
| **Promotions** | **Easter Eggs** | `easterEggs.ts` logic | **System**: `PromotionSystem` (listens to `entity:changed`) |
| | **Updates** | `FirstTimeGuide.vue` | **System**: `NotificationSystem` (OnBoot check) |

## 3. UI Component Strategy (V3)
The User requested "Proper UI Components" (Buttons, Modals).

### 3.1 Buttons
*   **Style**: Non-Serif (Modern).
*   **V3 Implementation**:
    *   Plugins register "Actions" (`IAction`).
    *   `Workbench` renders actions in the Toolbar.
    *   *No hardcoded buttons in Layout*.

### 3.2 Modals (New System)
*   **Requirement**: "Unified Modal Management".
*   **Design**: `OverlayManager` service.
*   **See RFC 007**.

## 4. Aesthetic Rules (V1 Restoration)
*   **Canvas Elements**: `Noto Serif SC` (Songti), Black Borders.
*   **UI Elements**: `Inter` / `sans-serif`, Modern looking.
*   **Colors**: Primary `#e4007f`.

## 5. Development Priority
1.  **OverlayManager** (RFC 007) - Prerequisite for Search/Modals.
2.  **StandardGridPlugin**:
    *   Implement `GridCanvas` (View).
    *   Implement `Show Name` toggle.
3.  **InteractionSystem**:
    *   Implement Click -> Open Search.
4.  **SearchPlugin**:
    *   Port `Search.vue` logic.
