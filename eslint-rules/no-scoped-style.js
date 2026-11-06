/**
 * 自定义 ESLint 规则：禁止在组件里写 `<style scoped>`
 * =======================================================
 *
 * 为什么不用现成规则
 * ------------------
 * eslint-plugin-vue 没有内置的 "no scoped style" 规则
 * （它只有 `vue/no-static-inline-styles`，那是管 `style="..."` 内联属性的，
 *  管的是另一回事）。所以这里手写一条。
 *
 * 为什么走 AST 而不是「扫源码文本」
 * ---------------------------------
 * 扫文本会被注释里的示例代码误伤 —— 比如有人写一句
 * 「以前这里用的是 `<style scoped>`」，规则就报了，纯粹噪音。
 *
 * vue-eslint-parser 提供了 `parserServices.getDocumentFragment()`，
 * 里面是 SFC 的文档树：`children` 里依次是 template / script / style 等顶层块，
 * 每个 style 块的 `startTag.attributes` 就是它的属性。
 * 走这条路：注释不是节点，不会误伤；位置也准。
 *
 * 规则来源
 * --------
 * .agent/rules/code.md 铁律三：
 *   「Atomic CSS or Nothing —— ❌ <style scoped> .my-box { … } </style>
 *     ✅ <div class="m-2 text-red">」
 * 以及「如果样式太长，必须在 uno.config.ts 中定义 shortcut，禁止在组件内写小作文」。
 *
 * 以前这条只写在文档里，没有工具 enforcement —— 于是仓库里躺着 10 个
 * 带 scoped CSS 的组件，其中两处动画定义完全重复。现在它能拦住了。
 */

/** 顶层块里，style 标签的属性里有没有 scoped */
function hasScopedAttribute(element) {
    const attributes = element.startTag?.attributes ?? [];
    return attributes.some((attr) => !attr.directive && attr.key?.name === "scoped");
}

export default {
    meta: {
        type: "problem",
        docs: {
            description: "禁止在 Vue 组件里使用 <style scoped>",
            recommended: true,
        },
        schema: [],
        messages: {
            noScopedStyle:
                "禁止在组件内写 <style scoped>。请改用 UnoCSS 原子类；" +
                "确实需要写 CSS 时，把规则放进 src/style.css（全局工具类）" +
                "或 uno.config.ts 的 shortcuts。",
        },
    },

    create(context) {
        return {
            Program() {
                const services = context.sourceCode.parserServices;
                const getDocumentFragment = services?.getDocumentFragment;
                if (typeof getDocumentFragment !== "function") return;

                const fragment = getDocumentFragment.call(services);
                const children = fragment?.children;
                if (!Array.isArray(children)) return;

                for (const child of children) {
                    if (child.type !== "VElement" || child.rawName !== "style") continue;
                    if (!hasScopedAttribute(child)) continue;

                    context.report({ node: child, messageId: "noScopedStyle" });
                }
            },
        };
    },
};
