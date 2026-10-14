<script setup lang="ts">
/**
 * 网络自测页 /netcheck
 *
 * 目的：让用户（和开发者）一眼看清「图片为什么加载不出来」。
 *
 * 检测三条真实链路：
 *   1. 浏览器 → 本站（对照组）
 *   2. 本站服务端 → Cloudflare 边缘 → Bangumi 图床（修复后的图片链路 /api/img）
 *   3. 浏览器 → lain.bgm.tv 直连（修复前的旧链路，国内会被 DNS 污染 + TLS SNI 阻断）
 *
 * 通过对比 2 和 3 的成败，就能确定是「你的网络问题」还是「站点问题」。
 */
import { computed, onMounted, ref } from 'vue'
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
import { proxyImage } from '~/logic/imageUrl'

type Status = 'idle' | 'running' | 'pass' | 'warn' | 'fail'

interface CheckResult {
    id: string
    group: string
    title: string
    desc: string
    status: Status
    detail: string
    ms: number | null
    hint: string
}

interface EnvItem {
    label: string
    value: string
}

interface NetworkInformationLike {
    effectiveType?: string
    downlink?: number
    rtt?: number
    saveData?: boolean
}

/** 用于探测的已知可用 Bangumi 图片（初音ミク，Bangumi 角色 id 10452） */
const PROBE_IMAGE = 'https://lain.bgm.tv/pic/crt/l/00/71/10452_crt_UusO7.jpg'

/** 单项检测超时（毫秒） */
const TIMEOUT_MS = 10_000

const STATUS_META: Record<Status, { icon: string; label: string; iconClass: string; boxClass: string }> = {
    idle: { icon: 'i-carbon-time', label: '待检测', iconClass: 'text-gray-300', boxClass: 'border-gray-200' },
    running: { icon: 'i-carbon-circle-dash', label: '检测中', iconClass: 'text-primary animate-spin', boxClass: 'border-primary/40' },
    pass: { icon: 'i-carbon-checkmark', label: '正常', iconClass: 'text-green-500', boxClass: 'border-green-200' },
    warn: { icon: 'i-carbon-warning-alt', label: '注意', iconClass: 'text-amber-500', boxClass: 'border-amber-200' },
    fail: { icon: 'i-carbon-close', label: '失败', iconClass: 'text-red-500', boxClass: 'border-red-200' },
}

function createChecks(): CheckResult[] {
    const mk = (id: string, group: string, title: string, desc: string): CheckResult => ({
        id, group, title, desc, status: 'idle', detail: '', ms: null, hint: '',
    })
    return [
        mk('site', '本站链路', '本站首页可达', '对照项：能打开本页面就说明这条链路是通的'),
        mk('search', '本站链路', '搜索接口 /api/search', '由本站服务端转发到 api.bgm.tv'),
        mk('trending', '本站链路', '热榜接口 /api/trending', '读取本站 D1 数据库'),
        mk('imgproxy', '本站链路', '图片代理 /api/img', '由 Cloudflare 边缘回源 Bangumi 图床（当前的图片链路）'),
        mk('bgmnet', 'Bangumi 直连', 'lain.bgm.tv 网络可达', '浏览器直接连接 Bangumi 图床（旧的图片链路）'),
        mk('bgmimg', 'Bangumi 直连', 'lain.bgm.tv 图片可渲染', '实际用一张真实图片测试能否加载出来'),
    ]
}

const checks = ref<CheckResult[]>(createChecks())
const env = ref<EnvItem[]>([])
const running = ref(false)
const hasRun = ref(false)
const copied = ref(false)

const groups = computed(() => {
    const seen: string[] = []
    for (const c of checks.value) if (!seen.includes(c.group)) seen.push(c.group)
    return seen
})

function groupChecks(group: string): CheckResult[] {
    return checks.value.filter((c) => c.group === group)
}

function patch(id: string, partial: Partial<CheckResult>): void {
    const target = checks.value.find((c) => c.id === id)
    if (target) Object.assign(target, partial)
}

// ---------------------------------------------------------------- 工具函数

function truncate(text: string, max: number): string {
    const flat = (text || '').replace(/\s+/g, ' ').trim()
    return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function summarizeUA(ua: string): string {
    const browser = /Edg\//.test(ua) ? 'Edge'
        : /Firefox\//.test(ua) ? 'Firefox'
        : /Chrome\//.test(ua) ? 'Chrome'
        : /Safari\//.test(ua) ? 'Safari'
        : '未知浏览器'
    const os = /Windows NT/.test(ua) ? 'Windows'
        : /Android/.test(ua) ? 'Android'
        : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
        : /Mac OS X/.test(ua) ? 'macOS'
        : /Linux/.test(ua) ? 'Linux'
        : '未知系统'
    return `${browser} · ${os}`
}

function collectEnv(): void {
    const nav = navigator as Navigator & { connection?: NetworkInformationLike }
    const conn = nav.connection
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '未知'

    env.value = [
        { label: '在线状态', value: nav.onLine ? '在线' : '离线' },
        { label: '浏览器', value: summarizeUA(nav.userAgent) },
        { label: '语言', value: nav.language || '未知' },
        { label: '时区', value: zone },
        { label: '屏幕', value: `${screen.width}×${screen.height} @${window.devicePixelRatio}x` },
        {
            label: '网络类型',
            value: conn?.effectiveType
                ? `${conn.effectiveType}${conn.downlink ? ` · ${conn.downlink}Mbps` : ''}${conn.rtt ? ` · ${conn.rtt}ms` : ''}`
                : '浏览器未提供',
        },
        { label: '页面地址', value: window.location.host },
    ]
}

/** 带超时的 fetch，返回 null 表示网络层失败（DNS / 连接 / 中止） */
async function fetchWithTimeout(
    url: string,
    init: RequestInit = {},
    timeoutMs = TIMEOUT_MS,
): Promise<{ res: Response | null; ms: number; aborted: boolean }> {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), timeoutMs)
    const startedAt = performance.now()
    try {
        const res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
        return { res, ms: performance.now() - startedAt, aborted: false }
    } catch {
        return { res: null, ms: performance.now() - startedAt, aborted: controller.signal.aborted }
    } finally {
        window.clearTimeout(timer)
    }
}

/** 用 <img> 真实加载一张图片 */
function loadImageOnce(url: string, timeoutMs = TIMEOUT_MS): Promise<{ ok: boolean; ms: number; reason: 'loaded' | 'error' | 'timeout'; size: string }> {
    return new Promise((resolve) => {
        const img = new Image()
        const startedAt = performance.now()
        let settled = false

        const finish = (ok: boolean, reason: 'loaded' | 'error' | 'timeout') => {
            if (settled) return
            settled = true
            window.clearTimeout(timer)
            const size = img.naturalWidth ? `${img.naturalWidth}×${img.naturalHeight}` : ''
            resolve({ ok, ms: performance.now() - startedAt, reason, size })
        }

        const timer = window.setTimeout(() => finish(false, 'timeout'), timeoutMs)
        img.onload = () => finish(true, 'loaded')
        img.onerror = () => finish(false, 'error')
        img.referrerPolicy = 'no-referrer'
        img.src = url
    })
}

// ---------------------------------------------------------------- 各项检测

async function checkSite(): Promise<void> {
    patch('site', { status: 'running' })
    const startedAt = performance.now()
    const res = await fetchWithTimeout(`${window.location.origin}/?netcheck=${Date.now()}`, { method: 'GET' })
    const ms = res.res ? res.ms : performance.now() - startedAt

    if (!res.res) {
        patch('site', {
            status: 'fail', ms,
            detail: res.aborted ? '请求超时' : '无法访问本站首页',
            hint: '你既然能看到这一页，这一项不应该失败，请刷新重试',
        })
        return
    }

    const ray = res.res.headers.get('cf-ray') || ''
    const colo = ray.includes('-') ? (ray.split('-').pop() || '').toUpperCase() : ''
    const server = res.res.headers.get('server') || ''

    patch('site', {
        status: res.res.ok ? 'pass' : 'warn',
        ms,
        detail: [`HTTP ${res.res.status}`, server, colo ? `边缘节点 ${colo}` : ''].filter(Boolean).join(' · '),
        hint: colo ? `你的请求由 Cloudflare ${colo} 节点处理` : '',
    })
}

async function checkSearch(): Promise<void> {
    patch('search', { status: 'running' })
    const res = await fetchWithTimeout('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            keyword: '初音ミク',
            filter: { type: [1] },
            offset: 0,
            limit: 1,
            searchMode: 'character',
        }),
    })

    if (!res.res) {
        patch('search', {
            status: 'fail', ms: res.ms,
            detail: res.aborted ? '请求超时' : '请求失败',
            hint: '本站服务端到 Bangumi API 的转发可能异常',
        })
        return
    }

    const text = await res.res.text().catch(() => '')
    let count = -1
    try {
        const parsed = JSON.parse(text) as { data?: unknown[] }
        count = Array.isArray(parsed.data) ? parsed.data.length : -1
    } catch {
        count = -1
    }

    if (res.res.ok && count > 0) {
        patch('search', { status: 'pass', ms: res.ms, detail: `HTTP ${res.res.status} · 返回 ${count} 条结果`, hint: '服务端到 api.bgm.tv 的链路正常' })
    } else {
        patch('search', { status: 'fail', ms: res.ms, detail: `HTTP ${res.res.status} · ${truncate(text, 120)}`, hint: '搜索接口异常会导致搜不到角色' })
    }
}

async function checkTrending(): Promise<void> {
    patch('trending', { status: 'running' })
    const res = await fetchWithTimeout(`/api/trending?period=week&_netcheck=${Date.now()}`)

    if (!res.res) {
        patch('trending', {
            status: 'fail', ms: res.ms,
            detail: res.aborted ? '请求超时' : '请求失败',
            hint: '热榜接口异常会导致「全站热门」区域空白',
        })
        return
    }

    const text = await res.res.text().catch(() => '')

    if (res.res.ok) {
        let count = -1
        try {
            const parsed = JSON.parse(text) as { results?: unknown[] }
            count = Array.isArray(parsed.results) ? parsed.results.length : -1
        } catch {
            count = -1
        }
        patch('trending', { status: 'pass', ms: res.ms, detail: `HTTP ${res.res.status} · 返回 ${count} 条热榜数据`, hint: '' })
        return
    }

    if (/D1|row read limit|exceeded/i.test(text)) {
        patch('trending', {
            status: 'warn', ms: res.ms,
            detail: '本站数据库今日读取额度已用尽（免费额度 5,000,000 行/天，UTC 午夜重置，即北京时间 08:00）',
            hint: '这会让热榜与投票统计暂时不可用，与你的网络无关，也不是图片问题',
        })
        return
    }

    patch('trending', { status: 'fail', ms: res.ms, detail: `HTTP ${res.res.status} · ${truncate(text, 120)}`, hint: '' })
}

async function checkImageProxy(): Promise<void> {
    patch('imgproxy', { status: 'running' })
    const res = await fetchWithTimeout(proxyImage(PROBE_IMAGE))

    if (!res.res) {
        patch('imgproxy', {
            status: 'fail', ms: res.ms,
            detail: res.aborted ? '请求超时' : '请求失败',
            hint: '本站图片代理接口未响应',
        })
        return
    }

    if (!res.res.ok) {
        const text = await res.res.text().catch(() => '')
        patch('imgproxy', {
            status: 'fail', ms: res.ms,
            detail: `HTTP ${res.res.status} · ${truncate(text, 120)}`,
            hint: '图片代理接口返回错误，请把报告反馈给开发者',
        })
        return
    }

    const blob = await res.res.blob().catch(() => null)
    const size = blob ? blob.size : 0
    patch('imgproxy', {
        status: size > 0 ? 'pass' : 'warn',
        ms: res.ms,
        detail: `HTTP ${res.res.status} · ${res.res.headers.get('Content-Type') || '未知类型'} · ${formatBytes(size)}`,
        hint: size > 0 ? '本站已能通过 Cloudflare 边缘成功回源 Bangumi 图片' : '响应为空',
    })
}

async function checkBgmNetwork(): Promise<void> {
    patch('bgmnet', { status: 'running' })
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
    const startedAt = performance.now()

    try {
        // mode: 'no-cors' —— 只关心「能不能连上」，不关心响应内容。
        // 能 resolve 说明 DNS + TCP + TLS 都成功了；被拦截或解析到黑洞会抛 TypeError。
        await fetch(PROBE_IMAGE, { mode: 'no-cors', cache: 'no-store', signal: controller.signal })
        const ms = performance.now() - startedAt
        patch('bgmnet', {
            status: 'pass', ms,
            detail: `连接成功 · ${Math.round(ms)} ms`,
            hint: '你的网络可以直连 lain.bgm.tv',
        })
    } catch {
        const ms = performance.now() - startedAt
        const aborted = controller.signal.aborted
        patch('bgmnet', {
            status: 'fail', ms,
            detail: aborted ? `超时（> ${TIMEOUT_MS / 1000}s）` : `连接被拒绝或重置 · ${Math.round(ms)} ms`,
            hint: '这是 DNS 污染 / TLS SNI 阻断的典型表现，不是你的设备故障',
        })
    } finally {
        window.clearTimeout(timer)
    }
}

async function checkBgmImage(): Promise<void> {
    patch('bgmimg', { status: 'running' })
    const result = await loadImageOnce(PROBE_IMAGE)

    if (result.ok) {
        patch('bgmimg', {
            status: 'pass', ms: result.ms,
            detail: `渲染成功 · ${result.size} · ${Math.round(result.ms)} ms`,
            hint: '浏览器可以直连 Bangumi 图床并成功解码图片',
        })
        return
    }

    patch('bgmimg', {
        status: 'fail', ms: result.ms,
        detail: result.reason === 'timeout' ? '加载超时' : '加载失败（连接被中断或内容无法解码）',
        hint: '浏览器直连 Bangumi 图床失败 —— 这正是「图片裂开」的直接原因',
    })
}

const PIPELINE: Array<() => Promise<void>> = [
    checkSite, checkSearch, checkTrending, checkImageProxy, checkBgmNetwork, checkBgmImage,
]

async function runAll(): Promise<void> {
    if (running.value) return
    running.value = true
    hasRun.value = true
    copied.value = false
    checks.value = createChecks()
    collectEnv()

    for (const step of PIPELINE) {
        await step()
    }
    running.value = false
}

// ---------------------------------------------------------------- 结论

interface Verdict {
    tone: 'good' | 'warn' | 'bad'
    title: string
    body: string
}

const verdict = computed<Verdict | null>(() => {
    if (!hasRun.value || running.value) return null

    const proxy = checks.value.find((c) => c.id === 'imgproxy')
    const raw = checks.value.find((c) => c.id === 'bgmimg')
    const proxyOk = proxy?.status === 'pass'
    const rawOk = raw?.status === 'pass'

    if (proxyOk && !rawOk) {
        return {
            tone: 'good',
            title: '本站图片链路正常，你无需挂代理',
            body: '你的网络无法直连 Bangumi 图床（lain.bgm.tv），但本站已通过自己的域名代理图片。页面上的角色图片应该都能正常显示，包括导出功能。',
        }
    }
    if (proxyOk && rawOk) {
        return {
            tone: 'good',
            title: '两条链路都正常',
            body: '你的网络可以直连 Bangumi 图床，本站图片代理也正常。本站会统一走代理，因此不受直连链路的波动影响。',
        }
    }
    if (!proxyOk && !rawOk) {
        return {
            tone: 'bad',
            title: '两条链路都不通',
            body: '本站图片代理与 Bangumi 直连同时失败。先用下面的「复制报告」把结果发给开发者，同时在无痕窗口再试一次以排除浏览器扩展干扰。',
        }
    }
    return {
        tone: 'bad',
        title: '本站图片代理异常',
        body: '你的网络可以直连 Bangumi 图床，但本站的图片代理接口返回了错误。这通常是服务端问题，请复制报告发给开发者。',
    }
})

const VERDICT_STYLE: Record<Verdict['tone'], { box: string; title: string; icon: string }> = {
    good: { box: 'bg-green-50 border-green-200', title: 'text-green-700', icon: 'i-carbon-checkmark-filled text-green-600' },
    warn: { box: 'bg-amber-50 border-amber-200', title: 'text-amber-700', icon: 'i-carbon-warning-alt text-amber-600' },
    bad: { box: 'bg-red-50 border-red-200', title: 'text-red-700', icon: 'i-carbon-warning-filled text-red-600' },
}

// ---------------------------------------------------------------- 报告

function buildReport(): string {
    const lines: string[] = []
    lines.push('【我推的格子】网络自测报告')
    lines.push(`时间: ${new Date().toLocaleString()}`)
    lines.push(`页面: ${window.location.origin}/netcheck`)
    lines.push('')
    lines.push('--- 环境 ---')
    for (const item of env.value) lines.push(`${item.label}: ${item.value}`)
    lines.push('')
    lines.push('--- 检测结果 ---')
    for (const c of checks.value) {
        const ms = c.ms === null ? '' : ` (${Math.round(c.ms)}ms)`
        lines.push(`[${STATUS_META[c.status].label}] ${c.title}${ms}: ${c.detail}`)
    }
    lines.push('')
    if (verdict.value) lines.push(`结论: ${verdict.value.title} —— ${verdict.value.body}`)
    return lines.join('\n')
}

async function copyReport(): Promise<void> {
    const report = buildReport()
    try {
        await navigator.clipboard.writeText(report)
        copied.value = true
        window.setTimeout(() => { copied.value = false }, 2500)
    } catch {
        window.prompt('复制失败，请手动复制以下内容：', report)
    }
}

onMounted(() => {
    void runAll()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20">
    <Header />

    <main class="container mx-auto px-4 max-w-3xl flex flex-col gap-8">
      <!-- 标题 -->
      <div class="flex flex-col items-center gap-4 text-center">
        <h2
          class="text-2xl md:text-4xl font-bold tracking-widest"
          style="font-family: 'Noto Serif SC', serif;"
        >
          网络<span class="text-primary">自测</span>
        </h2>
        <div class="bg-primary rounded-full w-full max-w-xs h-[4px]" />
        <p class="text-xs md:text-sm text-gray-500 max-w-xl leading-relaxed">
          检测你的网络到本站与 Bangumi 图床的连通性，定位图片加载失败的真正原因。<br />
          全程只在本机发起请求，不上传任何个人数据。
        </p>
      </div>

      <!-- 操作 -->
      <div class="flex items-center justify-center gap-3 flex-wrap">
        <button class="btn-primary px-6 py-2.5 text-sm" :disabled="running" @click="runAll">
          <div :class="running ? 'i-carbon-circle-dash animate-spin' : 'i-carbon-flash'" />
          <span>{{ running ? '检测中…' : hasRun ? '重新检测' : '开始检测' }}</span>
        </button>
        <button v-if="hasRun && !running" class="btn-outline-primary px-5 py-2.5 text-sm" @click="copyReport">
          <div :class="copied ? 'i-carbon-checkmark' : 'i-carbon-copy'" />
          <span>{{ copied ? '已复制' : '复制报告' }}</span>
        </button>
      </div>

      <!-- 环境信息 -->
      <section
        v-if="env.length"
        class="bg-white rounded-xl border-2 border-black shadow-sm overflow-hidden"
      >
        <div class="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b-2 border-black">
          <div class="i-carbon-laptop text-primary" />
          <h3 class="font-bold text-sm tracking-wide">当前环境</h3>
        </div>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 p-4">
          <div v-for="item in env" :key="item.label" class="flex items-baseline justify-between gap-3 min-w-0">
            <dt class="text-xs text-gray-400 font-bold shrink-0">{{ item.label }}</dt>
            <dd class="text-xs font-bold text-gray-800 truncate" :title="item.value">{{ item.value }}</dd>
          </div>
        </dl>
      </section>

      <!-- 检测结果 -->
      <section v-for="group in groups" :key="group" class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <div
            class="w-1.5 h-4 rounded-full"
            :class="group === '本站链路' ? 'bg-primary' : 'bg-gray-300'"
          />
          <h3 class="font-bold text-sm tracking-widest" style="font-family: 'Noto Serif SC', serif;">
            {{ group }}
          </h3>
          <div class="flex-1 h-px bg-gray-200" />
        </div>

        <div
          v-for="c in groupChecks(group)"
          :key="c.id"
          class="bg-white rounded-xl border-2 shadow-sm px-4 py-3 transition-colors"
          :class="STATUS_META[c.status].boxClass"
        >
          <div class="flex items-start gap-3">
            <div
              class="mt-0.5 text-lg shrink-0"
              :class="[STATUS_META[c.status].icon, STATUS_META[c.status].iconClass]"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-sm">{{ c.title }}</span>
                <span
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  :class="{
                    'bg-gray-100 text-gray-400': c.status === 'idle',
                    'bg-pink-50 text-primary': c.status === 'running',
                    'bg-green-50 text-green-600': c.status === 'pass',
                    'bg-amber-50 text-amber-600': c.status === 'warn',
                    'bg-red-50 text-red-500': c.status === 'fail',
                  }"
                >{{ STATUS_META[c.status].label }}</span>
                <span v-if="c.ms !== null" class="text-[10px] font-mono text-gray-400">
                  {{ Math.round(c.ms) }} ms
                </span>
              </div>
              <p class="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{{ c.desc }}</p>
              <p v-if="c.detail" class="text-xs text-gray-700 font-medium mt-1.5 break-words leading-relaxed">
                {{ c.detail }}
              </p>
              <p v-if="c.hint" class="text-[11px] text-gray-500 mt-1 leading-relaxed flex items-start gap-1">
                <span class="i-carbon-information text-gray-300 shrink-0 mt-0.5" />
                <span>{{ c.hint }}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 结论 -->
      <section v-if="verdict" class="rounded-xl border-2 p-5" :class="VERDICT_STYLE[verdict.tone].box">
        <div class="flex items-start gap-3">
          <div class="text-2xl shrink-0" :class="VERDICT_STYLE[verdict.tone].icon" />
          <div class="flex-1">
            <h3 class="font-bold text-base mb-2 tracking-wide" :class="VERDICT_STYLE[verdict.tone].title">
              {{ verdict.title }}
            </h3>
            <p class="text-xs text-gray-600 leading-relaxed">{{ verdict.body }}</p>
          </div>
        </div>
      </section>

      <!-- 排查提示 -->
      <section class="bg-white rounded-xl border-2 border-gray-200 p-5">
        <div class="flex items-center gap-2 mb-3">
          <div class="i-carbon-tools text-gray-400" />
          <h3 class="font-bold text-sm tracking-wide">看不懂？常见的三种情况</h3>
        </div>
        <ul class="flex flex-col gap-3 text-xs text-gray-600 leading-relaxed">
          <li class="flex gap-2">
            <span class="text-primary font-bold shrink-0">1</span>
            <span>
              <b class="text-gray-800">「Bangumi 直连」失败、「图片代理」正常</b> ——
              最常见。你所在网络无法直连 Bangumi 图床，但本站已经代理好了，<b>图片能正常看，不需要挂代理</b>。
            </span>
          </li>
          <li class="flex gap-2">
            <span class="text-primary font-bold shrink-0">2</span>
            <span>
              <b class="text-gray-800">「热榜接口」显示「注意」</b> ——
              本站数据库的免费读取额度用完了，热榜和投票统计会暂时空白。<b>与你的网络、与图片都无关</b>，额度会在每天北京时间 08:00 重置。
            </span>
          </li>
          <li class="flex gap-2">
            <span class="text-primary font-bold shrink-0">3</span>
            <span>
              <b class="text-gray-800">全部失败</b> ——
              先关掉浏览器扩展（尤其是广告拦截、脚本拦截类）再用无痕窗口重试；仍有问题请「复制报告」发给开发者。
            </span>
          </li>
        </ul>
      </section>
    </main>

    <Footer />
  </div>
</template>
