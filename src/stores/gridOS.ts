import { createGlobalState, useStorage } from '@vueuse/core'
import { ref, computed } from 'vue'
import type { GridOSCard, GridOSSlot, SlotId } from '~/logic/gridos/core/types'

/**
 * GridOS Kernel
 * The central banking system for all Cards and Slots.
 */
export const useGridOS = createGlobalState(() => {

    // --- 1. Global Card Pool (The Reservoir) ---
    // Stores ALL cards currently in the system (in Dock or in View).
    // Key: Card UUID
    const cardPool = useStorage<Record<string, GridOSCard>>('gridos-kernel-cards-v1', {})

    // --- 2. Slot Registry (The Grid State) ---
    // Keeps track of which Card is in which Slot.
    // This separates "Position" from "Data".
    // Key: Slot ID (Global), Value: Card UUID
    const slotRegistry = useStorage<Record<SlotId, string>>('gridos-kernel-slots-v1', {})

    // --- Kernel Actions (The Flow Logic) ---

    /**
     * Inject a new card into the system (e.g. from Ingest)
     */
    function registerCard(card: GridOSCard) {
        if (!cardPool.value[card.uuid]) {
            cardPool.value[card.uuid] = card
        }
        return card.uuid
    }

    /**
     * Move water from one place to another.
     * Universal atomic operation for Drag & Drop.
     */
    function assignCardToSlot(cardId: string, slotId: SlotId) {
        if (!cardPool.value[cardId]) {
            console.error(`[GridOS] Card ${cardId} not found in pool`)
            return
        }

        // 1. Check if card is already somewhere else? 
        // (Optional: In some modes, we might allow one card in multiple slots, 
        // but typically a physical object is unique. For now, allow ref copies)

        // 2. Assign
        slotRegistry.value[slotId] = cardId
    }

    /**
     * Clear a slot (Dry up)
     */
    function clearSlot(slotId: SlotId) {
        delete slotRegistry.value[slotId]
    }

    // --- Selectors (Getters) ---

    function getCard(uuid: string): GridOSCard | undefined {
        return cardPool.value[uuid]
    }

    function getCardInSlot(slotId: SlotId): GridOSCard | undefined {
        const cardId = slotRegistry.value[slotId]
        if (!cardId) return undefined
        return cardPool.value[cardId]
    }

    return {
        // State
        cardPool,
        slotRegistry,

        // Actions
        registerCard,
        assignCardToSlot,
        clearSlot,

        // Getters
        getCard,
        getCardInSlot
    }
})
