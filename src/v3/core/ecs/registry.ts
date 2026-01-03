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
    ComponentData
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

    // Query Cache Removed (Reactivity Fix: Caching broke dependency tracking)
    // private readonly queryCache = new Map<string, Set<EntityId>>();

    /**
     * Query entities with specific components
     * DIRECT COMPUTATION (Maintains Vue Reactivity)
     */
    query(types: ComponentType[]): Set<EntityId> {
        if (types.length === 0) return new Set();

        // 1. Get Set for first type
        const firstType = types[0] as ComponentType;
        const firstSet = this.state.indices.get(firstType);

        if (!firstSet || firstSet.size === 0) {
            return new Set();
        }

        if (types.length === 1) {
            // Return a new Set to allow safe iteration/modification by caller without affecting index
            // But critically, by accessing 'firstSet', we register dependency.
            return new Set(firstSet);
        }

        // 2. Intersection for others
        const result = new Set(firstSet);
        for (let i = 1; i < types.length; i++) {
            const nextType = types[i] as ComponentType;
            const nextSet = this.state.indices.get(nextType);

            // If any required component index is missing/empty, intersection is empty
            if (!nextSet || nextSet.size === 0) {
                return new Set();
            }

            for (const id of result) {
                if (!nextSet.has(id)) {
                    result.delete(id);
                }
            }
        }

        return result;
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

        // 4. Invalidate Query Cache (Removed)
        // this.invalidateQueries(type);
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

        // 3. Invalidate Query Cache (Removed)
        // this.invalidateQueries(type);
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

    // Duplicate query method removed

    /**
     * Helper to create entity with components
     */
    add(entityDef: { id?: string; components: Partial<Record<ComponentType, any>> }): EntityId {
        const id = this.createEntity(entityDef.id);
        if (entityDef.components) {
            for (const [type, data] of Object.entries(entityDef.components)) {
                this.addComponent(id, type as ComponentType, data);
            }
        }
        return id;
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
        // this.queryCache.clear(); // CRITICAL: Clear cache to prevent ghost entities

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
