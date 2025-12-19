# AnimeGrid Project: Architecture Analysis & Agent Guidelines

> **Date:** 2025-12-18
> **Scope:** Architecture Review, Code Standards, Future Roadmap

---

## 1. 🚨 Mandatory Agent Guidelines (The "Iron Rules")

All agents modifying this codebase **MUST** adhere to these rules. Deviations will cause build failures, runtime errors, or data corruption.

### 1.1 Service Layer Enforcement
*   **RULE:** NEVER call `fetch()` directly inside a Vue component (`.vue`).
*   **WHY:** Authentication tokens, error handling, and API base paths are centralized in `src/services/api.ts`.
*   **ACTION:**
    *   Check `src/services/api.ts` for existing methods.
    *   If missing, add a new method in `api.ts` first, then call `api.methodName()` in the component.

### 1.2 Database & Backend (Cloudflare D1)
*   **RULE:** When modifying SQL in `functions/api/...`, strictly verify `.bind()` parameter order.
*   **WHY:** SQLite via Cloudflare D1 uses positional arguments (`?`). One extra argument or wrong order will crash the query without a clear compile-time error.
*   **RISK:** High. The backend relies on raw SQL strings.
*   **ACTION:** Always count the `?` in the query and match the `.bind(a, b, c)` arguments 1:1.

### 1.3 State Management
*   **RULE:** Use `useGridStore` (`src/stores/gridStore.ts`) for all "Grid" related data (current template, user answers).
*   **WHY:** The app uses `createGlobalState` + `useStorage` for persistence. Component-local state is lost on refresh.
*   **Forbidden:** Do not create parallel stores or use `Pinia` (unless explicitly refactoring the whole app). Stick to the existing VueUse pattern.

### 1.4 Type Safety
*   **RULE:** Shared types MUST live in `src/types/`.
*   **WHY:** Frontend and Backend share interfaces (e.g., `GridItem`).
*   **ACTION:** If you change a DB column, update `src/types/grid.ts` immediately.

---

## 2. ⚠️ Analysis of "Non-Standard" & Risky Components

These areas are identified as "Technical Debt" or "Fragile Patterns". They exist for specific reasons but need care.

### 2.1 `src/logic/templates.ts` (The Monolithic Config)
*   **Status:** A single TypeScript file containing ALL template definitions (hundreds of lines).
*   **Critique:** "Non-Standard". usually this data comes from a DB or CMS.
*   **Why it is like this:**
    *   **Speed:** Zero-latency loading (templates are bundled in JS).
    *   **Simplicity:** No need to build an Admin Panel to manage templates. Deploy = Update.
*   **Hidden Danger:** Bundle size will grow. Merge conflicts are frequent if multiple branches edit templates.
*   **Agent Advice:** When adding templates, be careful not to break the JSON structure.

### 2.2 Raw SQL in `functions/api`
*   **Status:** Usage of `env.DB.prepare('SELECT ...').bind(...)`.
*   **Critique:** Most modern apps use an ORM (Drizzle, Prisma).
*   **Why it is like this:**
    *   **Performance:** Raw SQL on D1 is the fastest execution path on Edge.
    *   **Overhead:** Avoiding the setup complexity of an ORM for a relatively simple schema.
*   **Hidden Danger:** SQL Injection is mitigated by binding, but **Parameter Mismatch** is a constant risk.
*   **Agent Advice:** Double-check every SQL change.

### 2.3 `gridStore` Persistence Strategy
*   **Status:** `useStorage` (LocalStorage) mirroring.
*   **Critique:** Aggressive sync can cause performance hit on main thread if data is huge.
*   **Why:** Provides "Offline First" feel and robustness against accidental refresh.
*   **Hidden Danger:** `localStorage` has a size limit (usually 5MB). If user saves 1000 grids locally, it might crash.
*   **Agent Advice:** Monitor data size. Future refactor should consider IndexedDB.

---

## 3. 🔮 Project Future & Roadmap

### 3.1 Immediate Next Steps (P0)
*   **Party War (Vote Stats):**
    *   Based on `saves` table data, aggregation statistics occur, and the highest frequency role in the slot is found.
    *   Backend: Aggregate `saves` table to find "Top Characters per Slot".
    *   Frontend: Show popular choices when clicking a slot.
    *   *Agent Note:* This requires complex SQL aggregation (`GROUP BY slot_id, character_id`).

### 3.2 Medium Term (P1)
*   **Candidate Pool (Prescriptive Grids):**
    *   Some templates (like "Best of 2024") should restrict choices to a specific list.
    *   Schema change: Add `pool` column to templates (or handle in code).

### 3.3 Long Term (Refactors)
*   **ORM Adoption:** Transition to Drizzle ORM to solve the SQL parameter fragility.
*   **Image Optimization:** Move away from Base64 completely (already in progress via Cloudflare R2/Cache).

---

## Summary for Agents
*   **Do:** Keep Logic Pure (`src/logic`), Keep Components Dumb (`src/components`), Keep Services Unified (`src/services`).
*   **Don't:** Write SQL without counting `?`. Don't fetch in `.vue` files. Don't add generic "utils" files if they belong in specific `src/logic` modules.
