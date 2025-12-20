# Streamer Mode (主播模式) Interaction Specification

> **Version**: 1.0.0
> **Target Role**: Product Manager / Developer / QA
> **Scope**: The logic and behavior of `isStreamerMode = true`.

## 1. Overview
Streamer Mode is a specialized "Game-Like" UI for live content creators, providing a clean, tool-assisted environment for ranking characters.

**Entry Points**:
- Click "进入主播模式 (Beta)" in `GridActionButtons` on Home.
- **Persistence**: `localStorage` key `anime-grid-mode-streamer`. Reloading page stays in this mode.

## 2. Core Layout (GridEditor.vue)

| Feature | Desktop Implementation (`md:`) | Mobile Implementation (`< md`) |
| :--- | :--- | :--- |
| **Viewport** | Fixed `100dvh`, No Scroll. | Fixed `100dvh`, No Scroll. |
| **Canvas Area** | Centered, Pan/Zoom capable (Buttons). | Centered, Stacked. |
| **Toolbar** | Floating Left Center. | Floating Right Bottom vertical. |
| **Dock** | Right Sidebar (`w-60`). | Bottom Drawer (`h-48`). |
| **Overlay** | `Header` / `Footer` hidden. | `Header` / `Footer` hidden. |

## 3. Component: StreamerDock.vue
**Role**: Holds the "Card Pool" (characters to be ranked).

### 3.1 Interaction: Adding Characters
- **User Action**: Click "+" (Big Button).
- **System**: Opens `Search.vue` in `mode="streamer"`.
- **Search Behavior**:
  - `emit('add')` -> `gridStore.addToDock()`.
  - **Toast**: "已添加到卡池: xxxx".
  - **Difference**: Does NOT auto-close Search modal (allows batch adding).

### 3.2 Interaction: Dragging (The Core Loop)
- **Library**: `vue-draggable-plus` (Sortable.js).
- **Group**: `'grid'` (Shared with Canvas).
- **Behavior**:
  - **Pull**: `'clone'` (Copy item, don't remove from Dock).
  - **Ghost**: Simplified semi-transparent clone.
- **Mobile Specifics**:
  - `forceFallback: true`: Uses a DOM clone instead of native HTML5 drag to support iOS touch.
  - **Long Press**: Deleting items requires long-press to enter "Shake Mode" (prevent accidental deletes).

### 3.3 Interaction: Trash Can
- **Desktop**: Drop item into the "Trash Zone" (GridAction slot) or right-click item.
- **Mobile**: Long press -> Click 'X' on item. OR Drag item to Trash Bin button.

## 4. Component: Toolbar (GridEditor.vue)
**Position**: Fixed absolute.
**States**:
- **Expanded**: Shows Undo, Redo, Toggle Names, Lock, Fullscreen, Save.
- **Collapsed**: Shows only "Expand" arrow.
- **Responsive**:
  - Desktop: Expands Vertically.
  - Mobile: Expands Vertically (Right aligned).

## 5. Edge Cases
- **Refresh**: `dockItems` are saved to localStorage.
- **Resize**: Dock transitions from Bottom to Right (`transition-all`).
- **Scroll Lock**: `Search.vue` forces `body { overflow: hidden }` to prevent background jitter.
