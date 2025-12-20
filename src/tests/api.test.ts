import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../services/api'

// Mock the global fetch
global.fetch = vi.fn()

describe('API Service', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    it('searchBangumi should call the correct proxy endpoint', async () => {
        // Mock successful response
        const mockResponse = {
            data: [
                { id: 1, name: 'Naruto', images: { large: 'url' } }
            ]
        }

            ; (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            })

        const result = await api.searchBangumi('Naruto', 'character')

        // Expect items to be returned
        expect(result).toHaveLength(1)
        expect(result[0]?.name).toBe('Naruto')

        // Verify fetch arguments (Proxy Check)
        const callArgs = (global.fetch as any).mock.calls[0];
        expect(callArgs[0]).toBe('/api/search');

        // Assert Authorization header is NOT sent from client
        const headers = callArgs[1].headers;
        expect(headers).not.toHaveProperty('Authorization');

        expect(callArgs[1]).toEqual(expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"keyword":"Naruto"'),
        }))
    })

    it('searchBangumi should throw error on 401', async () => {
        ; (global.fetch as any).mockResolvedValue({
            ok: false,
            status: 401,
            statusText: 'Unauthorized'
        })

        await expect(api.searchBangumi('test')).rejects.toThrow('API 认证失败 (401)')
    })
})
