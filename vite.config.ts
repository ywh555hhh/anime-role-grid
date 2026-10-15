import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), UnoCSS()],
  resolve: {
    alias: {
      "~": resolve(__dirname, "src"),
    },
  },
  server: {
    // 开发期把 /api/* 转给生产环境。
    // 原因：Pages Functions 只在部署后可运行，本地 vite dev 没有它们；
    // 而直接跨域调用生产接口会因 /api/search 未处理 OPTIONS 预检而失败。
    // 经由本代理后，前端用相对路径 /api/search 调用时浏览器看来是同源请求。
    // 仅影响开发服务器，不进产物。
    proxy: {
      "/api": {
        target: "https://oshigrid.me",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  optimizeDeps: {
    include: [],
  },
});
