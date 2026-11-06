/**
 * 自定义尺寸模板（1x1 ~ 5x6）
 * ==========================
 *
 * 不写死 30 份配置，而是按行列现算 —— 少一份数据源，少一处会忘更新的地方。
 */
import type { Template } from "./types";

/** 行数上限 */
const MAX_ROWS = 5;

/** 列数上限 */
const MAX_COLS = 6;

/**
 * 生成所有自定义尺寸模板。
 *
 * 1x1 也包含在内 —— 当年用户明确要求有 1x1（"唯一真神"那类场景）。
 */
export function buildCustomTemplates(): Template[] {
    const list: Template[] = [];

    for (let r = 1; r <= MAX_ROWS; r++) {
        for (let c = 1; c <= MAX_COLS; c++) {
            list.push({
                id: `custom_${r}x${c}`,
                name: `自定义 ${r}x${c}`,
                category: "custom",
                label: `${r}行`,
                cols: c,
                defaultTitle: "自定义标题",
                items: Array(r * c).fill("自定义"),
            });
        }
    }

    return list;
}
