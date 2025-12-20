# UG Mode (Custom Template) Interaction Specification

> **AKA**: User Generated Mode / Custom Mode
> **Scope**: Viewing a shared template (e.g., `/t/12345`).

## 1. Overview
UG Mode allows users to fill out a grid created by someone else. The structure is fetched from Cloudflare D1.

## 2. Load Process (`ViewTemplate.vue`)
1.  **Route**: `/t/:id`.
2.  **Fetch**: `api.getTemplate(id)` called in `onMounted`.
3.  **Store**:
    - `isCustomMode = true`.
    - `currentTemplateId = id`.
    - `currentConfig` = Fetched JSON (cols, items, creator).
4.  **Error Handling**:
    - 404: Show "Template Not Found" error state.
    - Network Error: Show Retry button.

## 3. Interactions

### 3.1 Read-Only Fields
- **Title**: Locked (Displayed from DB).
- **Labels**: Locked (Cannot reset to "default" because the DB *is* default).
- **Creator**: Shown in footer or subtitle.

### 3.2 Filling the Grid
- **Identical to Official Mode**:
  - Click Slot -> Search/Upload -> Fill.
- **Persistence**: Saved under `savedGrids[uuid]`.
  - *Risk*: UUIDs can be long, localStorage limits apply.

### 3.3 "I Want to Make One"
- **CTA**: "我也要出题" floating button or Footer link.
- **Action**: Navigates to `/create`.

## 4. Difference from Official Mode
| Feature | Official | UG / Custom |
| :--- | :--- | :--- |
| **Source** | Local Constant (`templates.ts`) | Remote DB (`api.getTemplate`) |
| **Labels** | Can "Reset to Default" | Fixed at creation |
| **Export** | Standard styles | "Challenge Mode" style (includes QR code space) |
| **Voting** | N/A (Usually) | Optional `voting: true` config sends stats back |
