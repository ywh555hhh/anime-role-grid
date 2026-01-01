import type { IDisposable } from '../contracts';

export interface ICommandDef {
    id: string;
    handler: (payload: any) => Promise<any> | any;
    metadata?: {
        title?: string;
        category?: string;
    };
}

export class CommandService {
    private commands = new Map<string, ICommandDef>();

    /**
     * Execute a command by ID
     */
    async execute<T = any>(id: string, payload?: any): Promise<T> {
        const cmd = this.commands.get(id);
        if (!cmd) {
            throw new Error(`Command '${id}' not found`);
        }

        try {
            return await cmd.handler(payload);
        } catch (error) {
            // In a real app we might log this to a telemetry service
            throw error;
        }
    }

    /**
     * Register a new command
     */
    register(
        id: string,
        handler: (payload: any) => Promise<any> | any,
        metadata?: { title?: string; category?: string }
    ): IDisposable {
        if (this.commands.has(id)) {
            throw new Error(`Command '${id}' is already registered`);
        }

        this.commands.set(id, { id, handler, metadata });

        return {
            dispose: () => {
                this.commands.delete(id);
            }
        };
    }
}
