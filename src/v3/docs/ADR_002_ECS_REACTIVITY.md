# ADR 002: ECS Query Caching vs. Vue Reactivity

## Context
In the V3 ECS architecture, we initially implemented a `queryCache` in the `Registry` class. This cache stored the results of `query(['ComponentA', 'ComponentB'])` (Set intersections) to improve performance by avoiding recalculation on every call.

## The Problem
Vue's reactivity system relies on **dependency tracking**. When a component renders (or a `computed` property evaluates), it accesses reactive objects (like `Ref` or `Reactive` proxies). Vue records these accesses.
- With `queryCache`: The View called `query()`. The Registry returned a cached `Set` from a plain `Map`. **No reactive dependency was accessed** during the read (because the cache hit bypassed the underlying reactive `indices`).
- Result: When entities were added/removed, the underlying data changed, but Vue components didn't know they needed to re-render because they never "touched" the changing data, they only touched the static cache.

## Decision
**Remove the internal `queryCache` mechanism entirely and rely on direct computation + Vue's own caching.**

## Trade-off Analysis

### 1. Performance (The Concern)
*   **Old Way (Cached)**: `query()` was O(1) on cache hit.
*   **New Way (Direct)**: `query()` is O(N) where N is the number of entities in the smallest component set.
*   **Impact**:
    *   For this application (Grid of ~20-100 slots), N is extremely small.
    *   JavaScript Set intersection for 100 items takes **nanoseconds**.
    *   System execution (60 FPS) doing 1000 operations is trivial for modern V8 engines.
    *   **Premature Optimization** was the root cause of the bug.

### 2. Reactivity (The Gain)
*   By accessing `this.state.indices.get(type)` directly in `query()`, we allow Vue to track granular dependencies.
*   **Instant Updates**: UI components now automatically re-render exactly when relevant components change.
*   **Less Code**: Removed 30+ lines of complex cache invalidation logic (`invalidateQueries`) which is error-prone.

### 3. Future Scalability Mitigation
If `query()` ever becomes a bottleneck (e.g., 10,000+ entities), we can re-introduce caching **Correctly**:
1.  **Computed Caching**: Wrap queries in `computed(() => registry.query(...))` at the View/System level. Vue's computed system *is* a cache that respects reactivity.
2.  **Specialized Indexes**: Maintain specific lists for hot queries (e.g., `RenderableEntities` list) updated on add/remove, rather than computing on query.

## Conclusion
Correctness > Performance (at this scale). The removal of the cache fixes critical UI desync bugs (like the "3-column flash") with zero perceptible performance cost.
