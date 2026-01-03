# V3 UI/UX Design Codex & Best Practices

> [!IMPORTANT]
> **To All AI Agents / Developers**:
> This document codifies the "Lesson Learned" from the UI Polishing phase. 
> Violating these rules will result in "Cheap" (廉价) or "Broken" (不可用) UI on mobile.
> **All new UI components MUST pass this checklist.**

## 1. Mobile Responsiveness (移动端优先)

### 1.1 The "Unusable" Threshold
Any component that relies on:
- Fixed width cards (e.g., `w-32`) without wrapping or scaling.
- Fixed height modals (e.g., `h-[90vh]`) without overflow handling.
- Mouse-only interactions (Hover effects without Click alternatives).
...is considered **BROKEN**.

### 1.2 Layout Strategy: Drawer vs Modal
- **Desktop**: Centered Modal / Dialog (`rounded-xl`, `max-w-xl`).
- **Mobile**: Full-screen View or Bottom Drawer (`w-full`, `h-full`, `rounded-none`).
  - **Do NOT** use small centered modals on phones; they feel cramped.
  - **Example**: `PresetGalleryOverlay.vue` switches from `md:w-[90vw]` (Modal) to `w-full h-full` (Fullscreen) on mobile.

### 1.3 Sidebar Navigation
- **Desktop**: Vertical Sidebar (Left/Right).
- **Mobile**: **Horizontal Top/Bottom Scroll Strip**.
  - Vertical sidebars eat 30% of the phone screen, fixing them makes content squashed.
  - Convert `flex-col` sidebars to `flex-row overflow-x-auto` on mobile.

## 2. Grid System Scaling (表格缩放)

### 2.1 Scale > Scroll
For complex grids (like the Stat Grid) that have a fixed aspect ratio or fixed "Physical" layout (e.g. 3x3):
- **Avoid**: Horizontal Scrolling (Users hate panning to see the 3rd column).
- **Prefer**: **CSS Transform Scaling** (`transform: scale(0.8)`).
  - Detect container width.
  - Calculate `scale = effectiveWidth / requiredWidth`.
  - Apply `transform-origin: top center`.

### 2.2 The "Ghost Space" Fix
Scaling using `transform` creates visual space but leaves the original layout flow size (creating a gap below).
- **Formula**: Apply negative margin bottom:
  ```ts
  const marginBottom = -(originalHeight * (1 - scale));
  ```

## 3. Typography & Input (文字与交互)

### 3.1 Text Wrapping (防换行)
- **Buttons**: Always add `whitespace-nowrap` to action buttons.
  - If they don't fit, use `flex-wrap` on the *container* or `overflow-x-auto`.
  - Never let button text wrap (e.g. "Save\nImage"). It looks broken.
- **Headers**: Long titles on mobile must NOT break alignment.
  - Use `whitespace-nowrap overflow-x-auto no-scrollbar`.
  - Allow user to pan the text if it's too long.

### 3.2 Placeholders (真正可用的占位符)
- **Do NOT** rely solely on CSS `:empty` selector. Browsers often insert `<br>` or hidden whitespace.
- **Solution**: Use JS-based state (`isEmpty`).
  - Listen to `input`, `blur`, `focus`.
  - Strip `\n`, `\r`, whitespace to check emptiness.
  - Apply `.is-empty` class to trigger CSS `::before` content.

### 3.3 Enter Key Behavior
- Single-line inputs (Titles, Tags) must intercept `Enter`.
- **Action**: `@keydown.enter.prevent="$event.target.blur()"`.
- Do not allow users to accidentally create multi-line titles in 30px high headers.

## 4. Aesthetic Rules (审美规范)

### 4.1 Rank & Badges
- **No Cheap Gradients**: Avoid default "Rainbow" or "Neon" gradients unless specifically designed.
- **Flat is Premium**: Solid colors (Theme Pink/Rose) often look more premium than complex gradients on small badges.
- **Consistent Rounding**: If placing a badge on a card corner, ensure `border-radius` matches the card's radius (e.g. `rounded-tl-xl`).

### 4.2 Spacing
- **Mobile**: `p-4` is standard. `gap-2` or `gap-4`.
- **Desktop**: `p-6` or `p-8`. `gap-6`.
- **Scale**: Use responsive prefixes (`md:p-6`) liberally.

---

> [!TIP]
> **Check before you commit:**
> 1. Does it scroll horizontally on mobile? (If not intentional -> Scale it).
> 2. Does the text wrap inside buttons? (If yes -> `whitespace-nowrap`).
> 3. Does the Modal cover 95%+ of the screen on mobile? (If no -> Make it full width).
