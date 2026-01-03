import type { IAssetService, AssetPickerOptions } from '../api/assets';
import type { ISource } from '../contracts';
import { overlays } from './OverlayManager';
import { shallowRef, triggerRef } from 'vue';

// We need to import the UI component to open it.
// Ideally this is lazy loaded or injected to avoid circular deps if component depends on service.
// For now, we import the component directly.
import AssetBrowserOverlay from '../../ui/overlays/AssetBrowserOverlay.vue';

export class AssetService implements IAssetService {
    // Reactive list of sources so the UI can update automatically
    private _sources = shallowRef<ISource[]>([]);

    constructor() { }

    registerSource(source: ISource) {
        // Prevent duplicates
        if (this._sources.value.find(s => s.id === source.id)) {
            console.warn(`[AssetService] Source already registered: ${source.id}`);
            return;
        }

        this._sources.value.push(source);
        triggerRef(this._sources);
        console.log(`[AssetService] Registered source: ${source.name}`);
    }

    getSources(): ISource[] {
        return this._sources.value;
    }

    async pick(options: AssetPickerOptions): Promise<any[] | null> {
        console.log(`[AssetService] Picking asset...`, options);

        try {
            const result = await overlays.open(AssetBrowserOverlay, {
                options: options,
                // Pass the service instance or sources directly? 
                // Passing sources directly ensures the UI has access to search methods.
                sources: this._sources.value
            });

            return result;
        } catch (e) {
            console.log('[AssetService] Pick cancelled via overlay close.');
            return null;
        }
    }
}
