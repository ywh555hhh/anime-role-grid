# RFC 012: Export Architecture & Best Practices

## 1. Canvas Export Strategy (The "Golden Rule")

### Problem: Overlapping Borders
When drawing grids on HTML Canvas, sequentially drawing "Cell Background + Cell Border" in a single loop causes the background of subsequent cells (N+1) to overdraw the borders of previous cells (N), especially when borders are shared or >1px thick. This results in uneven line thicknesses (e.g., top/left lines look thin, bottom/right lines look thick).

### Solution: The Two-Pass "Painter's Algorithm"
To guarantee perfect, uniform border thickness (e.g., solid 4px), we must separate the content drawing from the border drawing.

1.  **Pass 1 (Background Layer)**: Iterate through all grid items and draw **only** the cell background (images, fill colors).
2.  **Pass 2 (Foreground Layer)**: Iterate through all grid items and draw **only** the borders.

By drawing ALL borders after ALL backgrounds, no border is ever occluded.

### Implementation Pattern (TypeScript)
```typescript
// LOOP 1: Content
for (const item of items) {
    drawCellContent(item); // Images, Fills
}

// LOOP 2: Borders
ctx.lineWidth = 4;
ctx.lineCap = 'square';
for (const item of items) {
    drawCellBorders(item); // Strokes
}
```

### V1 Parity Logic
To match the V1 aesthetic exactly:
- **Outer Frame**: Draw a single `rect()` around the entire grid at the end.
- **Inner Borders**: For each cell, draw only the **Right** and **Bottom** borders.
- **Exceptions**: logic `if (!isLastCol)` and `if (!isLastRow)` prevents double-drawing or overlapping with the outer frame.

## 2. DOM Export Strategy (WYSIWYG)

### Problem: White/Blank Images
When exporting a cloned DOM element that is hidden (e.g., `display: none` or detached from DOM), `html2canvas` or `modern-screenshot` often fails to render content, resulting in a white image.

### Solution: "Visible but Hidden" Clone
1.  **Clone**: `element.cloneNode(true)`.
2.  **Position**: Place at `top: 0, left: 0`.
3.  **Hide**: Use `z-index: -9999` to place it visually behind the app background, but valid within the viewport.
    *   *Do NOT use* `opacity: 0` or `visibility: hidden` as some engines capture that state.
    *   *Do NOT use* `left: -9999px` as off-screen rendering is sometimes culled.

### CORS & Network Images (The "Preload" Pattern)
Simply rewriting `src` in `onClone` is **insufficient** because the screenshot library may capture the clone before the new proxy images have finished loading.

**Correct Workflow:**
1.  **Manual Clone**: `cloneNode(true)`.
2.  **Inject Proxy**: Rewrite all `img.src` to `wsrv.nl` and set `crossOrigin = 'anonymous'`.
3.  **Wait**: Create a `Promise` for each image's `onload` event. `await Promise.all(promises)`.
4.  **Capture**: Call `domToPng(clone)` only *after* images are ready.

## 3. Visual Consistency (CSS)
To ensure the WYSIWYG view matches the clean Canvas output:
- **Grid Container**: responsible for **Top** and **Left** borders (`border-t-2`, `border-l-2`).
- **Grid Items**: responsible for **Right** and **Bottom** borders (`border-r-2`, `border-b-2`).
This "Interlocking Borders" strategy eliminates the need for `gap` or overlapping negative margins, ensuring exactly 1 border width (2px) between any two cells.

## 4. Retrospective: Troubleshooting & Pitfalls (Lessons form the Trenches)

### A. The "White Image" Trap
*   **Symptom**: Exported image is correct size but completely blank/white.
*   **Cause**: Cloning an element and positioning it off-screen (`left: -9999px`) or appending it to a hidden container often causes the browser to "cull" the rendering, resulting in a blank screenshot.
*   **Fix**: Place the clone at `top: 0, left: 0` but hide it using `z-index: -9999`. This keeps it in the viewport (renderable) but behind the UI.

### B. The "Massive Whitespace" Bug
*   **Symptom**: Exported image has huge padding or is showing the full viewport width (e.g., 4000px wide for a 500px grid).
*   **Cause**: The screenshot library (modern-screenshot/html2canvas) defaults to the window width if not restricted.
*   **Fix**:
    1.  Explicitly set `width: fit-content` on the clone via style overrides.
    2.  Ensure `transform: none` is set to remove screen-scaling artifacts.
    3.  Pass specific `style` overrides in `ExportOptions` to strip "editor-only" styles like expansive padding.

### C. The "Style Override" Silent Failure
*   **Pitfall**: We tried to pass `style: { padding: '12px' }` but it had no effect.
*   **Cause**: The service layer didn't implement the logic to apply `options.style` to the DOM clone.
*   **Lesson**: Always verify the "plumbing" (Service Layer) before debugging the "faucet" (UI Layer).

### D. Canvas Line Thickness
*   **Pitfall**: Mixing content drawing and border drawing in the same loop.
*   **Result**: 50% chance a border is partially overwritten by the next cell's background.
*   **Fix**: Always separate rendering into distinct layers (loops): Backgrounds first, Borders last.

