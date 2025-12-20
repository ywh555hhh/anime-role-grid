/**
 * GridOS Protocol (v1.0)
 * The "Constitution" of the GridOS ecosystem.
 */

// --- 1. The Water (Data Asset) ---

/**
 * A Card is an immutable data asset driving through the system.
 * It is the "Water" in the pipe.
 */
export interface GridOSCard {
    uuid: string; // Unique ID for this specific instance of the card (drop of water)

    // Metadata for display (Visuals)
    meta: {
        name: string;
        coverUrl: string;
        origin: string; // e.g. 'bangumi', 'local', 'gacha'
    };

    // Original Payload (The "DNA" of the card)
    // Keeps reference to the original source data (e.g. Bangumi Subject ID)
    payload: Record<string, any>;
}

// --- 2. The Container (Slot) ---

export type SlotId = string;

/**
 * A Slot is a container that CAN hold a card.
 * It exists locally within a Dock or a View.
 */
export interface GridOSSlot {
    id: SlotId;

    // State
    cardId: string | null; // Reference to a Card UUID (Water in the hole)

    // Semantic Properties (The "Soul" of the slot)
    label: string; // e.g. "Best Girl", "Tank", "Top 1"
    description?: string;

    // Visual Constraints (Optional)
    // Plugins can extend this
    style?: Record<string, any>;
}

// --- 3. The Shape (Layout) ---

/**
 * Layout configuration defines the TOPOLOGY of slots.
 * It is NOT just visual (CSS), it is Structural.
 */
export interface GridOSLayout {
    id: string; // e.g. 'pyramid_v1'
    name: string;

    // The blueprint of slots to generate
    // View plugins read this to render React/Vue components
    slots: {
        id: string; // relative id, e.g. 'row1_col1'
        label: string;
        // Spatial hints for the renderer
        x?: number;
        y?: number;
        w?: number;
        h?: number;
    }[];
}

// --- 4. The Ecosystem Contracts (Plugins) ---

/**
 * Standard interface for ANY Data Source
 * Examples: SearchBar, GachaMachine, CSVLoadeer
 */
export interface IngestProvider {
    id: string;
    name: string;
    provide(query?: string): Promise<GridOSCard[]>;
}

/**
 * Standard interface for Dock behaviors
 * Examples: LinearDock, StackDock, RecycleBin
 */
export interface DockStrategy {
    id: string;
    // Logic hooks
    onDrop(card: GridOSCard): void;
    canAccept(card: GridOSCard): boolean;
}
