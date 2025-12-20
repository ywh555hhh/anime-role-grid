# Official Mode (官方模式) Interaction Specification

> **Version**: 1.0.0
> **Scope**: The default behavior on `oshigrid.me/`.

## 1. Overview
Official Mode loads predefined templates (JSON) from `src/logic/templates.ts`. Users fill in blanks but cannot change the structure (rows/cols/labels).

## 2. Data Flow
- **Source**: `TEMPLATES` constant.
- **State**: `useGridStore`.
  - `currentTemplateId`: e.g., `'classic'`, `'genshin'`.
  - `currentList`: Array mapping to the template slots.
- **Persistence**: `savedGrids[templateId]` (localStorage). Switching templates preserves data for each template.

## 3. Core Interactions (Home.vue)

### 3.1 Switching Templates
1.  **Trigger**: Click "当前模板: [Name]" button or "切换模板" icon.
2.  **UI**: Opens `TemplateGalleryModal.vue`.
3.  **Logic**:
    - User selects item.
    - `store.loadTemplate(id)`.
    - **Logic**:
      - If `savedGrids[id]` exists: Load it.
      - If not: Create empty list based on `OfficialTemplate.items` length.
      - **Merge Logic**: If Template updated (more items), merge old answers into new structure.

### 3.2 Resetting Tags
1.  **Trigger**: "重置当前模板所有标签" button.
2.  **Logic**:
    - Confirms with user.
    - Iterates `currentList`.
    - Resets `item.label` to `OfficialTemplate.items[i]`.
    - **Preserves**: `item.character` (Image/Name). *Critical for UX*.

### 3.3 Search & Add
- **Mode**: `single` (Standard).
- **Behavior**:
  - Click Slot -> Open Search.
  - Click Result -> `emit('add')` -> Closes Search -> Fills Slot.
  - **No Dock**: Direct mapping.

## 4. Mobile Layout
- **Stack**: Header -> Grid -> Action Buttons -> Footer.
- **Canvas**: `GridCanvas` scales width to 100%.

## 5. Edge Cases
- **Legacy Data**: If user visited v1.0, `gridStore` migrates `legacyGrids` to `savedGrids` on first load.
- **Missing Template**: If URL param ID is not found in `TEMPLATES`, falls back to `'classic'`.
