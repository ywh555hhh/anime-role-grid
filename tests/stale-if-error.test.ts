/**
 * 三个读取端点的「降级而非报错」行为验证（stale-if-error）
 *
 * 背景：线上曾出现 D1 免费额度被击穿、接口对用户返回 500 的情况。
 * 现在读取端在回源失败时会降级返回上一次成功的快照。这个文件专门守住这些分支。
 *
 * 为什么测试放在 tests/ 而不是 src/tests/：
 *   functions/ 下的模块用了 @cloudflare/workers-types 的全局类型（PagesFunction），
 *   而 tsconfig.app.json 只声明了 vite/client。把它 import 进 src/ 下的文件会让
 *   `vue-tsc -b` 因找不到 PagesFunction 而构建失败。放在 src/ 之外即可。
 *
 * 做法：桩掉 caches / waitUntil / D1，直接调用真实的 onRequestGet —— 跑的是生产代码本身。
 */
import { expect, it } from 'vitest'
import { onRequestGet as trendingHandler } from '../functions/api/trending'
import { onRequestGet as templatesHandler } from '../functions/api/trending-templates'
import { onRequestGet as statsHandler } from '../functions/api/stats/[templateId]'

// ---------------------------------------------------------------- 桩

interface StoredEntry {
    body: string
    status: number
    headers: Record<string, string>
}

class FakeCache {
    store = new Map<string, StoredEntry>()

    async match(req: Request): Promise<Response | undefined> {
        const hit = this.store.get(req.url)
        if (!hit) return undefined
        return new Response(hit.body, { status: hit.status, headers: hit.headers })
    }

    async put(req: Request, res: Response): Promise<void> {
        // 与真实 Cache API 一致的行为：只有成功响应才值得留存
        const body = await res.text()
        this.store.set(req.url, {
            body,
            status: res.status,
            headers: Object.fromEntries(res.headers),
        })
    }

    /** 测试辅助：把某个条目的取数时间往前推，制造「缓存已过期但内容还在」 */
    age(url: string, seconds: number): void {
        const entry = this.store.get(url)
        if (!entry) return
        entry.headers = {
            ...entry.headers,
            'x-snapshot-fetched-at': String(Math.floor(Date.now() / 1000) - seconds),
        }
    }

    /** 测试辅助：抹掉取数时间头，等价于「旧版本写下的缓存条目」 */
    stripFetchedAt(url: string): void {
        const entry = this.store.get(url)
        if (!entry) return
        const next = { ...entry.headers }
        delete next['x-snapshot-fetched-at']
        entry.headers = next
    }
}

const cache = new FakeCache()
// 注入全局 caches（Workers 运行时提供）
;(globalThis as unknown as { caches: unknown }).caches = { default: cache }

let pending: Promise<unknown>[] = []
const ctx = {
    waitUntil: (p: Promise<unknown>) => {
        pending.push(p)
    },
}
const flush = async () => {
    await Promise.all(pending)
    pending = []
}

// ---------------------------------------------------------------- 用例

const results: Array<{ name: string; pass: boolean; detail: string }> = []
function check(name: string, pass: boolean, detail: string) {
    results.push({ name, pass, detail })
}

/** 测试辅助：按子串找缓存键（不要用 keys()[0]，插入顺序不稳） */
function findKey(fragment: string): string {
    const hit = [...cache.store.keys()].find((k) => k.includes(fragment))
    if (!hit) throw new Error(`缓存里找不到包含 "${fragment}" 的键；现有: ${[...cache.store.keys()].join(', ')}`)
    return hit
}

/** 测试辅助：清空缓存（先等 pending 的 put 落盘，否则 clear 之后它们才写入） */
async function clearCache(): Promise<void> {
    await flush()
    cache.store.clear()
}

/** 造一个会抛错的 D1（模拟额度耗尽 / 故障） */
function failingDB(message = 'D1_ERROR: quota exceeded'): D1Database {
    return {
        prepare() {
            return {
                bind() {
                    return this
                },
                async first() {
                    throw new Error(message)
                },
                async all() {
                    throw new Error(message)
                },
                async run() {
                    throw new Error(message)
                },
            }
        },
    } as unknown as D1Database
}

/** 造一个正常的 D1（first/all 返回给定值） */
function stubDB(opts: { first?: unknown; all?: unknown }): D1Database {
    return {
        prepare() {
            return {
                bind() {
                    return this
                },
                async first() {
                    return opts.first ?? null
                },
                async all() {
                    return { results: opts.all ?? [] }
                },
                async run() {
                    return { success: true }
                },
            }
        },
    } as unknown as D1Database
}

function req(path: string): Request {
    return new Request(`https://oshigrid.me${path}`)
}

it('三个端点在 D1 回源失败时降级返回旧快照，而不是报错', async () => {
    // ===================== /api/trending =====================
    const snapshot24h = JSON.stringify([{ name: '夜神月', id: 2215, image: null, count: 9 }])
    const ctxTrending = (db: D1Database, path = '/api/trending?period=24h') => ({
        ...ctx,
        env: { DB: db },
        request: req(path),
        params: {},
    })

    // 1) 缓存空 + D1 抛错 → 503（不能 500，也不能崩）
    let res = await trendingHandler(ctxTrending(failingDB()) as never)
    check('trending: 无缓存 + D1 故障 → 503', res.status === 503, `status=${res.status}`)
    const b1 = await res.text()
    check('trending: 503 不泄露内部错误', !/quota|D1_ERROR|7500/i.test(b1), b1.slice(0, 80))

    // 2) 缓存空 + D1 正常 → 200 / MISS，并写入缓存
    res = await trendingHandler(ctxTrending(stubDB({ first: { data: snapshot24h, updated_at: 0 } })) as never)
    const b2 = await res.text()
    check(
        'trending: 无缓存 + D1 正常 → 200 MISS 且数据正确',
        res.status === 200 && res.headers.get('X-Trending-Cache') === 'MISS' && b2.includes('夜神月'),
        `status=${res.status} marker=${res.headers.get('X-Trending-Cache')}`,
    )
    await flush()
    check('trending: 成功后写入边缘缓存', cache.store.size === 1, `entries=${cache.store.size}`)

    // 3) ★ 关键：缓存已过期 + D1 故障 → 降级返回旧数据（stale-if-error）
    const key = findKey('trending-cache.internal/24h')
    cache.age(key, 99999)
    res = await trendingHandler(ctxTrending(failingDB()) as never)
    const b3 = await res.text()
    check(
        '★ trending: 缓存过期 + D1 故障 → 200 STALE-DB-ERROR（降级成功）',
        res.status === 200 && res.headers.get('X-Trending-Cache') === 'STALE-DB-ERROR' && b3.includes('夜神月'),
        `status=${res.status} marker=${res.headers.get('X-Trending-Cache')} body=${b3.slice(0, 60)}`,
    )

    // 4) 缓存新鲜 + D1 故障 → 直接命中缓存，根本不碰 D1
    res = await trendingHandler(ctxTrending(stubDB({ first: { data: snapshot24h, updated_at: 0 } })) as never)
    await flush()
    res = await trendingHandler(ctxTrending(failingDB()) as never)
    check(
        'trending: 缓存新鲜 + D1 故障 → 200 HIT（未触碰 D1）',
        res.status === 200 && res.headers.get('X-Trending-Cache') === 'HIT',
        `status=${res.status} marker=${res.headers.get('X-Trending-Cache')}`,
    )

    // 5) 旧版本写下的缓存条目（缺少取数时间头）→ 视为不新鲜，走 D1；故障时仍能降级
    cache.stripFetchedAt(key)
    res = await trendingHandler(ctxTrending(failingDB()) as never)
    check(
        'trending: 旧格式缓存条目 + D1 故障 → 仍能降级',
        res.status === 200 && res.headers.get('X-Trending-Cache') === 'STALE-DB-ERROR',
        `status=${res.status} marker=${res.headers.get('X-Trending-Cache')}`,
    )

    // 6) 快照缺失（D1 正常但没这行）→ 200 + 空列表，且不回落实时聚合
    res = await trendingHandler(ctxTrending(stubDB({ first: null }), '/api/trending?period=week') as never)
    const b6 = await res.text()
    check(
        'trending: 快照缺失 → 200 空列表（不击穿配额）',
        res.status === 200 && JSON.parse(b6).results.length === 0,
        `status=${res.status} body=${b6}`,
    )

    // 7) 非法 period 归一到 24h
    res = await trendingHandler(ctxTrending(stubDB({ first: { data: snapshot24h, updated_at: 0 } }), '/api/trending?period=BOGUS') as never)
    check('trending: 非法 period 归一为 24h', res.status === 200, `status=${res.status}`)

    // ===================== /api/trending-templates =====================
    await clearCache()
    const ctxTpl = (db: D1Database) => ({ ...ctx, env: { DB: db }, request: req('/api/trending-templates'), params: {} })

    res = await templatesHandler(ctxTpl(stubDB({ first: { data: JSON.stringify([{ id: 'classic', count: 35337 }]), updated_at: 0 } })) as never)
    check('templates: 正常 → 200 MISS', res.status === 200 && res.headers.get('X-Trending-Templates-Cache') === 'MISS', `status=${res.status}`)
    await flush()

    const tkey = findKey('trending-templates-cache.internal')
    cache.age(tkey, 99999)
    res = await templatesHandler(ctxTpl(failingDB()) as never)
    check(
        '★ templates: 缓存过期 + D1 故障 → 降级成功',
        res.status === 200 && res.headers.get('X-Trending-Templates-Cache') === 'STALE-DB-ERROR',
        `status=${res.status} marker=${res.headers.get('X-Trending-Templates-Cache')}`,
    )

    await clearCache()
    res = await templatesHandler(ctxTpl(failingDB()) as never)
    check('templates: 无缓存 + D1 故障 → 503', res.status === 503, `status=${res.status}`)

    // ===================== /api/stats/<id> =====================
    await clearCache()
    const statsBody = JSON.stringify({ slot0: [{ name: 'char1', id: 1, image: null, count: 3 }] })
    const ctxStats = (db: D1Database) => ({
        ...ctx,
        env: { DB: db },
        request: req('/api/stats/classic?period=all'),
        params: { templateId: 'classic' },
    })

    // 快照表里有新鲜数据 → ROW，不重算
    res = await statsHandler(ctxStats(stubDB({ first: { data: statsBody, updated_at: Math.floor(Date.now() / 1000) } })) as never)
    check(
        'stats: 快照新鲜 → 200 source=ROW',
        res.status === 200 && res.headers.get('X-Stats-Source') === 'ROW',
        `status=${res.status} source=${res.headers.get('X-Stats-Source')}`,
    )
    await flush()

    const skey = findKey('stats-cache.internal')
    cache.age(skey, 99999999)
    res = await statsHandler(ctxStats(failingDB()) as never)
    check(
        '★ stats: 缓存过期 + D1 故障 → 降级成功',
        res.status === 200 && res.headers.get('X-Stats-Cache') === 'STALE-DB-ERROR',
        `status=${res.status} marker=${res.headers.get('X-Stats-Cache')}`,
    )

    await clearCache()
    res = await statsHandler(ctxStats(failingDB()) as never)
    check('stats: 无缓存 + D1 故障 → 503', res.status === 503, `status=${res.status}`)

    // 快照过期 → 重算（updateStats），source=COMPUTED
    res = await statsHandler(
        ctxStats(stubDB({ first: { data: statsBody, updated_at: 0 }, all: [{ slot_label: 'slot0', character_name: 'c9', bangumi_id: 9, img_url: null, vote_count: 7 }] })) as never,
    )
    check(
        'stats: 快照过期 → 重算 source=COMPUTED',
        res.status === 200 && res.headers.get('X-Stats-Source') === 'COMPUTED',
        `status=${res.status} source=${res.headers.get('X-Stats-Source')}`,
    )

    // ---------------------------------------------------------------- 输出
    console.log('\n' + '='.repeat(78))
    console.log('stale-if-error 分支验证（真实模块 + 桩化的 caches/D1）')
    console.log('='.repeat(78))
    let failed = 0
    for (const r of results) {
        if (!r.pass) failed++
        console.log(`  ${r.pass ? '✅' : '❌'} ${r.name}`)
        if (!r.pass) console.log(`        ${r.detail}`)
    }
    console.log('='.repeat(78))
    console.log(failed === 0 ? `\n✅ 全部 ${results.length} 项通过` : `\n❌ ${failed}/${results.length} 项失败`)

    // 失败项汇总成一条断言，这样 vitest 会把所有问题一次性列出来
    expect(results.filter((r) => !r.pass)).toEqual([])
})
