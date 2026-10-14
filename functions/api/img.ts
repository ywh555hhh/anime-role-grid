/**
 * Bangumi 图片同源代理
 *
 * `GET /api/img?url=<encodeURIComponent(原始图片地址)>`
 *
 * 为什么需要它：
 * Bangumi 图床域名 `lain.bgm.tv` 在中国大陆会被 DNS 污染 + TLS SNI 阻断，
 * 浏览器直连必然失败。本接口由 Cloudflare 边缘出网回源，浏览器只需要能访问本站。
 *
 * 设计要点：
 * - **域名白名单**：只允许回源 Bangumi 的域名，避免本接口沦为任意 URL 的开放代理（SSRF）
 * - **边缘缓存**：图片内容不可变，缓存一年，回源次数接近 0
 * - **不发送 Referer**：Bangumi 图片无防盗链，也避免向第三方泄露本站地址
 * - **强制 https**：避免上游返回 http 造成混合内容
 * - **不返回 CORS 头**：本接口只服务同源页面，同源请求不需要也不应该开放跨域读取
 */

/** 允许回源的站域名后缀 */
const ALLOWED_SUFFIXES = ['bgm.tv', 'chii.in'] as const

/** 缓存时长（秒）：图片内容不可变，缓存一年 */
const CACHE_SECONDS = 31_536_000

/** 回源请求头 */
const UPSTREAM_UA = 'AnimeRoleGrid/1.0 (+https://oshigrid.me)'

/**
 * 回源超时（毫秒）。
 * 若上游长时间无响应（网络异常、被黑洞等），必须主动放弃，
 * 否则用户的 <img> 会一直挂着转圈，而不是快速显示为裂图。
 */
const UPSTREAM_TIMEOUT_MS = 20_000

/**
 * 判断主机名是否在允许回源的白名单内。
 * 这是本项目唯一的 SSRF 判定入口，parseTarget 与 fetch 前都会调用它。
 */
function isAllowedHost(hostname: string): boolean {
    const host = hostname.toLowerCase()
    return ALLOWED_SUFFIXES.some(
        (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    )
}

/**
 * 解析并校验目标地址。
 * @returns 合法则返回强制 https 后的 URL，否则返回 null
 */
function parseTarget(raw: string | null): URL | null {
    if (!raw) return null

    let target: URL
    try {
        target = new URL(raw)
    } catch {
        return null
    }

    if (target.protocol !== 'http:' && target.protocol !== 'https:') return null
    if (!isAllowedHost(target.hostname)) return null

    // 统一升级到 https，避免上游返回 http 资源造成混合内容
    target.protocol = 'https:'
    return target
}

function jsonError(
    status: number,
    error: string,
    extra?: Record<string, unknown>,
): Response {
    return new Response(JSON.stringify({ error, ...extra }), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    })
}

export const onRequestGet: PagesFunction = async (context) => {
    let requestUrl: URL
    try {
        requestUrl = new URL(context.request.url)
    } catch {
        return jsonError(400, 'Malformed request URL')
    }

    const target = parseTarget(requestUrl.searchParams.get('url'))
    if (!target) {
        return jsonError(400, 'Invalid or disallowed "url" parameter')
    }

    // SSRF 防护：目标地址只能来自上面的白名单校验结果。
    // 协议已被强制为 https，主机名必须命中 ALLOWED_SUFFIXES。
    // 这里在发起请求前再确认一次，保证 fetch 的目标永远是已校验的值。
    if (target.protocol !== 'https:' || !isAllowedHost(target.hostname)) {
        return jsonError(400, 'Disallowed upstream target')
    }
    const upstreamUrl = target.toString()

    const cache = caches.default
    // 用独立的内部域名做缓存键，与本站其它缓存隔离
    const cacheKey = new Request(
        `https://img-cache.internal/${encodeURIComponent(upstreamUrl)}`,
        { method: 'GET' },
    )

    const cached = await cache.match(cacheKey)
    if (cached) return cached

    let upstream: Response
    try {
        upstream = await fetch(upstreamUrl, {
            headers: {
                // 刻意不发送 Referer
                'User-Agent': UPSTREAM_UA,
                Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        })
    } catch (error) {
        const timedOut = error instanceof Error && error.name === 'TimeoutError'
        return jsonError(
            timedOut ? 504 : 502,
            timedOut ? 'Upstream timed out' : 'Upstream fetch failed',
            { detail: String(error) },
        )
    }

    if (!upstream.ok) {
        return jsonError(502, 'Upstream returned an error', {
            upstreamStatus: upstream.status,
        })
    }

    const headers = new Headers()
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'image/jpeg')

    const contentLength = upstream.headers.get('Content-Length')
    if (contentLength) headers.set('Content-Length', contentLength)

    headers.set('Cache-Control', `public, max-age=${CACHE_SECONDS}, immutable`)
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Image-Proxy', 'anime-role-grid')

    const response = new Response(upstream.body, { status: 200, headers })

    // 写入边缘缓存；失败也不影响本次响应
    const forCache = response.clone()
    context.waitUntil(cache.put(cacheKey, forCache).catch(() => undefined))

    return response
}
