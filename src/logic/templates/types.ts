/**
 * 模板的领域类型
 * ==============
 *
 * 只放类型，不放数据 —— 数据在同目录的各个 category 文件里。
 */

/** 模板分类。决定它在画廊里归到哪个 tab。 */
export type TemplateCategory = 'character' | 'work' | 'relation' | 'fun' | 'nsfw' | 'custom';

// 角标类型
export type TemplateBadge = 'hot' | 'new' | 'recommend' | 'classic' | 'limited' | 'pure';

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
}
