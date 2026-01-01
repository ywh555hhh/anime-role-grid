# RFC 004: System Manager & Pipeline Architecture

## 1. Summary
This RFC defines the architecture for the **System Manager**, the central orchestration unit responsible for executing ECS Systems and managing the "Game Rules" pipeline.

## 2. Motivation
In a pure ECS, systems often run in a loose loop. However, for a user-facing application with complex rules (e.g., "Cannot place item here because budget exceeded"), we need:
1.  **Deterministic Execution Order**: Solved via `Priority`.
2.  **Interception Capabilities**: Solved via `Pipeline Hooks`.

## 3. Design Details

### 3.1 System Interface
Every System must now implement the extended `ISystem` interface:

```typescript
interface ISystem {
    id: string;
    priority: number; // Higher number = Earlier execution
    init(registry: IRegistry): void;
    destroy(): void;
}
```

### 3.2 The Pipeline Pattern (Middleware)
Instead of hardcoding rules like `if (budget < 0) return`, we expose **Hooks** that any system can subscribe to via "Duck Typing" (implementing the method).

#### Supported Hooks
*   **`onSnap(ctx: SnapContext): boolean`**
    *   Triggered when an entity attempts to snap to a slot.
    *   **Behavior**: Pipeline stops if ANY system returns `false`.
    *   **Use Case**: Budget limit, Obstacle check, Permission check.
*   **`onSelectionChange(ctx: SelectionContext): void`**
    *   Triggered when user selects entities.
    *   **Use Case**: Update Inspector UI, Highlight related items.

### 3.3 Implementation (`SystemManager.ts`)
The `SystemManager` maintains a sorted list of systems.
When a "Pipeline Event" occurs (e.g., user drags an item), the Manager iterates through all systems:

```typescript
// Pseudo-code
for (const system of systems) {
    if (system.onSnap && system.onSnap(ctx) === false) {
        return false; // Action Blocked
    }
}
return true; // Action Approved
```

## 4. Example: "Chaos Plugin"
The `ChaosSystem` demonstrates this by randomly blocking snap events:

```typescript
const ChaosSystem = {
    id: 'chaos',
    priority: 100,
    onSnap: () => Math.random() > 0.5 // Randomly block
}
```
