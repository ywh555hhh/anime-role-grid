/**
 * src/v3/core/systems/events.ts
 * Global Event Bus for Decoupling Systems
 */
import type { EntityId, EventMap } from '../ecs/types';

type Handler<T> = (payload: T) => void;

export class EventBus {
    private static handlers: Map<keyof EventMap, Set<Handler<any>>> = new Map();

    static on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler);
    }

    static off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>) {
        const handlers = this.handlers.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    static emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
        const handlers = this.handlers.get(event);
        if (handlers) {
            handlers.forEach(h => h(payload));
        }
        // console.log(`[EventBus] ${event}`, payload);
    }
}
