import { ref, computed, readonly } from 'vue';
import { WorkbenchRegistry } from '../registry';
import { useWindowSize } from '@vueuse/core';

// Global Singleton State
// (Defined outside function to ensure singleton behavior across components)
// Global Singleton State
// (Defined outside function to ensure singleton behavior across components)
export type WorkbenchMode = 'NORMAL' | 'STREAMER';

const activeViewId = ref<string>('');
const activePanelId = ref<string>('');
const isPanelOpen = ref<boolean>(true); // Default open on desktop
const isViewLoading = ref<boolean>(false);
const sidePanelSize = ref<number>(256); // Default 256px
const activeMode = ref<WorkbenchMode>('NORMAL'); // Default Mode


export function useWorkbench() {
    const registry = WorkbenchRegistry.getInstance();
    const { width } = useWindowSize(); // Reactive window size

    // Mobile Detection (Tailwind 'md' breakpoint is usually 768px)
    const isMobile = computed(() => width.value < 768);

    // --- Actions ---

    /**
     * Safely switches the main view with Async Lifecycle Guards
     */
    const switchView = async (viewId: string) => {
        if (activeViewId.value === viewId) return;

        isViewLoading.value = true;
        try {
            // 1. Deactivate Old
            const oldView = activeViewId.value ? registry.getView(activeViewId.value) : null;
            if (oldView?.onDeactivate) {
                // TODO: Pass actual Entity Registry here later
                await oldView.onDeactivate({} as any);
            }

            // 2. Activate New
            const newView = registry.getView(viewId);
            if (!newView) {
                console.warn(`[Workbench] View not found: ${viewId}`);
                return;
            }

            if (newView.onActivate) {
                await newView.onActivate({} as any);
            }

            activeViewId.value = viewId;
        } catch (error) {
            console.error(`[Workbench] Failed to switch view to ${viewId}`, error);
            // Optional: Show toast error here
        } finally {
            isViewLoading.value = false;
        }
    };

    /**
     * Toggles a side panel (Dock)
     */
    const togglePanel = (panelId: string) => {
        // If clicking the same panel
        if (activePanelId.value === panelId) {
            // Toggle visibility
            isPanelOpen.value = !isPanelOpen.value;
        } else {
            // Switch to new panel and ensure open
            activePanelId.value = panelId;
            isPanelOpen.value = true;
        }
    };

    const closePanel = () => {
        isPanelOpen.value = false;
    };

    // --- Computed Accessors ---

    const activeView = computed(() =>
        activeViewId.value ? registry.getView(activeViewId.value) : null
    );

    const activePanel = computed(() =>
        activePanelId.value ? registry.docks.get(activePanelId.value) : null
    );

    return {
        // State
        activeViewId: readonly(activeViewId),
        activePanelId: readonly(activePanelId),
        isPanelOpen: readonly(isPanelOpen),
        isViewLoading: readonly(isViewLoading),
        sidePanelSize: sidePanelSize, // Writable for resizing
        isMobile,

        // Data Computed
        activeView,
        activePanel,
        docks: registry.docks, // Reactive Map from Registry
        views: registry.views,

        // Actions
        switchView,
        togglePanel,
        closePanel,
        setMode: (mode: WorkbenchMode) => activeMode.value = mode,
        mode: readonly(activeMode)
    };
}
