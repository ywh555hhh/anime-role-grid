# 🤖 System Context for Architect AI

> **To the Architect AI**:
> This document is your "Need-to-Know" packet. It summarizes the current state of `anime-role-grid` so you can immediately provide high-level advice without reading every file.
> Use this to validate the Lead Dev's (my) implementation plans and answer the Captain's (User's) strategic questions.

---

## 1. Project Identity
*   **Name**: Anime Role Grid (二次元成分表 / 我推的格子)
*   **Type**: Serverless Web Application (SPA + Edge Functions).
*   **Core Value**: Allows ACG fans to create 3x3 or 4x4 grids of their favorite characters, export them as images/videos, and share them on social media (TikTok/Bilibili).
*   **Stage**: **Late Beta / Pre-Production**. (Streamer mode just added).

## 2. Tech Stack (The "What")
*   **Frontend**: Vue 3 (Script Setup), Vite, UnoCSS, Pinia (via `createGlobalState`), Vue Router.
*   **Backend**: Cloudflare Pages Functions (Edge).
*   **Database**: Cloudflare D1 (SQLite).
*   **Storage**: None (Images are Base64 in LocalStorage or proxied via `wsrv.nl`).
*   **External**: Bangumi API (ReadOnly) for character data.

## 3. Architecture Decisions (The "Why")

### 3.1 The "No-Image-Database" Strategy
*   **Decision**: We DO NOT store user-uploaded images in R2 or D1.
*   **Reasoning**: Cost & Liability. Storing user images is expensive and invokes moderation risks.
*   **Mechanism**:
    *   **User Uploads**: Stored as Base64 in `localStorage` (client-side only). When exporting, drawn to Canvas locally.
    *   **Public Data**: We only store `bangumi_id`. When rendering public stats, we fetch metadata live from Bangumi or use reliable CDNs.

### 3.2 Streamer Mode (The "App-Shell")
*   **Decision**: A completely separate UI layout for streamers (`fixed inset-0`), bypassing normal document flow.
*   **Reasoning**: Streamers need a "Game UI" feel. OBS capturing requires fixed elements.
*   **State**: Uses `useRefHistory` for Undo/Redo.

### 3.3 Hybrid Templates (OF vs UG)
*   **Decision**: Same Store logic for Official (Hardcoded) and User-Generated (DB) templates.
*   **Implication**: UI components don't care about the source.

## 4. Current Hotspots & Risks (The "Watch Out")

### 🚨 Critical Security
1.  **Privacy Salt**: currently hardcoded in `functions/api/save.ts`. Needs migration to Cloudflare Secrets.
2.  **Bangumi Token**: Exposed in frontend code. Needs migration to Backend Proxy (`functions/api/search.ts`).

### ⚠️ Performance
1.  **Stats Caching**: `functions/api/stats/` has caching logic **DISABLED** (`// FORCE FRESH`). High traffic will kill the DB.
2.  **Memory**: `useRefHistory` stores deep clones of the grid. If users put many Base64 images in the grid, RAM usage on the client will spike.

## 5. Development Workflow (The "How we work")
*   **RFC**: All features start with an `implementation_plan.md`.
*   **Roles**:
    *   **You (Architect)**: Review high-level logic, security, and business alignment.
    *   **Antigravity (Me)**: Implement code, fix bugs.
    *   **Captain (User)**: Approves direction.

## 6. Directory Map
*   `src/components/GridEditor.vue`: 🐲 The Monolith. Handles main logic. Needs refactoring.
*   `src/stores/gridStore.ts`: 🧠 The Brain. Manages state and D1 sync.
*   `functions/api/`: ☁️ The Backbone.
*   `docs/`: 🗺 The Knowledge Base.

---

**End of Context**
