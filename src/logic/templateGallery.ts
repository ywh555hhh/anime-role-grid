/**
 * 模板画廊的筛选与排序逻辑
 * =========================
 *
 * 纯函数，不碰 DOM —— 这样能单独测。
 *
 * ## 为什么要重做排序
 * 以前只有一套排序，而且很怪：
 *
 *   1. 在「全部」下，`hot` 标记的排前面
 *   2. 接着是一个**硬编码在组件里的** PINNED id 列表
 *   3. 其余**保持源码里的书写顺序**
 *
 * 第 3 条是关键问题 —— 那个顺序是历史遗留（谁先加的谁在前），
 * 对用户没有任何意义。于是「角色」分类里 53 个模板是乱序的，
 * 用户只能一个个扫。
 *
 * 现在有三个明确的维度，默认用**真实填写量**：
 * `/api/trending-templates` 返回每个模板被填过多少次，
 * 实测 `classic` 是 35851 次、第二名 4300 次 —— 差 8 倍多，
 * 这个信号比任何人工标记都准。
 * （顺带一提：那个接口以前被调用了，但数据拿到手**从来没在界面上用过**。）
 */

import type { Template } from "~/logic/templates";

/** 排序维度 */
export type GallerySort = "popular" | "size" | "name";

export interface GallerySortOption {
    id: GallerySort;
    label: string;
    icon: string;
}

/** 可选的排序维度，顺序即显示顺序 */
export const GALLERY_SORTS: GallerySortOption[] = [
    { id: "popular", label: "热门", icon: "i-carbon-fire" },
    { id: "size", label: "格子数", icon: "i-carbon-grid" },
    { id: "name", label: "名称", icon: "i-carbon-text-align-left" },
];

/**
 * 二级标签至少要包含多少个模板，才值得作为筛选项出现。
 *
 * 以前二级标签是「有多少显示多少」，于是列表里混着一堆：
 *
 *   - 「三次元」「年度」「漫画」「轻小说」「Galgame」—— 各只有 1 个模板
 *   - 「基础」「游戏角色」「游戏」—— 在「角色」分类下各 1~2 个
 *   - 「关系/CP」分类下 5 个模板 5 个标签 —— 二级筛选等于没有
 *
 * 点进去只出 1 张卡，那不叫筛选，叫噪音。
 * 所以：**不够格的标签直接不出现**。
 */
export const MIN_SUB_LABEL_COUNT = 3;

/**
 * 关键词匹配：模板名 / 二级标签 / 条目文本。
 *
 * 条目文本也算 —— 用户想的是「我要填本命、初恋」，
 * 而不是「我要找 id 为 classic 的模板」。
 */
export function matchesQuery(template: Template, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    return (
        template.name.toLowerCase().includes(q) ||
        (template.label ?? "").toLowerCase().includes(q) ||
        template.items.some((item) => item.toLowerCase().includes(q))
    );
}

/** 按关键词过滤 */
export function filterTemplates(templates: Template[], query: string): Template[] {
    if (!query.trim()) return templates;
    return templates.filter((t) => matchesQuery(t, query));
}

/**
 * 二级标签选项。
 *
 * 只保留够大的标签，并按**模板数降序**排 —— 模板多的排前面，
 * 用户先看到最有选择余地的那一组。
 */
export function getSubLabelOptions(templates: Template[]): { label: string; count: number }[] {
    const counter = new Map<string, number>();

    for (const template of templates) {
        if (!template.label) continue;
        counter.set(template.label, (counter.get(template.label) ?? 0) + 1);
    }

    return [...counter.entries()]
        .filter(([, count]) => count >= MIN_SUB_LABEL_COUNT)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh"));
}

/** 热门比较：填写次数降序 → hot 标记 → 名称 */
function byPopular(a: Template, b: Template, trending: Record<string, number>): number {
    const countA = trending[a.id] ?? -1;
    const countB = trending[b.id] ?? -1;
    if (countA !== countB) return countB - countA;

    if (a.hot !== b.hot) return a.hot ? -1 : 1;
    return a.name.localeCompare(b.name, "zh");
}

/**
 * 排序。
 *
 * - `popular` —— 真实填写次数降序。没有数据的排在有数据之后（而不是混在一起），
 *   因为「没人填过」是真实信息，不该被当成「排在中间」。
 * - `size` —— 格子数升序。用户挑模板时想的是「做个 1x1 极简的还是 5x6 大表」，
 *   这是一个真实且分布均匀的维度（1~2 列 6 个 / 3 列 51 个 / 4~6 列 61 个）。
 * - `name` —— 名称字典序（中文按拼音）。
 */
export function sortTemplates(
    templates: Template[],
    sort: GallerySort,
    trending: Record<string, number> = {},
): Template[] {
    const list = [...templates];

    switch (sort) {
        case "popular":
            return list.sort((a, b) => byPopular(a, b, trending));

        case "size":
            return list.sort((a, b) => {
                if (a.cols !== b.cols) return a.cols - b.cols;
                return byPopular(a, b, trending);
            });

        case "name":
            return list.sort((a, b) => a.name.localeCompare(b.name, "zh"));
    }
}

/**
 * 填写量的人话格式。
 *
 * 中文语境下「3.6万」比「3.6w」自然，「4300」比「4.3k」自然。
 */
export function formatUsage(count: number): string {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
    return String(count);
}
