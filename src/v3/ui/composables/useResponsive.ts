import { ref, onMounted, onUnmounted } from 'vue';

export function getTemplateForWidth(width: number): string {
    if (width < 600) {
        return 'mobile_grid';
    }
    return 'standard';
}

export function useResponsive(onTemplateChange: (template: string) => void) {
    const width = ref(window.innerWidth);

    function handleResize() {
        width.value = window.innerWidth;
        const newTemplate = getTemplateForWidth(width.value);
        // We could verify if it changed to avoid reloading same template
        onTemplateChange(newTemplate);
    }

    onMounted(() => {
        window.addEventListener('resize', handleResize);
        // Initial check
        handleResize();
    });

    onUnmounted(() => {
        window.removeEventListener('resize', handleResize);
    });

    return {
        width
    };
}
