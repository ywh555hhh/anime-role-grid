/**
 * 模板总入口
 * ==========
 *
 * 各分类的数据放在同目录的独立文件里，这里只做**汇总与再导出**。
 *
 * ## 为什么要拆
 * 曾经是一个 1549 行的单文件：加一个模板要翻到中间某段巨型数组里，
 * 搜索框跳不过去、review 看不动、冲突必炸。现在按分类/主题拆成
 * 当下热门、纯系列、角色、作品、关系、趣味、绅士、现充、2025 新增、属性特攻、自定义
 * 十一个文件，每个文件只管自己那段。
 *
 * 其中 `trendy.ts` 是**会过季**的那一组（贴着当下网络热度与作品热度），
 * 换季时整体替换这一个文件即可，不动其它 113 个。
 *
 * ## 顺序
 * 旧的那些模板，拼接顺序 = 旧单文件里的先后顺序，**刻意保持不变**。
 * 新增的 `trendy` 放在最前 —— 它们贴着现在的热度。
 *
 * 画廊「全部」tab 现在默认按**真实填写量**排序（见 logic/templateGallery），
 * 所以数组顺序只在「没有使用量数据」的那批里起作用。
 *
 * 用法不变，仍然是 `import { TEMPLATES } from '~/logic/templates'`。
 */
import type { Template } from "./types";
import { PURE_TEMPLATES } from "./pure";
import { CHARACTER_TEMPLATES } from "./character";
import { WORK_TEMPLATES } from "./work";
import { RELATION_TEMPLATES } from "./relation";
import { FUN_TEMPLATES } from "./fun";
import { NSFW_TEMPLATES } from "./nsfw";
import { LIFE_TEMPLATES } from "./life";
import { NEW_2025_TEMPLATES } from "./new2025";
import { TROPES_TEMPLATES } from "./tropes";
import { TRENDY_TEMPLATES } from "./trendy";
import { buildCustomTemplates } from "./custom";

export type { Template, TemplateBadge, TemplateCategory } from "./types";

export const TEMPLATES: Template[] = [
    // 「当下热门」排在最前 —— 它们贴着现在的热度，过季就会被整体替换。
    ...TRENDY_TEMPLATES,
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
