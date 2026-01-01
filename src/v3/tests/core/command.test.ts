/**
 * src/v3/tests/core/command.test.ts
 * Unit Tests for Command System & Time Travel
 */
import { describe, it, expect } from 'vitest';
import { Registry } from '../../core/ecs/registry';
import { HistoryStack, createSetComponentCommand } from '../../core/ecs/command';

describe('V3 Command System', () => {

    it('Scenario A: General Undo/Redo', () => {
        const registry = new Registry();
        const history = new HistoryStack(registry);
        const entityId = registry.createEntity();

        // 1. Initial State: Visible = true
        // We manually set up initial state without command, or use command. 
        // User scenario says: Entity A Visual.visible initial is true.
        const initialVisual = { src: 'init.png', type: 'image' as const, visible: true };
        registry.addComponent(entityId, 'Visual', initialVisual);

        // 2. Execute Command: Set visible = false
        const newVisual = { ...initialVisual, visible: false };
        const cmd = createSetComponentCommand(entityId, 'Visual', newVisual);

        history.execute(cmd);

        // Assert: Now false
        const current = registry.getComponent(entityId, 'Visual');
        expect(current?.visible).toBe(false);
        expect(history.canUndo).toBe(true);
        expect(history.canRedo).toBe(false);

        // 3. Undo
        history.undo();

        // Assert: Restored to true
        const restored = registry.getComponent(entityId, 'Visual');
        expect(restored?.visible).toBe(true);
        expect(history.canUndo).toBe(false);
        expect(history.canRedo).toBe(true);

        // 4. Redo
        history.redo();
        const redone = registry.getComponent(entityId, 'Visual');
        expect(redone?.visible).toBe(false);
    });

    it('Scenario B: Destructive Redo', () => {
        const registry = new Registry();
        const history = new HistoryStack(registry);
        const entityId = registry.createEntity();

        // Cmd1
        const cmd1 = createSetComponentCommand(entityId, 'Visual', { src: '1', type: 'text', visible: true });
        history.execute(cmd1); // History: [Cmd1]

        // Cmd2
        const cmd2 = createSetComponentCommand(entityId, 'Visual', { src: '2', type: 'text', visible: true });
        history.execute(cmd2); // History: [Cmd1, Cmd2]

        // Undo (Back to Cmd1 state)
        history.undo(); // History: [Cmd1], Future: [Cmd2]
        expect(registry.getComponent(entityId, 'Visual')?.src).toBe('1');

        // Execute new Cmd3
        const cmd3 = createSetComponentCommand(entityId, 'Visual', { src: '3', type: 'text', visible: true });
        history.execute(cmd3);

        // Assert: Cmd2 is gone from Future
        // History should be [Cmd1, Cmd3]
        expect(registry.getComponent(entityId, 'Visual')?.src).toBe('3');
        expect(history.canRedo).toBe(false); // Future cleared

        // precise consistency check
        history.undo(); // Undo Cmd3 -> back to Cmd1 state
        expect(registry.getComponent(entityId, 'Visual')?.src).toBe('1');

        history.undo(); // Undo Cmd1 -> back to empty/undefined
        expect(registry.getComponent(entityId, 'Visual')).toBeUndefined();
    });

    it('should respect max history length', () => {
        const registry = new Registry();
        const history = new HistoryStack(registry, 2); // Max 2
        const id = registry.createEntity();

        const cmd1 = createSetComponentCommand(id, 'Transform', { x: 1, y: 0, z: 0 });
        const cmd2 = createSetComponentCommand(id, 'Transform', { x: 2, y: 0, z: 0 });
        const cmd3 = createSetComponentCommand(id, 'Transform', { x: 3, y: 0, z: 0 });

        history.execute(cmd1);
        history.execute(cmd2);
        history.execute(cmd3); // Should bump cmd1 out

        // Undo 1 (undo cmd3 -> state 2)
        history.undo();
        expect(registry.getComponent(id, 'Transform')?.x).toBe(2);

        // Undo 2 (undo cmd2 -> state 1)
        history.undo();
        expect(registry.getComponent(id, 'Transform')?.x).toBe(1);

        // Undo 3 (should fail/do nothing as cmd1 is gone)
        expect(history.canUndo).toBe(false);
        history.undo();
        expect(registry.getComponent(id, 'Transform')?.x).toBe(1); // Stays at 1
    });

    it('should use shallow copy for memory optimization', () => {
        const registry = new Registry();
        const id = registry.createEntity();

        // Large object simulation
        const largeData = { src: 'base64...', nested: { heavy: true } };
        const cmd = createSetComponentCommand(id, 'Visual', largeData as any);

        // Execute (captures snapshot)
        // Inside createSetComponentCommand, we do `const dataSnapshot = shallowClone(newData)`

        // Mutate original input immediately after creation (Simulate dangerous external mutation)
        // If it was reference copy, snapshot would change.
        // If shallow copy, top level prop change shouldn't affect snapshot, but nested might?
        // Wait, shallow copy { ...data } protects top level properties.
        // But nested objects are still shared references.
        // User asked for Shallow Copy to avoid deep cloning large strings (Base64 is usually top level string).
        // Let's verify top level protection.

        // 1. Mutate top level property of input
        (largeData as any).src = 'modified';

        // Execute
        // Note: Command creation captures snapshot at creation time (line 104 in command.ts)
        // So modification AFTER creation but BEFORE execution shouldn't matter if cloned at creation.
        // My implementation clones at Creation.

        // Let's verify that the command stored the ORIGINAL 'base64...'
        // We can't inspect command internal closure easily.
        // But we can Execute and see what ends up in Registry.

        const history = new HistoryStack(registry);
        history.execute(cmd);

        const inRegistry = registry.getComponent(id, 'Visual');
        expect(inRegistry?.src).toBe('base64...'); // Should NOT be 'modified'

        // 2. Verify Nested Reference (Shallow Copy Limitation)
        // Since we use shallow copy, nested objects are shared.
        // If we mutate nested, it WILL change in registry if command didn't prevent it.
        // This confirms it Is shallow.
        (largeData as any).nested.heavy = false;

        // Registry stores the snapshot which is reference to nested.
        // So checking registry now:
        expect((inRegistry as any).nested.heavy).toBe(false);
        // This proves it is Shallow Copy (Deep mutation leaks). 
        // This is Desired Behavior for Performance (avoiding deep clone of massive trees if not needed), 
        // assuming Components are mostly flat or we treat them immutably.
    });
});
