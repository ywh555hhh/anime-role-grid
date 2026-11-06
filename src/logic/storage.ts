import { useStorage } from "@vueuse/core";
import { computed } from "vue";
import type { GridItem } from "~/types";
import { TEMPLATES } from "./templates";

// Persistent state for the current template ID
export const currentTemplateId = useStorage("anime-grid-template-id", "classic");

// Persistent state for all grids data: { [templateId]: GridItem[] }
export const savedGrids = useStorage<Record<string, GridItem[]>>("anime-grid-data-v1", {});

// Legacy storage key for migration
const legacyList = useStorage<GridItem[]>("anime-grid-character-list-v2", []);

// Migration logic: If legacy data exists and 'classic' is empty, migrate it
if (legacyList.value.length > 0 && !savedGrids.value["classic"]) {
    savedGrids.value["classic"] = legacyList.value;
    // Optional: clear legacy list or keep it as backup? Let's keep it for safety but ignore it.
}

// Computed property to access the current list
export const list = computed({
    get: () => {
        const tid = currentTemplateId.value;
        const savedList = savedGrids.value[tid] || [];

        // If it's a known static template, we merge with its structure
        const template = TEMPLATES.find((t) => t.id === tid);

        if (template) {
            return template.items.map((defaultLabel, index) => {
                const savedItem = savedList[index];
                return {
                    label: savedItem?.label ?? defaultLabel,
                    character: savedItem?.character,
                };
            });
        }

        // If it's custom (not in TEMPLATES) or unknown, strictly use saved data
        // This prevents "phantom" items from the default template appearing
        return savedList;
    },
    set: (val) => {
        savedGrids.value[currentTemplateId.value] = val;
    },
});

// Default grid title
export const name = useStorage("anime-grid-name", "我的动漫人物喜好果然有问题");
