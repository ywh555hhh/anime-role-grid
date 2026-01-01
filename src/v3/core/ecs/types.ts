/**
 * src/v3/core/ecs/types.ts
 * Next Level Engine V3 - Core Type Contracts
 * 这里的定义决定了引擎的扩展上限。
 * 采用了 "Interface Merging" 模式，允许业务层扩展 CoreComponentMap。
 */

// ==========================================
// 1. 基础身份标识 (Identity & Primitives)
// ==========================================

/**
 * 品牌类型辅助器 (Branding Utility)
 * 用于创建不仅是 string，而且具有语义的 ID
 */
export type Brand<K, T> = K & { readonly __brand: T };

/** 实体 ID - 全局唯一标识符 (UUID) */
export type EntityId = Brand<string, 'EntityId'>;

/** * 组件类型名称 
 * 对应 ComponentMap 中的 Key
 */
export type ComponentType = keyof CoreComponentMap;

// ==========================================
// 1.5 层级策略 (Layer Strategy)
// ==========================================
export const LAYERS = {
    BACKGROUND: 0,
    SLOT: 10,
    CARD_IDLE: 20,
    CARD_HOVER: 30,
    CARD_DRAGGING: 100,
    UI_OVERLAY: 200
} as const;


// ==========================================
// 1.8 事件总线定义 (Event Definitions)
// ==========================================

/**
 * [扩展点] 全局事件映射表
 * 定义了系统间通信的所有事件及其 Payload 结构。
 * 使用 EventBus.emit('eventName', payload) 触发。
 */
export interface EventMap {
    /** 
     * 实体吸附事件
     * 当一个可拖拽实体被吸附到某个 Slot 时触发。
     * @payload {entityId} 被拖拽的实体 ID
     * @payload {slotId} 吸附的目标 Slot ID
     */
    'entity:snapped': { entityId: EntityId; slotId: EntityId };

    /**
     * 实体交换事件
     * 当两个实体（拖拽者与被占用者）发生位置交换时触发。
     * @payload {activeId} 主动拖拽的实体 ID
     * @payload {targetId} 被交换的（原本在 Slot 里的）实体 ID
     */
    'entity:swapped': { activeId: EntityId; targetId: EntityId };

    /**
     * 模板加载事件
     * 当一个新的模板被 TemplateLoader 加载完成时触发。
     * @payload {templateId} 模板的唯一标识符
     */
    'template:loaded': { templateId: string };
}


// ==========================================
// 2. 组件契约 (Component Contracts)
// ==========================================

/**
 * [核心扩展点] 组件映射表
 * 所有的 Component 数据结构必须在这里注册。
 * 利用 TypeScript 的 Interface Merging 特性，
 * 外部模块可以通过 declare module 扩展这个接口。
 */
export interface CoreComponentMap {
    /**
     * [元数据组件]
     * 用于描述实体的基本信息，如调试名称、创建时间等。
     * 通常由 EditorSystem 或 Debugger 使用。
     */
    'Meta': {
        name: string;
        description?: string;
        createdTime: number;
    };

    /**
     * [变换组件] (REQ-VIEW-01)
     * 定义实体在 2D 空间中的位置和尺寸。
     * 注意：这是实体的“逻辑位置”。
     * - width/height: 用于布局计算（如 Slot 大小）。
     * - z: 决定渲染层级 (参见 LAYERS 常量)。
     */
    'Transform': {
        x: number;
        y: number;
        z: number;
        rotation?: number;
        scale?: number;
        width?: number;
        height?: number;
        parentId?: EntityId;
    };

    /**
     * [视觉组件] (REQ-SRC-01)
     * 定义实体的外观。
     * - type: 支持图片、纯色块或文本。
     * - src: 资源的 UUID (指向 ImagePool) 或 Hex 颜色值。
     * - styleVariant: 为了支持换肤 (Theming)。
     */
    'Visual': {
        src: string;
        type: 'image' | 'color' | 'text';
        visible: boolean;
        styleVariant?: string;
    };

    /**
     * [布局配置组件] (REQ-VIEW-02)
     * 当实体作为容器（如 Grid）或特殊布局元素（如 Slot）时使用。
     * - strategy: 布局策略 (grid, flex, slot 等)。
     * - Slot: 标记该实体是一个“插槽”，用于吸附其他实体。
     */
    'LayoutConfig': {
        strategy: 'grid' | 'flex' | 'free' | 'stack' | 'slot';
        rows?: number;
        cols?: number;
        gap?: number;
        padding?: number;
    };

    /**
     * [交互组件] (REQ-FLOW-01)
     * 定义实体的交互行为。
     * @transient 此组件通常不参与序列化 (Serialize)，属于运行时状态。
     * - isDraggable: 是否可被鼠标拖动。
     * - isSelectable: 是否可被点击选中。
     */
    'Interaction': {
        isDraggable: boolean;
        isSelectable: boolean;
        isSelected: boolean;
        isHovered: boolean;
    };
}

/**
 * 组件容器
 * 实际上在运行时，组件数据是扁平存储的，不需要这个包装器。
 * 但为了类型推导，我们定义这个工具类型。
 */
export type ComponentData<K extends ComponentType> = CoreComponentMap[K];


// ==========================================
// 3. 世界状态结构 (World State Structure)
// ==========================================

/**
 * ECS 数据存储结构 (SoA - Structure of Arrays style)
 * 这种结构对 "按组件查询" 极其友好 (O(1) 复杂度)。
 * * 结构示例:
 * {
 * entities: Set<EntityId>,
 * components: {
 * 'Transform': Map<EntityId, {x: 1, y: 2}>,
 * 'Visual': Map<EntityId, {src: '...'} >
 * }
 * }
 */
export interface WorldState {
    // 所有存活实体的集合
    entities: Set<EntityId>;

    // 组件存储：Key 是组件名，Value 是 "EntityId -> Data" 的映射
    // 必须使用 Partial，因为不是所有组件都必须初始化
    components: {
        [K in ComponentType]: Map<EntityId, ComponentData<K>>;
    };

    // 倒排索引 (REQ-CORE-02: Required for Phase 1)
    indices: Map<ComponentType, Set<EntityId>>;
}


// ==========================================
// 4. 注册表接口 (Registry Interface)
// ==========================================

/**
 * 对外暴露的操作接口
 * 实现了 REQ-CORE-01 的严格类型推导
 */
export interface IRegistry {
    // 实体生命周期
    createEntity(id?: string): EntityId;
    destroyEntity(id: EntityId): void;

    // 组件操作 (核心 CRUD)
    // T 会自动推导为组件名，data 的类型会自动匹配 CoreComponentMap[T]
    addComponent<T extends ComponentType>(
        entityId: EntityId,
        type: T,
        data: ComponentData<T>
    ): void;

    removeComponent<T extends ComponentType>(
        entityId: EntityId,
        type: T
    ): void;

    // 核心查询：泛型推导返回值
    // 返回值可能是 undefined (如果实体没有该组件)
    getComponent<T extends ComponentType>(
        entityId: EntityId,
        type: T
    ): ComponentData<T> | undefined;

    // 批量修改 (REQ-CORE-03)
    batch(callback: () => void): void;

    // 导出状态 (快照)
    getSnapshot(): WorldState;
}


// ==========================================
// 5. 命令模式 (Command Pattern)
// ==========================================

/**
 * 命令接口 (REQ-CORE-04)
 * 支持时间旅行
 */
export interface ICommand {
    readonly id: string;
    readonly type: string; // e.g., 'MOVE_ENTITY', 'ADD_COMPONENT'
    readonly timestamp: number;

    // 执行逻辑：修改 World State
    execute(registry: IRegistry): void;

    // 撤销逻辑：恢复 World State
    undo(registry: IRegistry): void;
}

export interface IHistoryStack {
    push(command: ICommand): void;
    undo(): void;
    redo(): void;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
}


// ==========================================
// 6. 系统 (System)
// ==========================================

/**
 * 系统接口
 * 系统是无状态的逻辑单元，它只消费 Registry
 */
export interface ISystem {
    id: string;
    // 优先级：决定 System 执行顺序 (Layout -> Interaction -> Render)
    priority: number;

    // 初始化 (如添加事件监听)
    init?(registry: IRegistry): void;

    // 销毁
    destroy?(): void;
}

// 响应式系统不需要 update(dt)，它们依赖 Vue/Pinia 的 reactivity
// 但对于物理模拟或动画，可能需要 FrameSystem
export interface ITickSystem extends ISystem {
    update(dt: number, registry: IRegistry): void;
}
