/**
 * 图片 URL 统一入口（Single Source of Truth）
 *
 * ## 背景
 * Bangumi 的图片域名 `lain.bgm.tv` 托管在 Cloudflare，但在中国大陆会同时遇到两道封锁：
 *   1. DNS 污染 —— 本地递归解析返回 Twitter / Facebook / Dropbox 段的伪 IP
 *   2. TLS SNI 阻断 —— 即使绕过 DNS，握手时声明 SNI=lain.bgm.tv 也会被 RST
 * 因此用户「不挂代理」时，浏览器直连该域名必然失败，图片全部裂开。
 *
 * ## 方案
 * 所有 Bangumi 图片统一改走本站同源代理 `/api/img`（Cloudflare Pages Function），
 * 由 Cloudflare 边缘出网回源。浏览器只需要能访问 oshigrid.me，无需任何代理配置。
 *
 * ## 额外收益
 * - 同源图片不会污染 canvas，导出不再依赖第三方 `wsrv.nl`，也不再需要 CORS 头
 * - 原图直出，不再是 `output=png` 那种 JPEG→PNG 的 8 倍体积膨胀
 * - 少一个第三方依赖和一次额外的 DNS/TLS 开销
 *
 * @see functions/api/img.ts  服务端实现
 */

/** 需要走代理的 Bangumi 图源域名后缀 */
const BANGUMI_HOST_SUFFIXES = ["bgm.tv", "chii.in"] as const;

/** 同源图片代理路径 */
export const IMAGE_PROXY_PATH = "/api/img";

function isBangumiHost(hostname: string): boolean {
   const host = hostname.toLowerCase();
   return BANGUMI_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
   );
}

/**
 * 判断某个地址是否需要走本站代理。
 *
 * 只代理 Bangumi 域名，其余一律放行，避免误伤：
 * - `data:` / `blob:` —— 用户上传的本地图片，永远直出
 * - `/xxx` / `//xxx` —— 站内资源
 * - 其他 CDN —— 不归我们管，保持原样
 */
export function needsProxy(url?: string | null): boolean {
   if (!url) return false;

   const raw = url.trim();
   if (!raw) return false;
   if (raw.startsWith("data:") || raw.startsWith("blob:")) return false;
   if (raw.startsWith(IMAGE_PROXY_PATH)) return false;
   if (raw.startsWith("/") || raw.startsWith("//")) return false;

   try {
      const parsed = new URL(raw);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
         return false;
      return isBangumiHost(parsed.hostname);
   } catch {
      return false;
   }
}

/**
 * 把图片地址转换成可以直接放进 `<img src>` / `new Image().src` / `ctx.drawImage()` 的最终地址。
 *
 * - Bangumi 域名 → 走同源代理
 * - 其他一切 → 原样返回
 */
export function proxyImage(url?: string | null): string {
   if (!url) return "";

   const raw = url.trim();
   if (!raw) return "";
   if (!needsProxy(raw)) return raw;

   return `${IMAGE_PROXY_PATH}?url=${encodeURIComponent(raw)}`;
}

/**
 * 按显示宽度派生 Bangumi 缩略图。
 *
 * Bangumi 的图床支持在路径前插入 `/r/{宽度}/` 取缩放版（实测有效）：
 *   `/r/100/` → 100px · `/r/200/` → 200px · `/r/400/` → 400px · 不加 → 原图
 *
 * 而它自带档位的**真实像素**（这就是「图片特别糊」的根因）：
 *   small  100×131 · grid **75×75 且是方形** · medium 400×526 · large 822×1080
 * 用 75px 的 grid 去填一张 235px 宽的卡片 = 放大 3.5 倍；
 * 而且方形图配 2:3 的容器还要再 `object-cover` 裁切一次，糊上加糊。
 *
 * 注意：`/r/{w}/` **不能**加在 `/g/` 路径上（实测 502），所以必须以 large 为源。
 * 非 Bangumi 图源（用户自行上传等）原样返回，不动它。
 */
export function bgmThumb(url: string, width: number): string {
   let parsed: URL;
   try {
      parsed = new URL(url);
   } catch {
      return url;
   }
   if (!isBangumiHost(parsed.hostname)) return url;
   // 去掉可能已有的 /r/{w}/ 前缀，避免叠加
   parsed.pathname = parsed.pathname.replace(/^\/r\/\d+\//, "/");
   parsed.pathname = `/r/${width}${parsed.pathname}`;
   return parsed.toString();
}
