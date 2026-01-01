# RFC 008: V3 Preset System (预设系统)

## 1. Context
In V1/V2, a "Template" was just a JSON configuration for the Grid (`cols`, `bgImage`, `boxes`).
In V3, since we support **multiple plugins** (Standard Grid, Tier List, Alignment Chart), a "Preset" must be more flexible.

## 2. Definition
A **Preset** define:
1.  Which **View** to use (e.g., `standard-grid`, `tier-list`).
2.  The **Initial State** of the ECS World (Entities & Components).

### Data Structure
```typescript
interface IPreset {
    id: string;
    name: string; // e.g. "基础模板", "九宫格", "Tiermaker S-F"
    description?: string;
    thumbnail?: string; // Preview image
    
    // Target View Plugin
    targetViewId: string; // e.g. 'my.plugin.grid.view'

    // The ECS Data Payload
    // This allows the preset to define ANY entity structure:
    // - A 3x3 Grid
    // - A Tier List with S, A, B rows
    // - An Alignment Chart with 2 axes
    data: {
        entities: SerializedEntity[]; 
        // Or simpler: config object that a System uses to generator entities
        config?: Record<string, any>; 
    };
}
```

## 3. Workflow & Discovery

### 3.1 Who "Owns" the Presets?
*   **Plugins PROVIDE Presets**: Each Plugin can export a list of `presets` in its definition. This is how "Official Built-in Presets" are shipped (packaged within the StandardGrid plugin).
*   **SystemManager AGGREGATES**: At startup, SystemManager iterates all loaded plugins and collects their presets into a central registry (`PresetRegistry`).
*   **Storage EXTENDS**: User-saved presets are stored in LocalStorage/Cloud and *merged* into the same `PresetRegistry`.

### 3.2 Loading Flow
1.  **User** opens Gallery (UI reads `PresetRegistry.getAll()`).
2.  **User** clicks "Standard 3x3".
3.  **Platform** checks `preset.targetViewId`.
4.  **Platform** switches View: `workbench.switchView('standard-grid')`.
5.  **Platform** injects Data: `ecs.hydrate(preset.data)`.

**Verdict**: Plugins do NOT "read" presets. Plugins **DECLARE** presets. The Platform **READS** and **APPLIES** them.


### Scenario A: Standard 3x3 Grid
*   **View**: `StandardGridView`
*   **Data**: `{ cols: 3, rows: 3 }`
*   **Action**: Generator creates 9 Slot Entities with `Layout` components.

### Scenario B: Tier List (S/A/B/C/D)
*   **View**: `TierListView` (Hypothetical)
*   **Data**: `{ tiers: ['S', 'A', 'B', 'C', 'D'] }`
*   **Action**: Generator creates 5 Row Entities (Containers) and initial empty slots in them.

## 5. Storage
Presets should be stored as JSON files (or a strict TS config file) in `src/v3/data/presets/`.
User-created presets (Local Storage) will follow the same schema.
