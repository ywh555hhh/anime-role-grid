/**
 * 等待字体就绪（带超时）。
 *
 * ## 为什么需要它
 *
 * `index.html` 里的 `Noto Serif SC` 来自 `fonts.googleapis.com`，在国内会被墙。
 * 它原先是一个**渲染阻塞**的 `<link rel="stylesheet">` —— 一旦这个请求被黑洞
 * （DNS 污染返回假 IP、连接一直不响应），浏览器就**一直不渲染**，
 * 页面只剩一个空的 `<div id="app">`，用户看到的是**整页白屏**。
 *
 * 所以它改成了非阻塞加载（`media="print"` + `onload` 切回 `all`）。
 * 代价是首屏可能先用回退字体绘制。
 *
 * **导出图片不能接受这个代价**：字不一样，成品的观感就完全不同。
 * 所以导出前等一次 `document.fonts.ready`。
 *
 * ## 为什么必须带超时
 *
 * 字体被墙时 `ready` 可能迟迟不兑现。导出不能因此挂死 ——
 * 等不到就用当前可用字体照常导出，宁可字形略有差异，也不能让用户点了没反应。
 */

/** 等字体的上限。超过就放弃等待，用当前可用字体继续。 */
const FONT_WAIT_TIMEOUT_MS = 3000

export async function waitForFonts(timeoutMs: number = FONT_WAIT_TIMEOUT_MS): Promise<void> {
    if (typeof document === 'undefined' || !document.fonts?.ready) return

    try {
        await Promise.race([
            document.fonts.ready,
            new Promise<void>((resolve) => {
                window.setTimeout(resolve, timeoutMs)
            }),
        ])
    } catch {
        /* 拿不到就用回退字体，不该阻断导出 */
    }
}
