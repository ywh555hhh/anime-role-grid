import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandService } from '../CommandService';

describe('CommandService', () => {
    let service: CommandService;

    beforeEach(() => {
        service = new CommandService();
    });

    it('should register and execute a command', async () => {
        const handler = vi.fn().mockReturnValue('success');

        service.register('test.ping', handler);
        const result = await service.execute('test.ping', { data: 123 });

        expect(handler).toHaveBeenCalledWith({ data: 123 });
        expect(result).toBe('success');
    });

    it('should throw error when executing non-existent command', async () => {
        await expect(service.execute('missing.cmd'))
            .rejects
            .toThrow("Command 'missing.cmd' not found");
    });

    it('should throw error on duplicate registration', () => {
        service.register('test.dup', async () => { });

        expect(() => {
            service.register('test.dup', async () => { });
        }).toThrow("Command 'test.dup' is already registered");
    });

    it('should support metadata in registration', () => {
        service.register('test.meta', async () => { }, {
            title: 'Test Command',
            category: 'Testing'
        });

        const cmd = (service as any).commands.get('test.meta');
        expect(cmd.metadata).toEqual({
            title: 'Test Command',
            category: 'Testing'
        });
    });

    it('should return IDisposable that unregisters command', async () => {
        const disposable = service.register('test.dispose', async () => { });

        // Should work initially
        expect((service as any).commands.has('test.dispose')).toBe(true);

        // Dispose
        disposable.dispose();

        // Should be gone
        expect((service as any).commands.has('test.dispose')).toBe(false);
        await expect(service.execute('test.dispose'))
            .rejects
            .toThrow();
    });

    it('should handle handler errors gracefully (rethrow with context)', async () => {
        service.register('test.error', async () => {
            throw new Error('Handler Failed');
        });

        await expect(service.execute('test.error'))
            .rejects
            .toThrow('Handler Failed');
    });
});
