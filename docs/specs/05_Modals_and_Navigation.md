# Navigation & Modals System Interaction Specification

> **Scope**: Global overlays, transitions, and component lifecycle during switching.

## 1. Modal System Architecture
The app uses **Local State Modals** (boolean refs in parent), not a global Modal Store.
- **Pros**: Simple, localized logic.
- **Cons**: Can't stack easily (z-index wars).

## 2. Key Modals

### 2.1 Search / Add Modal (`Search.vue`)
- **The "God Component"**.
- **States**:
  1.  **Search (Default)**: API results.
  2.  **Custom Upload**: Cropper UI.
- **Transitions**:
  - **Open**: `<Transition name="fade">` (opacity).
  - **Mobile**: Fullscreen fixed.
  - **Desktop**: Centered Card (max-w-4xl).
- **Z-Index**: `50`. High enough to cover Grid, low enough for Sonner Toasts (`z-50` overlap risk).

### 2.2 Video Export Modal (`VideoExportModal.vue`)
- **Flow**:
  1.  **Init**: Shows settings (FPS, Duration).
  2.  **Generating**: Shows Progress Bar (0-100%).
      - *Lock*: Cannot close by clicking outside (prevent accidental abort).
  3.  **Success**: Shows `VideoSuccessModal.vue`.

### 2.3 Template Gallery (`TemplateGalleryModal.vue`)
- **Layout**: Grid of Cards.
- **Interaction**:
  - Click Card -> Select & Close.
  - Click "Custom" -> Navigate to `/create`? (Currently just filters).

## 3. Mode Switching (The "Big Switch")

### 3.1 Home -> Streamer Mode
1.  **Trigger**: User clicks "Enter Streamer Mode".
2.  **State**: `isStreamerMode = true`.
3.  **Reactivity**:
    - `GridEditor` detects change.
    - **Destroys** Standard Layout.
    - **Mounts** Streamer Layout (`<template v-if="isStreamerMode">`).
    - **Mounts** `StreamerDock`.
4.  **UX**: Instant swap. No transition animation (hard cut).

### 3.2 Route Navigation (Home <-> Create)
- **Library**: `vue-router`.
- **Home (`/`)**:
  - checks `query.id`. If present, redirects or loads template.
- **Create (`/create`)**:
  - Independent page.
- **Transitions**: Default browser navigation (no page transition animations implemented).

## 4. Error Handling
- **Toast System**: `vue-sonner`.
- **Position**: Top Center.
- **Persistence**: Toasts survive route changes.
