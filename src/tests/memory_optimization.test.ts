
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useGridStore } from '../stores/gridStore'
import { ref } from 'vue'

// Mock useStorage to use in-memory map
vi.mock('@vueuse/core', async () => {
    const actual = await vi.importActual('@vueuse/core')
    return {
        ...actual,
        useStorage: (_key: string, initial: any) => {
            return ref(initial)
        },
        createGlobalState: (fn: any) => fn // Bypass global state wrapper for testing isolation
    }
})

// Mock API
vi.mock('~/services/api', () => ({
    api: {
        getTemplate: vi.fn(),
        saveGrid: vi.fn()
    }
}))

// Mock Templates
vi.mock('~/logic/templates', () => ({
    TEMPLATES: [
        { id: 'classic', name: 'Classic', cols: 5, items: Array(25).fill('Slot') }
    ]
}))

describe('Memory Optimization Store Logic', () => {
    beforeEach(() => {
        // Reset state mechanics if needed
    })

    it('should separate large base64 images into imagePool', async () => {
        const store = useGridStore()
        const { updateItem, currentList, resolveImage, loadTemplate } = store

        // Initialize grid
        await loadTemplate('classic')

        // 1. Create a "Heavy" character
        const hugeImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAABgADNjd8qAAAAABJRU5ErkJggg=='
        const char = {
            id: 'test-1',
            name: 'Heavy Char',
            image: hugeImage
        }

        // 2. Update Item
        updateItem(0, char)

        // 3. Verify State
        const savedChar = currentList.value[0]?.character
        expect(savedChar).toBeDefined()

        // CRITICAL: image should be undefined (stripped)
        expect(savedChar?.image).toBeUndefined()

        // CRITICAL: imageId should be a UUID-like string
        expect(savedChar?.imageId).toBeDefined()
        expect(typeof savedChar?.imageId).toBe('string')

        // 4. Verify Resolution
        const resolved = resolveImage(savedChar)
        expect(resolved).toBe(hugeImage)
    })

    it('should handle legacy images gracefully (no imageId)', () => {
        const store = useGridStore()
        const { resolveImage } = store

        const legacyChar = {
            id: 'legacy-1',
            name: 'Legacy',
            image: 'http://example.com/image.png' // Not Base64, or just legacy structure
        }

        const resolved = resolveImage(legacyChar)
        expect(resolved).toBe('http://example.com/image.png')
    })
})
