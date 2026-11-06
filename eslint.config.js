import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import noScopedStyle from "./eslint-rules/no-scoped-style.js";
import globals from "globals";

/**
 * ESLint 扁平配置
 * ================
 *
 * ## 边界在哪
 * **格式**交给 Prettier（.prettierrc.json），**正确性**交给 ESLint。
 * 所以这里刻意只开 `flat/essential`（vue-plugin-vue 的正确性子集），
 * 不开 stylistic —— 否则两套工具会互相打架（"这个引号要不要换"）。
 *
 * ## 两条硬规则（以前只写在文档里，现在能被机器拦住）
 *
 * 1. `@typescript-eslint/no-explicit-any` = error
 *    对应 .agent/rules/code.md 铁律一「严禁 Any 类型」。
 *
 * 2. `local/no-scoped-style` = error
 *    对应铁律三「原子化样式：必须使用 UnoCSS，禁止在组件内写 scoped CSS」。
 *    以前仓库里躺着 10 个带 scoped CSS 的组件，其中两处动画定义完全重复，
 *    同样是只有文档、没有 enforcement。
 *
 * 两条规则的落地方式见 docs/RFCs/002-tooling-policy.md。
 */
export default tseslint.config(
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            ".wrangler/**",
            "workers/**/.wrangler/**",
            "src_legacy_backup/**",
            "legacy_html/**",
            "public/**",
        ],
    },

    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginVue.configs["flat/essential"],

    // --- 前端：浏览器环境 ---
    {
        files: ["src/**/*.{ts,vue}"],
        languageOptions: {
            globals: { ...globals.browser },
        },
    },

    // --- Vue SFC：用 vue-eslint-parser 解析 <script setup lang="ts"> ---
    {
        files: ["**/*.vue"],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: [".vue"],
                sourceType: "module",
            },
        },
    },

    // 仓库内自带的规则（插件对所有文件可见，规则只对 .vue 生效）
    {
        plugins: {
            local: { rules: { "no-scoped-style": noScopedStyle } },
        },
    },

    // --- Cloudflare Pages Functions / Workers：边缘运行时 ---
    {
        files: ["functions/**/*.ts", "workers/**/*.ts"],
        languageOptions: {
            globals: { ...globals.worker, ...globals.es2022 },
        },
    },

    // --- 脚本与测试：Node ---
    {
        files: ["scripts/**/*.ts", "tests/**/*.ts", "src/tests/**/*.ts"],
        languageOptions: {
            globals: { ...globals.node, ...globals.es2022 },
        },
    },

    // --- 规则 ---
    {
        files: ["**/*.{ts,vue}"],
        rules: {
            // 铁律一：严禁 Any
            "@typescript-eslint/no-explicit-any": "error",

            // 未使用变量：下划线前缀视为有意忽略
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "no-unused-vars": "off",

            // 空 catch 是刻意写法（降级兜底），允许
            "no-empty": ["error", { allowEmptyCatch: true }],

            // TS/Vue 里「未定义标识符」交给 tsc 判：它认识类型名
            // （RequestInit 之类），而 ESLint 的 no-undef 不认识，
            // 开着只会误报。typescript-eslint 官方也是这个建议。
            "no-undef": "off",

            // 组件名允许单字（如 App.vue）
            "vue/multi-word-component-names": "off",
        },
    },

    {
        // 铁律三：禁止组件内 scoped CSS
        files: ["**/*.vue"],
        rules: {
            "local/no-scoped-style": "error",
        },
    },

    {
        // 测试文件：允许更松的类型（mock 天然不精确）
        files: ["src/tests/**/*.{ts,vue}", "tests/**/*.{ts,vue}"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
        },
    },
);
