import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import {
    GALLERY_SORTS,
    MIN_SUB_LABEL_COUNT,
    filterTemplates,
    formatUsage,
    getSubLabelOptions,
    matchesQuery,
    sortTemplates,
} from "~/logic/templateGallery";
import type { Template } from "~/logic/templates";

const require = createRequire(import.meta.url);

/**
 * 模板画廊的筛选与排序
 * ======================
 *
 * 这个界面被吐槽过「分类不明确、找起来困难、没有排序标准、很碎片化」。
 * 这里是四个解法的回归测试。
 */
function tpl(partial: Partial<Template> & { id: string }): Template {
    return {
        name: partial.id,
        category: "character",
        label: "",
        cols: 3,
        items: [],
        ...partial,
    };
}

describe("关键词搜索", () => {
    const classic = tpl({
        id: "classic",
        name: "经典 (5x3)",
        label: "基础",
        items: ["本命", "初恋", "最佳人设"],
    });

    it("能按模板名搜到", () => {
        expect(matchesQuery(classic, "经典")).toBe(true);
        expect(matchesQuery(classic, "classic")).toBe(false);
    });

    it("能按二级标签搜到", () => {
        expect(matchesQuery(classic, "基础")).toBe(true);
    });

    it("能按条目内容搜到 —— 用户想的是「我要填本命」而不是「我要找 classic」", () => {
        expect(matchesQuery(classic, "本命")).toBe(true);
        expect(matchesQuery(classic, "不存在的东西")).toBe(false);
    });

    it("忽略大小写和首尾空格", () => {
        expect(matchesQuery(classic, "  经典  ")).toBe(true);
    });

    it("空关键词匹配全部", () => {
        expect(matchesQuery(classic, "")).toBe(true);
        expect(matchesQuery(classic, "   ")).toBe(true);
    });

    it("filterTemplates 走同一条规则", () => {
        expect(filterTemplates([classic], "本命")).toHaveLength(1);
        expect(filterTemplates([classic], "没有")).toHaveLength(0);
        expect(filterTemplates([classic], "")).toHaveLength(1);
    });
});

describe("二级标签选项", () => {
    it("只保留够格的（≥ MIN_SUB_LABEL_COUNT）", () => {
        const list = [
            tpl({ id: "a", label: "番剧角色" }),
            tpl({ id: "b", label: "番剧角色" }),
            tpl({ id: "c", label: "番剧角色" }),
            tpl({ id: "d", label: "只有一个" }),
        ];
        const options = getSubLabelOptions(list);
        expect(options).toHaveLength(1);
        expect(options[0]).toEqual({ label: "番剧角色", count: 3 });
    });

    it("按模板数降序 —— 选择余地大的排前面", () => {
        const list = [
            tpl({ id: "a", label: "少" }),
            tpl({ id: "b", label: "少" }),
            tpl({ id: "c", label: "少" }),
            tpl({ id: "d", label: "多" }),
            tpl({ id: "e", label: "多" }),
            tpl({ id: "f", label: "多" }),
        ];
        const options = getSubLabelOptions(list);
        expect(options[0]?.label).toBe("多");
        expect(options[0]?.count).toBe(3);
        expect(options[1]?.label).toBe("少");
        expect(options[1]?.count).toBe(3);
    });

    it("没有标签的模板不产生选项", () => {
        expect(getSubLabelOptions([tpl({ id: "x" })])).toHaveLength(0);
    });

    it("阈值就是 3（少于 3 个的标签是噪音，不是筛选）", () => {
        expect(MIN_SUB_LABEL_COUNT).toBe(3);
    });
});

describe("排序", () => {
    const a = tpl({ id: "a", name: "A", cols: 5, hot: true });
    const b = tpl({ id: "b", name: "B", cols: 1 });
    const c = tpl({ id: "c", name: "C", cols: 3 });

    it("热门：按真实填写次数降序", () => {
        const sorted = sortTemplates([a, b, c], "popular", { c: 100, a: 10, b: 1 });
        expect(sorted.map((t) => t.id)).toEqual(["c", "a", "b"]);
    });

    it("热门：没有数据的排在有数据之后（不是混在一起）", () => {
        const sorted = sortTemplates([b, a], "popular", { a: 10 });
        expect(sorted.map((t) => t.id)).toEqual(["a", "b"]);
    });

    it("热门：都没数据时退回 hot 标记，再按名称", () => {
        const sorted = sortTemplates([b, a], "popular", {});
        expect(sorted.map((t) => t.id)).toEqual(["a", "b"]);
    });

    it("格子数：升序（1x1 极简 → 5x6 大表）", () => {
        const sorted = sortTemplates([a, b, c], "size", {});
        expect(sorted.map((t) => t.cols)).toEqual([1, 3, 5]);
    });

    it("名称：按中文拼音序（败 bai < 动 dong < 角 jiao）", () => {
        const list = [
            tpl({ id: "x", name: "角色特攻" }),
            tpl({ id: "y", name: "败犬大合集" }),
            tpl({ id: "z", name: "动漫综合" }),
        ];
        const sorted = sortTemplates(list, "name", {});
        expect(sorted.map((t) => t.id)).toEqual(["y", "z", "x"]);
    });

    it("名称：ASCII 名排在中文之后（ICU zh 排序规则）", () => {
        const list = [tpl({ id: "x", name: "败犬大合集" }), tpl({ id: "y", name: "Anime" })];
        const sorted = sortTemplates(list, "name", {});
        expect(sorted.map((t) => t.id)).toEqual(["x", "y"]);
    });

    it("最新：有 addedAt 的排在前面，按月份降序", () => {
        const old = tpl({ id: "old", name: "老模板" });
        const nov = tpl({ id: "nov", name: "11 月的", addedAt: "2026-11" });
        const oct = tpl({ id: "oct", name: "10 月的", addedAt: "2026-10" });
        const sorted = sortTemplates([old, oct, nov], "newest", {});
        expect(sorted.map((t) => t.id)).toEqual(["nov", "oct", "old"]);
    });

    it("最新：同月上线的按热门排", () => {
        const a = tpl({ id: "a", name: "A", addedAt: "2026-11" });
        const b = tpl({ id: "b", name: "B", addedAt: "2026-11" });
        const sorted = sortTemplates([a, b], "newest", { b: 50 });
        expect(sorted.map((t) => t.id)).toEqual(["b", "a"]);
    });

    it("不改动传入的数组", () => {
        const input = [a, b, c];
        const copy = [...input];
        sortTemplates(input, "size", {});
        expect(input).toEqual(copy);
    });
});

describe("使用量文案", () => {
    it("一万以上用「万」", () => {
        expect(formatUsage(35851)).toBe("3.6万");
        expect(formatUsage(10000)).toBe("1.0万");
    });

    it("一万以下直接给数字", () => {
        expect(formatUsage(4300)).toBe("4300");
        expect(formatUsage(0)).toBe("0");
    });
});

describe("排序图标", () => {
    const carbonIcons = require("@iconify-json/carbon/icons.json").icons as Record<string, unknown>;

    it("每个图标在 carbon 图标集里都存在 —— 不存在就是一片空白", () => {
        for (const option of GALLERY_SORTS) {
            const key = option.icon.replace("i-carbon-", "");
            expect(carbonIcons[key], `${option.icon} 不在 carbon 图标集里`).toBeDefined();
        }
    });

    it("每个图标都在 UnoCSS safelist 里 —— 动态类名静态扫描扫不到", async () => {
        // UnoCSS 默认只扫 .vue/.html 等，.ts 不在扫描范围。
        // 而排序按钮的图标是数据驱动的（:class="option.icon"），
        // 不 safelist 就永远生成不出来 —— 图标位置会是一片空白。
        const uno = (await import("../../uno.config")).default as { safelist?: string[] };
        expect(uno.safelist).toBeDefined();
        for (const option of GALLERY_SORTS) {
            expect(uno.safelist, `${option.icon} 不在 safelist 里`).toContain(option.icon);
        }
    });
});
