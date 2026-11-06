/**
 * 模板总入口
 * ==========
 *
 * 各分类的数据放在同目录的独立文件里，这里只做**汇总与再导出**。
 *
 * ## 为什么要拆
 * 曾经是一个 1549 行的单文件：加一个模板要翻到中间某段巨型数组里，
 * 搜索框跳不过去、review 看不动、冲突必炸。现在按分类/主题拆成
 * 纯系列、角色、作品、关系、趣味、绅士、现充、2025 新增、属性特攻、自定义
 * 十个文件，每个文件只管自己那段。
 *
 * ## 顺序
 * `TEMPLATES` 的拼接顺序 = 旧单文件里的先后顺序，**刻意保持不变**：
 * 画廊「全部」tab 会按 hot 优先、再按数组原始顺序排，顺序变了用户看到的
 * 排列就变了。
 *
 * 用法不变，仍然是 `import { TEMPLATES } from '~/logic/templates'`。
 */
import type { Template } from './types';
import { PURE_TEMPLATES } from './pure';
import { CHARACTER_TEMPLATES } from './character';
import { WORK_TEMPLATES } from './work';
import { RELATION_TEMPLATES } from './relation';
import { FUN_TEMPLATES } from './fun';
import { NSFW_TEMPLATES } from './nsfw';
import { LIFE_TEMPLATES } from './life';
import { NEW_2025_TEMPLATES } from './new2025';
import { TROPES_TEMPLATES } from './tropes';
import { buildCustomTemplates } from './custom';

export type { Template, TemplateBadge, TemplateCategory } from './types';

export const TEMPLATES: Template[] = [
    ...PURE_TEMPLATES,
    ...CHARACTER_TEMPLATES,
    ...WORK_TEMPLATES,
    ...RELATION_TEMPLATES,
    ...FUN_TEMPLATES,
    ...NSFW_TEMPLATES,
    ...LIFE_TEMPLATES,
    ...NEW_2025_TEMPLATES,
    ...TROPES_TEMPLATES,
    ...buildCustomTemplates(),
];
