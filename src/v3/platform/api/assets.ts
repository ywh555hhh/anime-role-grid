import type { ISource } from "../contracts";

/**
 * Options for the Asset Picker Dialog
 */
export interface AssetPickerOptions {
    /**
     * Interaction Mode:
     * - 'single': Pick one and close relative to the "slot" context.
     * - 'multiple': Continuous picking into a "dock" context.
     */
    mode: 'single' | 'multiple';

    /**
     * Filter available sources by ID.
     * If undefined or empty, show all registered sources.
     */
    sources?: string[];

    /**
     * Pre-filled search query.
     */
    initialQuery?: string;

    /**
     * Dialog Title.
     */
    title?: string;
}

/**
 * The standard Asset Service accessible to plugins.
 */
export interface IAssetService {
    /**
     * Opens the Universal Asset Browser overlay.
     * Returns the selected assets (normalized) or null if cancelled.
     */
    pick(options: AssetPickerOptions): Promise<any[] | null>;

    /**
     * Programmatically registers a source (usually done via ctx.registerSource).
     */
    registerSource(source: ISource): void;

    /**
     * Get all registered sources.
     */
    getSources(): ISource[];
}
