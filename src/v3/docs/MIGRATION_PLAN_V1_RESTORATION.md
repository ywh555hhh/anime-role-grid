# Migration Plan: V1 Restoration (V3 Implementation)

## 1. Objective
Restore the **V1 "Magazine Aesthetic"** and **Core Experience** on the new V3 ECS Engine.
"V2" is deprecated; we take the *Best of V1* and build it right.

## 2. The "V1 Soul" Checklist
To achieve "One-to-One" replication, we must port these specific features:

### A. Aesthetic (StandardGridPlugin)
*   **Font**: `Noto Serif SC` (Songti) for all canvas elements.
*   **Colors**: `#e4007f` (Magenta) Primary, `#000` Borders (2px solid).
*   **Layout**: `120x212` ratio tiles, gap-0, collapsed borders.
*   **Logic**: Auto-shrinking font size (never wrap).

### B. Core Features (Plugins)
*   **Search**:
    *   Dynamic Heatmap (Trending) when empty.
    *   BGM.tv API proxy + Client-side year/type filtering.
*   **Upload**:
    *   Integrated Cropper (800px width).
*   **Export**:
    *   **Image**: High-res Canvas drawing (off-screen).
    *   **Video**: WebCodecs MP4 export (V1 Black Tech).

## 3. Implementation Roadmap

### Phase 3.1: The Renderer (StandardGridPlugin)
*   **Task**: Reimplement `canvasDraw.ts` as `StandardGridView.vue`.
*   **Change**: Instead of drawing to a hidden canvas for export, V3's *Main View* IS the Canvas (using Vue reactivity or HTML-over-Canvas).
    *   *Correction*: To match V1 exactly, we might want to keep using HTML/CSS for the editor for sharpness/a11y, but use the `canvasDraw.ts` logic for the *Export System*.
    *   **Decision**: View = HTML DOM (Magazine Style CSS). Export = Offscreen Canvas (drawing logic).

### Phase 3.2: Data Bridge (LegacyAdapter)
*   **Goal**: Users coming from V1/V2 must see their data.
*   **Source**: `localStorage['anime-grid-data-v2']` (and v1).
*   **Action**: On boot, read this data and populate the ECS Registry.
*   **Sync**: `LegacySyncSystem` writes back to `localStorage` to ensure safety.

### Phase 3.3: Search Overlay
*   **New UI**: A "Spotlight" style overlay (Cmd+K or Click Slot).
*   **Logic**: Reuse `src/logic/search.ts` but remove Pinia dependencies.

## 4. Execution Order
1.  **StandardGridPlugin**: Build the DOM View using V1 CSS tokens.
2.  **LegacyAdapter**: Load user's existing data so the View isn't empty.
3.  **Interaction**: Implement Click-to-Search.
