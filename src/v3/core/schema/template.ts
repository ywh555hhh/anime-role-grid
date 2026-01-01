/**
 * src/v3/core/schema/template.ts
 * Next Level Template Protocol (v3.0)
 * Defines the contract for Data-Driven World Generation
 */

export interface ILayoutDef {
    type: 'grid';
    rows: number;
    cols: number;
    gap: number;
    padding: number;
    slotSize?: { w: number; h: number };
}

export interface IViewportDef {
    id: string;
    position: { x: number; y: number }; // Top-Left absolute position
    layout: ILayoutDef;
}

export interface ITemplate {
    meta: { name: string; version: string };
    viewports: IViewportDef[];
    // docks: IDockDef[]; (Reserved for future)
}
