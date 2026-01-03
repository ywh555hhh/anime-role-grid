# V3 Persistence Layer

The Persistence Layer ensures that the ECS World State (Entities & Components) is saved across browser sessions.

## 1. Architecture

### Service
- **Class**: `PersistenceService` (`src/v3/platform/services/PersistenceService.ts`)
- **Role**: Manages I/O between `Registry` and `localStorage`.
- **Singleton**: Accessed via `getPersistenceService()` in `loader.ts`.

### Storage Strategy (LocalStorage)
We use `localStorage` for simplicity and synchronous access (blocking is negligible for text-based JSON < 5MB).

| Key Pattern | Description | Content |
| :--- | :--- | :--- |
| `v3_meta_projects` | List of all projects | JSON Array of `{ id, name, lastModified }` |
| `v3_project_{ID}` | Project Data | JSON String from `Registry.serialize()` |

### Data Flow
1.  **Change Detection**: `PersistenceService` watches `Registry.getSnapshot()` (deep watch).
2.  **Debounce**: Updates are debounced by **1000ms** to prevent thrashing.
3.  **Serialization**: `Registry.serialize()` is called, filtering out TRANSIENT components (e.g., `Interaction`).
4.  **Save**: JSON is written to `localStorage`.

## 2. Integration

### Entry Point
- **File**: `src/router/index.ts`
- **Logic**: Inside the `beforeEnter` guard for `/v3`.
- **Flow**:
    ```typescript
    const persistence = getPersistenceService();
    const registry = getEcsRegistry();
    
    // 1. Try to load default project
    persistence.load('default', registry);
    
    // 2. Start watching for future changes
    persistence.watchForChanges(registry);
    ```

### Registry Singleton
To ensure the UI and the Loader share the same state, `Registry` is now a singleton exported by `src/v3/platform/loader.ts`. Components should use `getEcsRegistry()` or `useWorld()` (which wraps it).

## 3. Future Roadmap
- [ ] **IndexedDB Support**: For large assets (images) or massive grids.
- [ ] **Multi-Project UI**: Interface to switch between projects (`v3_meta_projects`).
- [ ] **Cloud Sync**: Adapting `PersistenceService` to talk to a backend API.
