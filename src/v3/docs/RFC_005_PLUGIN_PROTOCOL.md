# RFC 005: Plugin Protocol & Lifecycle

## 1. Summary
This RFC formalizes the **IPlugin** interface, the standard contract for all extensions in the V3 Engine.

## 2. Philosophy: "Everything is a Plugin"
To support diverse modes (Streamer, Mobile, Creator), the Core Engine is minimal. All features, including the standard Grid and Assets library, are implemented as Plugins.

## 3. The `IPlugin` Interface

```typescript
interface IPlugin {
    id: string;
    version: string;
    
    // Lifecycle
    activate(context: IPluginContext): void | Promise<void>;
    deactivate(context: IPluginContext): void | Promise<void>;
}
```

### 3.1 The `IPluginContext` (Sandbox)
Plugins are not allowed to touch the DOM directly or hack global variables. They must operate through the `context` provided during activation:

*   **`registerView(view: IView)`**: Add a new Tab/Canvas mode.
*   **`registerDock(dock: IDock)`**: Add a new Side Panel.
*   **`systems.register(system: ISystem)`**: Add game logic/rules.
*   **`registry`**: Access to the globally synchronized ECS data.

## 4. Bootstrapping
The `PluginLoader` (`src/v3/platform/loader.ts`) is responsible for:
1.  Initializing the `IPluginContext` with the global SystemManager and Registry.
2.  Calling `plugin.activate(ctx)`.
3.  Handling errors and logging.

## 5. Case Study: "Zen Mode"
The Zen Plugin illustrates a complete UI override:
*   Registers `ZenView`: Replaces the Grid with a breathing exercise.
*   Registers `ZenDock`: Adds a meditation controller.
*   **Result**: The user can switch to a completely different application experience without code changes to the Core.
