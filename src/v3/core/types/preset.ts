export interface IPreset {
    /** Unique ID (e.g. 'standard-grid.classic') */
    id: string;

    /** Display Name (e.g. '经典 (3x3)') */
    name: string;

    /** Description (e.g. 'The classic 3x3 layout') */
    description?: string;

    /** Optional Category for Gallery Grouping */
    category?: string; // 'character', 'work', 'fun'

    /** Optional Label for chips (e.g. 'Hot') */
    tags?: string[];

    /** The View ID this preset belongs to (e.g. 'builtin.views.grid') */
    targetViewId: string;

    /** The Data Payload to inject into ECS */
    data: {
        /** 
         * Option A: Serialized Entities (Snapshot) 
         * This is the "pure" ECS way.
         */
        entities?: any[];

        /**
         * Option B: Logic Config (Generator)
         * e.g. { cols: 3, rows: 3 }
         * The View Plugin must know how to interpret this.
         */
        config?: Record<string, any>;
    };
}
