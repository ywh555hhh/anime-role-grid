# V3 ECS Technical Audit & Future Risks

## 1. Registry & Reactivity (Performance Risk)
*   **Current**: `shallowReactive` on the root state, using nested Maps/Sets.
*   **Risk**: As entity count grows (>1000), fine-grained reactivity in Vue might become a bottleneck if not managed carefully.
    *   Currently, adding a component triggers reactivity on the `components[Type]` map.
    *   Iterating `registry.state.entities` in `computed` (like in `EntityDebugger.vue`) effectively makes that computed property depend on *any* entity addition/removal. This is O(N) dependency.
*   **Mitigation**: Use specific `query` caches or filtered views that only update when relevant components change, rather than iterating the global entity set.

## 2. Query System (Efficiency Risk)
*   **Current**: `registry.query(['A', 'B'])` performs a fresh `Set` intersection every call. O(N) where N is the smallest component set size.
*   **Risk**: High-frequency systems (like tight render loops or physics) calling this every frame will thrash memory (creating new Sets).
*   **Mitigation**: Implement **Cached Queries**. Maintain a `Map<QueryKey, Set<EntityId>>` that automatically updates when `addComponent`/`removeComponent` happens. (Reactive Indices).

## 3. Command History (Memory Risk)
*   **Current**: `structuredClone` or `JSON.stringify` for every command's data snapshot.
*   **Risk**: Large components (e.g. detailed JSON blobs, long strings) being changed frequently will bloat memory in the `UndoStack`.
*   **Mitigation**:
    *   Implement **Structural Sharing** or differential snapshots for large data.
    *   Limit stack size (already done: default 50).
    *   Ensure `Visual.src` (base64) is handled carefully—prefer storing references (URLs/Hashes) rather than raw base64 data in components if possible.

## 4. System Coupling (Architecture Risk)
*   **Current**: `useDrag.ts` directly imports `Registry` and `LayoutSystem`.
*   **Risk**: Logic leakage. `useDrag` is becoming a "God Composable".
*   **Mitigation**:
    *   Move drag logic into a formal `InteractionSystem`.
    *   `useDrag` should only be the "View Adapter" that sends inputs to the System.

## 5. Type Safety (Maintenance Risk)
*   **Current**: `registry.ts` uses `as any` in several places to bypass TS strictness on Map generics.
*   **Risk**: Runtime type errors if `ComponentType` string mismatches the data structure.
*   **Mitigation**: Stricter generic constraints in `registry.ts` (though difficult with dynamic component maps).

## 6. Serialization (Versioning Risk)
*   **Current**: Direct dump of JSON.
*   **Risk**: If we change `Transform` schema (e.g. rename `x` to `posX`), old save files will break.
*   **Mitigation**: Add `version` field to the snapshot. Implement a migration strategy in `deserialize` (e.g. `upgraders`).

## 7. Layout System (Virtual vs Real)
*   **Current**: `LayoutSystem.calculateSlots` was designed for "Virtual Slots". But we effectively moved to "Entity Slots" in Phase 6.
*   **Risk**: We might have two sources of truth for where a slot is: The `SlotEntity.Transform` and the `LayoutSystem` calculation.
*   **Action**: Deprecate `LayoutSystem.calculateSlots` if we are fully committed to "Slots as Entities". Use the Entities as the single source of truth.

## Summary
The system is robust for < 500 entities (typical Grid use case).
**Primary Debt**: The duplication of truth between "Layout Calculation" and "Slot Entities".
**Primary Risk**: Query performance in high-frequency loops (not currently a problem for this app type).
