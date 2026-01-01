import { ref, computed } from 'vue'

export interface ViewportState {
    x: number // Pan Offset X
    y: number // Pan Offset Y
    scale: number // Zoom Level
}

// Global state to share between main view, mini-map, etc.
const state = ref<ViewportState>({
    x: 0,
    y: 0,
    scale: 1
})

export function useViewport() {
    const MIN_SCALE = 0.1
    const MAX_SCALE = 5.0

    // --- Core Transform Logic ---
    const containerStyle = computed(() => {
        return {
            transform: `translate(${state.value.x}px, ${state.value.y}px) scale(${state.value.scale})`,
            transformOrigin: '0 0' // Crucial for simpler math
        }
    })

    // --- Coordinate Systems ---
    /**
     * Converts Screen Coordinates (e.g. Mouse Event, DOM Element) to World Coordinates
     * Formula: World = (Screen - Pan) / Scale
     */
    function screenToWorld(screenX: number, screenY: number) {
        return {
            x: (screenX - state.value.x) / state.value.scale,
            y: (screenY - state.value.y) / state.value.scale
        }
    }

    /**
     * Converts World Coordinates to Screen Coordinates
     * Formula: Screen = World * Scale + Pan
     */
    function worldToScreen(worldX: number, worldY: number) {
        return {
            x: worldX * state.value.scale + state.value.x,
            y: worldY * state.value.scale + state.value.y
        }
    }

    // --- Actions ---
    function panBy(dx: number, dy: number) {
        state.value.x += dx
        state.value.y += dy
    }

    function setPan(x: number, y: number) {
        state.value.x = x
        state.value.y = y
    }

    /**
     * Zoom towards a specific screen point (usually mouse position)
     */
    function zoomAt(screenX: number, screenY: number, delta: number) {
        const oldScale = state.value.scale
        let newScale = oldScale - delta * 0.001 // Sensitivity

        // Clamp
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))

        // Calculate World Point under mouse BEFORE zoom
        const worldPoint = screenToWorld(screenX, screenY)

        // Apply new scale
        state.value.scale = newScale

        // Adjust Pan so that World Point remains under Screen Point
        // NewPan = Screen - World * NewScale
        state.value.x = screenX - worldPoint.x * newScale
        state.value.y = screenY - worldPoint.y * newScale
    }

    function resetViewport() {
        state.value = { x: 0, y: 0, scale: 1 }
    }

    return {
        state,
        containerStyle,
        screenToWorld,
        worldToScreen,
        panBy,
        setPan,
        zoomAt,
        resetViewport
    }
}
