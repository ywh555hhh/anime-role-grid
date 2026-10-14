/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '~': path.resolve(__dirname, './src'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        include: [
            'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            // functions/ 下的端点在 src/ 之外：它们依赖 @cloudflare/workers-types 的
            // 全局类型（PagesFunction），而 tsconfig.app.json 只声明了 vite/client，
            // 放进 src/ 会让 vue-tsc -b 构建失败。所以测试放在 tests/ 下。
            'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        ],
    },
})
