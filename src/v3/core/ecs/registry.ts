/**
 * src/v3/core/ecs/registry.ts
 * Core Registry Implementation
 */
import { shallowReactive, reactive, markRaw } from 'vue';
import type {
    IRegistry,
    WorldState,
    EntityId,
    ComponentType,
    ComponentData,
    CoreComponentMap
} from './types';
import { generateEntityId } from '../utils/id';

export class Registry implements IRegistry {
    // The single source of truth
    private readonly state: WorldState;

    constructor() {
        // REQ-TECH-01: Shallow Reactivity Strategy
        // We use shallowReactive for the root to avoid deep ref overhead.
        // Inner collections (Maps/Sets) must be explicitly reactive if we want
        // their size/add/delete to trigger updates.
        this.state = shallowReactive<WorldState>({
            // Entities Set: needs to be reactive to track count/existence
            entities: reactive(new Set<EntityId>()),

            // Components Map: Keys are ComponentTypes.
            // Using reactive({}) ensures that adding a new ComponentType (lazy init)
            // triggers updates for watchers. 
            // The values inside will be explicitly shallowReactive Maps.
            components: reactive({}) as any,

            // Indices: Map<ComponentType, Set<EntityId>>
            // The Map must be reactive to adding new ComponentTypes (rare)
            // The Sets inside must be reactive to adding Entities (frequent)
            indices: reactive(new Map<ComponentType, Set<EntityId>>())
        });
    }

    // Query Cache: Key -> Set of EntityIds
    private readonly queryCache = new Map<string, Set<EntityId>>();

    /**
     * Helper to generate cache key for query
     */
    private getQueryKey(types: ComponentType[]): string {
        // Sort to ensure ['A', 'B'] same as ['B', 'A']
        return [...types].sort().join('|');
    }

    /**
     * Invalidate relevant queries when a component is changed
     */
    private invalidateQueries(type: ComponentType) {
        // Naive strategy: Clear any query that involves this type.
        // Optimization: In a real ECS, we might update the set incrementally.
        // For V3, clearing keys containing the type is safer/easier.
        for (const key of this.queryCache.keys()) {
            if (key.includes(type)) { // Simple check, might have false positives if type names overlap substring, but we use '|' separator
                // To be precise:
                const parts = key.split('|');
                if (parts.includes(type)) {
                    this.queryCache.delete(key);
                }
            }
        }
    }

    /**
     * Create a new Entity
     */
    createEntity(id?: string): EntityId {
        const entityId = (id ? id : generateEntityId()) as EntityId;
        this.state.entities.add(entityId);
        return entityId;
    }

    /**
     * Destroy an entity and all its components
     */
    destroyEntity(id: EntityId): void {
        this.state.entities.delete(id);

        // Cleanup components
        // Iterate known component types in state
        for (const type of Object.keys(this.state.components)) {
            const t = type as ComponentType;
            if (this.state.components[t]?.has(id)) {
                this.removeComponent(id, t);
            }
        }
    }

    /**
     * Add a component to an entity
     * Automatically maintains the Inverted Index (REQ-TECH-02)
     */
    addComponent<T extends ComponentType>(
        entityId: EntityId,
        type: T,
        data: ComponentData<T>
    ): void {
        // 1. Ensure Component Storage exists
        if (!this.state.components[type]) {
            this.state.components[type] = shallowReactive(new Map()) as any;
        }

        const storage = this.state.components[type];

        // 2. Add to Storage
        storage.set(entityId, markRaw(data) as any);

        // 3. Update Index (REQ-TECH-02)
        if (!this.state.indices.has(type)) {
            this.state.indices.set(type, reactive(new Set()));
        }
        this.state.indices.get(type)!.add(entityId);

        // 4. Invalidate Query Cache
        this.invalidateQueries(type);
    }

    /**
     * Remove a component
     */
    removeComponent<T extends ComponentType>(
        entityId: EntityId,
        type: T
    ): void {
        // 1. Remove from Storage
        const storage = this.state.components[type];
        if (storage) {
            storage.delete(entityId);
        }

        // 2. Remove from Index
        const index = this.state.indices.get(type);
        if (index) {
            index.delete(entityId);
        }

        // 3. Invalidate Query Cache
        this.invalidateQueries(type);
    }

    // ... getComponent, batch ...

    /**
     * Get component data
     */
    getComponent<T extends ComponentType>(
        entityId: EntityId,
        type: T
    ): ComponentData<T> | undefined {
        const storage = this.state.components[type];
        if (!storage) return undefined;
        return storage.get(entityId);
    }

    /**
     * Batch updates
     */
    batch(callback: () => void): void {
        callback();
    }

    /**
     * Get a snapshot of the current state
     */
    getSnapshot(): WorldState {
        return this.state;
    }

    /**
     * Query entities with specific components (Phase 1 Bonus)
     * NOW WITH CACHING!
     */
    query(types: ComponentType[]): Set<EntityId> {
        if (types.length === 0) return new Set();

        const key = this.getQueryKey(types);
        if (this.queryCache.has(key)) {
            return this.queryCache.get(key)!;
        }

        // 1. Get Set for first type
        const firstType = types[0];
        const firstSet = this.state.indices.get(firstType);

        if (!firstSet || firstSet.size === 0) {
            // Cache empty result
            const empty = new Set<EntityId>();
            this.queryCache.set(key, empty);
            return empty;
        }

        if (types.length === 1) {
            // For single type, just return the index itself? No, we need snapshot.
            const result = new Set(firstSet);
            this.queryCache.set(key, result);
            return result;
        }

        // 2. Intersection for others
        const result = new Set(firstSet);
        for (let i = 1; i < types.length; i++) {
            const nextType = types[i];
            const nextSet = this.state.indices.get(nextType);
            if (!nextSet) {
                const empty = new Set<EntityId>();
                this.queryCache.set(key, empty);
                return empty;
            }

            for (const id of result) {
                if (!nextSet.has(id)) {
                    result.delete(id);
                }
            }
        }

        // 3. Save to Cache
        this.queryCache.set(key, result);
        return result;
    }

    // ... serialize/deserialize ... (omitted for brevity in replacement search if not targeted, but I'm replacing createEntity to query end)


    /**
     * Serialize World State to JSON
     * Filter out transient components (e.g. Interaction, selection states)
     */
    serialize(): string {
        const snapshot: any = {
            entities: Array.from(this.state.entities),
            components: {}
        };

        const TRANSIENT_COMPONENTS = new Set(['Interaction']);

        for (const [type, storage] of Object.entries(this.state.components)) {
            if (TRANSIENT_COMPONENTS.has(type)) continue;

            // Map<EntityId, Data> -> Record<EntityId, Data>
            const data: Record<string, any> = {};
            for (const [eid, val] of (storage as Map<EntityId, any>).entries()) {
                data[eid] = val;
            }
            snapshot.components[type] = data;
        }

        return JSON.stringify(snapshot);
    }

    /**
     * Deserialize World State from JSON
     * Clears current state and loads new one.
     */
    deserialize(json: string): void {
        const data = JSON.parse(json);

        // 1. Clear current
        this.state.entities.clear();
        for (const map of Object.values(this.state.components)) {
            (map as Map<any, any>).clear();
        }
        this.state.indices.clear();

        // 2. Load Entities
        if (Array.isArray(data.entities)) {
            data.entities.forEach((eid: string) => this.state.entities.add(eid as EntityId));
        }

        // 3. Load Components
        if (data.components) {
            for (const [type, records] of Object.entries(data.components)) {
                // Ensure storage
                if (!this.state.components[type as ComponentType]) {
                    this.state.components[type as ComponentType] = shallowReactive(new Map()) as any;
                }
                const storage = this.state.components[type as ComponentType];

                // Load records
                for (const [eid, val] of Object.entries(records as Record<string, any>)) {
                    storage.set(eid as EntityId, markRaw(val));
                }

                // Rebuild Indices
                if (!this.state.indices.has(type as ComponentType)) {
                    this.state.indices.set(type as ComponentType, reactive(new Set()));
                }
                const index = this.state.indices.get(type as ComponentType)!;
                Object.keys(records as Record<string, any>).forEach(eid => index.add(eid as EntityId));
            }
        }
    }
}
