import { ref, watchEffect, unref, type Ref } from 'vue';
import { ImagePool } from '../../core/systems/assets/ImagePool';

const pool = ImagePool.getInstance();

type MaybeRef<T> = T | Ref<T>;

export function useAsset(uuidSource: MaybeRef<string | undefined>) {
    const url = ref<string | undefined>(undefined);
    const isLoading = ref(false);

    watchEffect(async () => {
        const uuid = unref(uuidSource);

        if (!uuid) {
            url.value = undefined;
            return;
        }

        isLoading.value = true;
        try {
            const result = await pool.getImage(uuid);
            url.value = result;
        } catch (e) {
            console.error(`[useAsset] Failed to load ${uuid}`, e);
            url.value = undefined;
        } finally {
            isLoading.value = false;
        }
    });

    return { url, isLoading };
}
