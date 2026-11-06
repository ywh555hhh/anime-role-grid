/**
 * 模板的领域类型
 * ==============
 *
 * 只放类型，不放数据 —— 数据在同目录的各个 category 文件里。
 */

/** 模板分类。决定它在画廊里归到哪个 tab。 */
export type TemplateCategory = "character" | "work" | "relation" | "fun" | "nsfw" | "custom";

// 角标类型
export type TemplateBadge = "hot" | "new" | "recommend" | "classic" | "limited" | "pure";

export interface Template {
    id: string;
    name: string;
    category: TemplateCategory;
    label?: string; // Secondary Label (e.g. "Anime", "Manga", "Attribute")
    cols: number;
    items: string[];
    defaultTitle?: string;
    hot?: boolean; // 兼容旧字段
    badge?: TemplateBadge; // 新角标字段
    /**
     * 上线月份（YYYY-MM）。
     *
     * 只给**新加**的模板填，老模板没有这个字段。
     * 用途：画廊的「🆕 最新」排序维度 —— 否则新模板按「真实填写量」排，
     * 而它们刚上线还没有量，会被埋在第 100 位之后没人看得见。
     */
    addedAt?: string;
}
