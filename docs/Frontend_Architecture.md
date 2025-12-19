# Frontend Architecture & Tech Stack Guide

## 1. Technology Stack Assessment
**Verdict**: A+ (Modern, High Performance, Sustainable)

| Technology | Role | Status & Future Viability | Maintenance Cost |
| :--- | :--- | :--- | :--- |
| **Vue 3 (Script Setup)** | Framework | **Standard**. Vue 3 is mature and widely used. The `script setup` syntax is concise and standardizes best practices. | **Low**. Excellent ecosystem stability. |
| **Vite** | Build Tool | **Industry Leader**. Replaced Webpack as the default for modern web dev. Instant server start and HMR (Hot Module Replacement). | **Very Low**. "It just works." |
| **UnoCSS** | Styling | **Cutting Edge**. Atomic CSS engine (similar to Tailwind but faster/lighter). | **Low**. Configuration-based (`uno.config.ts`), avoiding CSS bloat. |
| **TypeScript** | Language | **Essential**. Provides type safety, reducing runtime bugs. | **Medium**. Requires defining interfaces (which we improved in Phase 3). |

**Conclusion**: The current stack is robust. It avoids "hype-driven development" while using modern, performant tools. It is well-suited for a project of this scale and easy for new agents/developers to pick up.

---

## 2. Project Structure

### Principles
We follow a **"Smart vs. Dumb" (Container vs. Presentational)** Component Architecture, especially after the `GridEditor` refactor.

- **Smart Components (Containers)**: Handle logic, API calls, and state management.
    - Example: `GridEditor.vue` (Manages modas, loading, save logic).
- **Dumb Components (Presentational)**: Receive props, emit events, render UI. Pure functions of their props.
    - Example: `GridCanvas.vue` (Just renders the grid).
    - Example: `GridActionButtons.vue` (Just renders buttons).

### Directory Guide

```text
src/
├── components/          # Vue Components
│   ├── GridEditor.vue   # [Smart] Main Orchestrator
│   ├── GridCanvas.vue   # [Dumb] Grid Rendering
│   ├── Search.vue       # [Smart] Search Logic + UI
│   └── ...
├── logic/              # Pure Business Logic (Non-UI)
│   ├── export.ts       # Image Generation (Canvas API)
│   ├── video-export.ts # Video Generation (Mp4-muxer)
│   └── constants/      # Static data (Changelogs, Templates)
├── stores/             # Global State Management
│   └── gridStore.ts    # Central "Brain" for grid data
└── styles/             # Global CSS (minimal, mostly handled by UnoCSS)
```

---

## 3. Design System (UnoCSS)
We avoid hardcoded styles (e.g., `style="color: #e4007f"`). Instead, we use semantic utility classes defined in `uno.config.ts`.

### Core Tokens
| Concept | Class | Value | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Color** | `text-primary`, `bg-primary` | `#e4007f` (Pink) | Main branding, Actions |
| **Buttons** | `btn-primary` | Shortcut | Main Call-to-Action buttons |
| **Cards** | `card-base` | Shortcut | White cards with shadow/radius |
| **Borders** | `border-std` | `border-gray-200` | Standard structural borders |

**How to maintain**:
If you want to change the brand color, edit **ONLY** `uno.config.ts`. The entire app will update.

---

## 4. State Management (GridStore)
We use `vueuse/createGlobalState` (a lightweight Pinia alternative) in `src/stores/gridStore.ts`.

- **Responsibility**: Persist user inputs (`currentList`, `templateId`) to `localStorage/sessionStorage`.
- **Why**: Ensures users don't lose work if they refresh the page.

### Best Practices for Agents
1.  **Don't Mutate Props**: If a component needs to change data, emit an event (`emit('update:value')`) or call a Store action.
2.  **Use Semantic Types**: Import interfaces from `src/types.ts` (e.g., `GridItemCharacter`) instead of using `any`.
3.  **UI Consistency**: Always use `btn-primary`, `text-primary` from UnoCSS.

---

## 5. Deployment & CI/CD
- **Platform**: Cloudflare Pages.
- **Command**: `npm run build` (runs `vue-tsc` type checking + `vite build`).
- **Serverless**: `functions/` directory contains backend logic (Cloudflare Pages Functions).
