/**
 * 字体准备：等字体就绪，并按「真正要画出来的字符串」补齐所需子集。
 *
 * ## 为什么不能只 `await document.fonts.ready`
 *
 * `document.fonts.ready` 只保证**已经发起的**字体加载都结束了 ——
 * 它不等那些**还没开始加载**的。
 *
 * 而 Google Fonts 提供的 Noto Serif SC 是按 `unicode-range` 切成**上百个子集**的
 * （实测 303 个 FontFace），浏览器只下载「当前 DOM 真的用到的那些」。
 * 本项目的层级色块、副标题在 DOM 里用的是系统字体（没有指定 Noto），
 * 所以它们**从来不会触发 Noto 的子集下载**。
 *
 * 结果就是 canvas 导出时：那些字所在的子集压根没下载过 →
 * 浏览器只能**逐字回退到别的字体** → 导出的图里个别字（实测是「夯」）和周围的字长得不一样。
 *
 * 实测（`document.fonts.check`，页面加载完 9 秒后）：
 *
 *     已经是 Noto 可用的字:   我推的格子级人上完了从排头
 *     还用不了的字:           夯顶拉序脑战        ← 其中「夯」正是用户报的那个
 *
 * ## 所以要做的事
 *
 * 用 `FontFaceSet.load(font, text)` —— 它按字符串把需要的子集补回来。
 * 导出前把**所有会被画出来的文字**都喂一遍，就不会再有字回退了。
 *
 * ## 为什么必须带超时
 *
 * 字体被墙时 `load` 可能迟迟不兑现。导出不能因此挂死 ——
 * 等不到就用当前可用字体照常导出，宁可字形略有差异，也不能让用户点了没反应。
 */

/** 等字体的上限。超过就放弃等待，用当前可用字体继续。 */
const FONT_WAIT_TIMEOUT_MS = 4000

export interface FontNeed {
    /** CSS font 简写，例如 `bold 44px "Noto Serif SC", serif` */
    font: string
    /** 这个字体下**真正会被画出来**的字符串 */
    text: string
}

/**
 * 等待字体就绪，并把 `needs` 里那些字符串所需的字体子集补齐。
 *
 * @param needs 要画的 (字体, 文本) 组合。**传得越全，导出成品越稳。**
 *              子集的选择只取决于「字体族 + 字重 + 字符」，与字号无关，
 *              所以同族同字重可以合并成一次调用。
 * @param timeoutMs 上限。超时则放弃等待，用当前可用字体继续（不能把导出挂死）。
 */
export async function waitForFonts(
    needs: readonly FontNeed[] = [],
    timeoutMs: number = FONT_WAIT_TIMEOUT_MS,
): Promise<void> {
    if (typeof document === 'undefined' || !document.fonts) return

    const jobs: Promise<unknown>[] = [document.fonts.ready]

    for (const need of needs) {
        if (!need.text) continue
        try {
            // 按字符串补齐 unicode 子集；这才是「画之前字体真的可用」的保证
            jobs.push(document.fonts.load(need.font, need.text))
        } catch {
            /* 单条字体简写不合法不该拖垮整次导出 */
        }
    }

    try {
        await Promise.race([
            Promise.allSettled(jobs),
            new Promise<void>((resolve) => {
                window.setTimeout(resolve, timeoutMs)
            }),
        ])
    } catch {
        /* 拿不到就用回退字体，不该阻断导出 */
    }
}
