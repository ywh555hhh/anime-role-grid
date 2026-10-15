<script setup lang="ts">
/**
 * /hangla 原型 v2 —— PROTOTYPE，验证完即删
 * ========================================
 *
 * 本版要验证的是**主操作模型**：
 *
 *   预览区（层级行）里每层末尾有一个「虚线 + 空位」
 *          ↓ 点它
 *   弹框打开，作用域 = 你刚点的那一层
 *          ↓
 *   搜索 + 筛选 + 排序 作品 → 多选 → 点「添加」
 *          ↓
 *   选中的物品直接落进那一层
 *
 * 为什么取代了 v1 的 A/B/C 托盘方案：
 *   v1 是「先选物品 → 再找放哪层」，中间有个托盘中间态；
 *   本模型把顺序倒过来 —— **目的地在点击的瞬间就确定了**，
 *   于是不需要托盘、不需要拖拽门槛、也不需要候选池。
 *
 * 仍然保留：
 *   - 层内/跨层拖动（长按拾起）—— 用于「排完之后微调」
 *   - 层级编辑（改名/改色/增删/上下移）、撤销重做
 *   - 品牌头 紧凑/完整 切换（PRD §7.2 的取舍）
 *
 * 刻意不做：导出图片、短链、落地页、做同款、账号。
 *
 * 数据来源：经 vite 的 dev proxy 调用 /api/search（服务端代理，带鉴权与缓存）。
 * 网络失败时回落到硬编码的 28 个真实角色，保证原型永远能用。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { PROTO_POOL } from '~/pages/hangla-proto-items'
import { bgmThumb, proxyImage } from '~/logic/imageUrl'
import { drawHanglaBoard } from '~/logic/hanglaDraw'
import {
    STORE_KEYS,
    createQueryCache,
    debounce,
    isBoolean,
    isNumber,
    isOptionalNumber,
    isOptionalString,
    isString,
    loadStored,
    removeStored,
    saveStored,
} from '~/logic/protoMemory'

// ---------------------------------------------------------------- 常量

/**
 * 用**相对路径**而不是写死生产域名：
 *   - 将来 /hangla 上线在 oshigrid.me 上时，同源调用本来就是这个路径
 *   - 本地开发时由 vite 的 dev proxy（见 vite.config.ts）转给生产，
 *     浏览器看来是同源请求 —— 既不触发 CORS 预检，也不需要 CORS 头
 */
const SEARCH_API = '/api/search'

/**
 * 图片一律走同源代理。缩略图派生统一由 imageUrl.ts 的 bgmThumb 负责。
 *
 * 这里必须是**相对路径**，不能写死 `https://oshigrid.me/api/img`：
 *   - 绝对地址在本地（localhost）和预览站上都变成跨域请求
 *   - 而 /api/img 刻意不返回 CORS 头（见 functions/api/img.ts 的设计说明）
 *   - 导出时 hanglaDraw 会设 crossOrigin='anonymous'，跨域且无 CORS → 图片加载失败
 *     → 画布上只剩透明占位图（<img> 看着正常，导出的图里却是空的）
 * 相对路径在两边都成立：本地由 vite 的 dev proxy 转发，线上本来同源。
 */
const imgSrc = (u: string, width?: number) => proxyImage(width ? bgmThumb(u, width) : u)

/** PRD §11.1 的默认层级配色 */
const DEFAULT_TIERS = [
    { name: '夯', color: '#e4007f' },
    { name: '顶级', color: '#ec4899' },
    { name: '人上人', color: '#f472b6' },
    { name: 'NPC', color: '#9ca3af' },
    { name: '拉完了', color: '#6b7280' },
]

const HISTORY_LIMIT = 20
/** 每页取多少条。上游对 limit 的上限是 20（实测 limit=25 只回 20 条）。 */
const PAGE_SIZE = 20

/** 可搜索的类型。type 数值是 Bangumi 的 subject type */
type Kind = 'character' | 'anime' | 'manga' | 'novel' | 'game' | 'music' | 'all'

const KIND_TABS: Array<{ key: Kind; label: string }> = [
    { key: 'anime', label: '动画' },
    { key: 'character', label: '角色' },
    { key: 'manga', label: '漫画' },
    { key: 'novel', label: '书籍' },
    { key: 'game', label: '游戏' },
    { key: 'music', label: '音乐' },
    { key: 'all', label: '全部作品' },
]

/** 类型 → Bangumi 请求参数 */
const KIND_QUERY: Record<Kind, { searchMode: 'character' | 'subject'; types: number[]; platformOnly?: string }> = {
    character: { searchMode: 'character', types: [1] },
    anime: { searchMode: 'subject', types: [2] },
    // 漫画与书籍在 Bangumi 里同属 type=1（书籍），靠 platform 区分
    manga: { searchMode: 'subject', types: [1], platformOnly: '漫画' },
    novel: { searchMode: 'subject', types: [1], platformOnly: '小说' },
    game: { searchMode: 'subject', types: [4] },
    music: { searchMode: 'subject', types: [3] },
    all: { searchMode: 'subject', types: [1, 2, 3, 4] },
}

/** 排序：match/score/heat 服务端支持（已实测）；collects 只能客户端排（角色没有 rating） */
type SortKey = 'match' | 'score' | 'heat' | 'collects'

const SORTS_BY_KIND: Record<'character' | 'subject', Array<{ key: SortKey; label: string }>> = {
    subject: [
        { key: 'match', label: '相关度' },
        { key: 'score', label: '评分' },
        { key: 'heat', label: '热度' },
    ],
    character: [
        { key: 'match', label: '相关度' },
        { key: 'collects', label: '收藏数' },
    ],
}

/** 年份筛选 → Bangumi 的 air_date 过滤器（已实测服务端生效） */
type YearKey = 'all' | '2020s' | '2010s' | '2000s' | 'older'

const YEAR_FILTERS: Array<{ key: YearKey; label: string; range?: string[] }> = [
    { key: 'all', label: '全部年份' },
    { key: '2020s', label: '2020后', range: ['>=2020-01-01'] },
    { key: '2010s', label: '2010s', range: ['>=2010-01-01', '<2020-01-01'] },
    { key: '2000s', label: '2000s', range: ['>=2000-01-01', '<2010-01-01'] },
    { key: 'older', label: '更早', range: ['<2000-01-01'] },
]

// ---------------------------------------------------------------- 类型

/** 榜上的一个物品。可选字段来自 Bangumi 返回，用于展示评分/年份，也用于排序 */
interface BoardItem {
    /**
     * 真正唯一的键。
     * Bangumi 的角色 id 与作品 id 是两个独立空间（实测角色返回 1 2 3 4 5…，
     * 作品返回 10380 328609 …），数值会撞。只用 id 做去重和 v-for key 会丢东西。
     */
    uid: string
    id: number
    name: string
    image: string
    score?: number
    date?: string
    platform?: string
    collects?: number
}

interface Tier {
    key: number
    name: string
    color: string
    items: BoardItem[]
}

let tierSeq = 0
const buildTiers = (): Tier[] =>
    DEFAULT_TIERS.map((t) => ({ key: ++tierSeq, name: t.name, color: t.color, items: [] }))

// ---------------------------------------------------------------- 记忆：形状校验
//
// localStorage 是**外部输入**：可能是旧版本写的，也可能被用户手改过。
// 所以每个字段都校验；不过就当「没记忆」→ 用默认层级，绝不能因为脏数据白屏。

function isBoardItemShape(v: unknown): v is BoardItem {
    if (typeof v !== 'object' || v === null) return false
    const r = v as Record<string, unknown>
    return (
        isString(r.uid) &&
        isNumber(r.id) &&
        isString(r.name) &&
        isString(r.image) &&
        isOptionalNumber(r.score) &&
        isOptionalString(r.date) &&
        isOptionalString(r.platform) &&
        isOptionalNumber(r.collects)
    )
}

function isTierShape(v: unknown): v is Tier {
    if (typeof v !== 'object' || v === null) return false
    const r = v as Record<string, unknown>
    return (
        isNumber(r.key) &&
        isString(r.name) &&
        isString(r.color) &&
        Array.isArray(r.items) &&
        r.items.every(isBoardItemShape)
    )
}

interface BoardState {
    tiers: Tier[]
    seq: number
}

function isBoardState(v: unknown): v is BoardState {
    if (typeof v !== 'object' || v === null) return false
    const r = v as Record<string, unknown>
    return isNumber(r.seq) && Array.isArray(r.tiers) && r.tiers.length > 0 && r.tiers.every(isTierShape)
}

interface Prefs {
    title: string
    author: string
    showNames: boolean
    showQr: boolean
    headerMode: 'full' | 'compact'
    kind: Kind
    keyword: string
    sort: SortKey
    yearKey: YearKey
}

function isPrefsShape(v: unknown): v is Prefs {
    if (typeof v !== 'object' || v === null) return false
    const r = v as Record<string, unknown>
    return (
        isString(r.title) &&
        isString(r.author) &&
        isBoolean(r.showNames) &&
        isBoolean(r.showQr) &&
        (r.headerMode === 'full' || r.headerMode === 'compact') &&
        KIND_TABS.some((t) => t.key === r.kind) &&
        isString(r.keyword) &&
        typeof r.sort === 'string' &&
        typeof r.yearKey === 'string'
    )
}

const prefs = loadStored<Prefs>(STORE_KEYS.prefs, isPrefsShape)

// ---------------------------------------------------------------- 榜状态

const restoredBoard = loadStored<BoardState>(STORE_KEYS.board, isBoardState)
if (restoredBoard) {
    // tierSeq 既要尊重存下的值，也不能低于已有的最大 key，否则新建层级会撞 key
    tierSeq = Math.max(restoredBoard.seq, 0, ...restoredBoard.tiers.map((t) => t.key))
}

const tiers = ref<Tier[]>(restoredBoard ? restoredBoard.tiers : buildTiers())
const editMode = ref(false)
const showState = ref(false)
const headerMode = ref<'full' | 'compact'>(prefs?.headerMode ?? 'compact')
const flashTier = ref<number | null>(null)

/**
 * 轻量提示。
 *
 * 刻意不用 window.alert：它会**阻塞整个页面**（连 CDP 的输入事件都发不进去），
 * 在手机上也很难看。toast 是非阻塞的，不影响接着操作。
 */
const toast = ref('')
let toastTimer: number | undefined
function showToast(msg: string, ms = 2600) {
    toast.value = msg
    if (toastTimer !== undefined) window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => (toast.value = ''), ms)
}

interface Snapshot { tiers: Tier[] }
const undoStack = ref<Snapshot[]>([])
const redoStack = ref<Snapshot[]>([])

const snapshot = (): Snapshot => ({ tiers: JSON.parse(JSON.stringify(tiers.value)) })
function pushHistory() {
    undoStack.value.push(snapshot())
    if (undoStack.value.length > HISTORY_LIMIT) undoStack.value.shift()
    redoStack.value = []
}
function undo() {
    const s = undoStack.value.pop()
    if (!s) return
    redoStack.value.push(snapshot())
    tiers.value = s.tiers
}
function redo() {
    const s = redoStack.value.pop()
    if (!s) return
    undoStack.value.push(snapshot())
    tiers.value = s.tiers
}
function resetAll() {
    undoStack.value = []; redoStack.value = []
    tiers.value = buildTiers()
    // 连记忆一起清：否则刷新一下旧榜又回来了，比不重置更困惑
    removeStored(STORE_KEYS.board)
}

// ---------------------------------------------------------------- 记忆：写回榜
//
// 去抖 300ms：拖拽会高频改数组，而 localStorage 是同步 IO，
// 每次 push 都写一遍会直接造成拖拽卡顿。
const persistBoard = debounce(
    () => saveStored(STORE_KEYS.board, { tiers: tiers.value, seq: tierSeq }),
    300,
)
watch(tiers, persistBoard, { deep: true })

// ---------------------------------------------------------------- 层级编辑

function renameTier(tier: Tier, name: string) { pushHistory(); tier.name = name }
function recolorTier(tier: Tier, color: string) { pushHistory(); tier.color = color }
function addTier() {
    pushHistory()
    tiers.value.push({ key: ++tierSeq, name: '新层级', color: '#a78bfa', items: [] })
}
function removeTier(tier: Tier) {
    pushHistory()
    tiers.value = tiers.value.filter((t) => t.key !== tier.key)
}
function moveTier(index: number, dir: -1 | 1) {
    const to = index + dir
    const arr = tiers.value
    const a = arr[index], b = arr[to]
    if (!a || !b) return
    pushHistory()
    arr[index] = b
    arr[to] = a
}
function removeItem(tier: Tier, uid: string) {
    pushHistory()
    tier.items = tier.items.filter((i) => i.uid !== uid)
}

/** 拖动开始前存快照（SortableJS 直接改数组，没有更早的钩子） */
function onDragStart() { pushHistory() }

// ---------------------------------------------------------------- 弹框与搜索

const dialogOpen = ref(false)
const dialogTierKey = ref<number | null>(null)
const dialogTier = computed(() => tiers.value.find((t) => t.key === dialogTierKey.value) ?? null)

const kind = ref<Kind>(prefs?.kind ?? 'anime')
const keyword = ref(prefs?.keyword ?? '')
const sort = ref<SortKey>(prefs?.sort ?? 'heat')
const yearKey = ref<YearKey>(prefs?.yearKey ?? 'all')
const rankedOnly = ref(false)
const platformFilter = ref('')          // 客户端过滤（Bangumi 的 filter 不支持 platform）

/**
 * 搜索结果缓存：按查询指纹索引，LRU + sessionStorage 镜像。
 *
 * 命中就瞬间出结果、不转圈；条目旧了仍然先给旧的，后台再换新。
 * limit 40 是有意的：一个用户实际会用的查询组合就那么多，多了只是白占内存。
 */
/**
 * 一页搜索结果。
 *
 * 带 total 才能**准确**判断「到底了」—— 上游确实会返回 total（实测 total=53），
 * 比「返回条数 < limit」这种猜法可靠得多。
 */
interface SearchPage {
    items: BoardItem[]
    total: number
}

const isSearchPage = (v: unknown): v is SearchPage => {
    if (typeof v !== 'object' || v === null) return false
    const r = v as Record<string, unknown>
    return isNumber(r.total) && Array.isArray(r.items) && r.items.every(isBoardItemShape)
}

/**
 * 搜索结果缓存：按「查询指纹 + 页码」索引，LRU + sessionStorage 镜像。
 *
 * 每页单独做键（而不是整个查询只存一条），这样翻回去过的页不用重新请求，
 * 命中粒度也更细。
 */
const searchCache = createQueryCache<SearchPage>({
    limit: 60,
    ttlMs: 10 * 60_000,
    mirrorKey: STORE_KEYS.searchCache,
    mirrorValidate: isSearchPage,
})
const revalidating = ref(false)
const cacheHits = ref(0)

// ---------------------------------------------------------------- 翻页状态

/**
 * 已经取回的原始条数（= 下一页的 offset）。
 *
 * 不能用 rawResults.length：跨页会按 uid 去重（上游分页确实会给重复项），
 * 用去重后的长度推进 offset 会卡在同一条上反复请求。
 */
const nextOffset = ref(0)
const totalCount = ref(0)
const loadingMore = ref(false)
const loadMoreError = ref('')
const scrollEl = ref<HTMLElement | null>(null)
const sentinelEl = ref<HTMLElement | null>(null)
let scrollObserver: IntersectionObserver | null = null

/**
 * 竞态守卫。
 *
 * 每次请求领一个序号；回来时序号对不上，说明用户已经改了条件 ——
 * 直接丢弃，否则旧请求会覆盖新结果（这个 bug 很难复现但一旦发生就很难解释）。
 */
let requestSeq = 0

/**
 * 无限滚动也不能真的无限。
 *
 * 空关键词的默认榜是「整个库按热度排」，总数能到四位数 ——
 * 一路滚下去既费流量、也没意义（人在几百条里根本挑不出东西）。
 * 停在一个合理位置、并**明确引导用关键词缩小范围**，比无限加载有用得多。
 */
const MAX_ITEMS = 200

/** 到底没有。用「已消费 < 总数」判断，并受上限约束 */
const hasMore = computed(
    () =>
        totalCount.value > 0 &&
        nextOffset.value > 0 &&
        nextOffset.value < totalCount.value &&
        nextOffset.value < MAX_ITEMS,
)

/** 是因为到了上限而停（而不是真的没有更多） */
const reachedCap = computed(
    () => nextOffset.value >= MAX_ITEMS && totalCount.value > nextOffset.value,
)

/** 网络返回的原始一批：只有它需要联网 */
const rawResults = ref<BoardItem[]>([])
/**
 * 真正展示的结果 = 原始结果 + 客户端过滤/排序。
 *
 * 做成 computed 之后，「平台」筛选和角色的「收藏数」排序都是**瞬间**生效，
 * 不再需要重新联网 —— 之前这两项是先改状态、但结果要等下一次 runSearch 才变，
 * 点了像没反应。
 */
const results = computed(() => {
    const q = KIND_QUERY[kind.value]
    let list = rawResults.value
    if (q.platformOnly) list = list.filter((i) => i.platform === q.platformOnly)
    if (platformFilter.value) list = list.filter((i) => i.platform === platformFilter.value)
    if (q.searchMode === 'character' && sort.value === 'collects') {
        list = [...list].sort((a, b) => (b.collects || 0) - (a.collects || 0))
    }
    return list
})

/**
 * 选中的是**物品本体**，而不是只存 id。
 *
 * 之前只存 id、添加时再回 results 里反查，于是「选中后一旦重新搜索」，
 * results 被整批替换 → 反查落空 → 物品被静默丢弃，而底部还显示「已选 N」。
 */
const selectedItems = ref<BoardItem[]>([])
const isSelected = (it: BoardItem) => selectedItems.value.some((s) => s.uid === it.uid)
const loading = ref(false)
const searchError = ref('')
const usedFallback = ref(false)

const availableSorts = computed(() => SORTS_BY_KIND[KIND_QUERY[kind.value].searchMode])
const isSubject = computed(() => KIND_QUERY[kind.value].searchMode === 'subject')

/** 结果里出现过的平台（用于生成平台筛选项，不必写死） */
const platformOptions = computed(() => {
    const set = new Set<string>()
    // 必须用 rawResults：用过滤后的 results 的话，
    // 一选中某个平台，其他平台选项就会消失，等于选不回来了
    for (const r of rawResults.value) if (r.platform) set.add(r.platform)
    // ★ 已选但当前这批结果里没有的平台也要列出来。
    // 否则换关键词后选项会变，而 platformFilter 仍在生效 ——
    // 结果为空却看不出原因，也没地方取消。
    if (platformFilter.value) set.add(platformFilter.value)
    return [...set].slice(0, 10)
})

// ---------------------------------------------------------------- 筛选（收进面板）

/** 筛选面板开关。排序/年份/名次/平台都收进去，不再固定占 4 行高 */
const filterSheetOpen = ref(false)

/** 生效中的筛选数量，显示在「筛选」按钮上 */
const activeFilterCount = computed(() => {
    let n = 0
    if (isSubject.value) {
        if (sort.value !== 'heat') n++
        if (yearKey.value !== 'all') n++
        if (rankedOnly.value) n++
    } else if (sort.value !== 'match') {
        n++
    }
    if (platformFilter.value) n++
    return n
})

/** 折叠时把生效的条件写出来，一眼知道自己在看哪个子集 */
const activeFilterSummary = computed(() => {
    const parts: string[] = []
    const sortLabel = availableSorts.value.find((s) => s.key === sort.value)?.label
    const sortIsDefault = isSubject.value ? sort.value === 'heat' : sort.value === 'match'
    if (sortLabel && !sortIsDefault) parts.push(sortLabel)
    if (isSubject.value && yearKey.value !== 'all') {
        parts.push(YEAR_FILTERS.find((y) => y.key === yearKey.value)?.label ?? '')
    }
    if (isSubject.value && rankedOnly.value) parts.push('只要有名次')
    if (platformFilter.value) parts.push(platformFilter.value)
    return parts.filter(Boolean).join(' · ')
})

/**
 * uid → 它现在在哪一层。
 * 用来在结果卡上直接标出「已经在榜上了」—— 之前完全看不出来，
 * 于是只能选完点添加、再被 toast 告知"已经在里了"，白操作一次。
 */
const placedByUid = computed(() => {
    const m = new Map<string, Tier>()
    for (const t of tiers.value) for (const it of t.items) m.set(it.uid, t)
    return m
})

function clearFilters() {
    const allowed = SORTS_BY_KIND[KIND_QUERY[kind.value].searchMode].map((s) => s.key)
    sort.value = allowed.includes('heat') ? 'heat' : allowed[0] ?? 'match'
    yearKey.value = 'all'
    rankedOnly.value = false
    platformFilter.value = ''
    void runSearch()
}

/**
 * 无限滚动。
 *
 * rootMargin 提前 600px（大约一屏）触发 —— 这就是「更智能」的地方：
 * 不是等用户滚到底才转圈，而是在还看不见的时候就把下一页取回来，滚起来是连续的。
 */
function setupInfiniteScroll() {
    scrollObserver?.disconnect()
    const root = scrollEl.value
    const target = sentinelEl.value
    if (!root || !target || typeof IntersectionObserver === 'undefined') return
    scrollObserver = new IntersectionObserver(
        (entries) => {
            if (entries.some((e) => e.isIntersecting)) void loadMore()
        },
        { root, rootMargin: '600px 0px', threshold: 0 },
    )
    scrollObserver.observe(target)
}

onUnmounted(() => {
    scrollObserver?.disconnect()
    scrollObserver = null
})

function openDialog(tierKey: number) {
    dialogTierKey.value = tierKey
    // 刻意不在里清空选择：误触关闭再打开不该丢掉已选的（用户反馈「没有记忆」）
    dialogOpen.value = true
    // 面板是 v-if 才渲染的，等它挂上再接管滚动
    void nextTick(() => {
        setupInfiniteScroll()
        void runSearch()
    })
}

function closeDialog() {
    // 也不重置 platformFilter：筛选项属于「记忆」的一部分，面板里看得到
    dialogOpen.value = false
    filterSheetOpen.value = false
    scrollObserver?.disconnect()
    scrollObserver = null
}

/** 切换类型时把排序收敛到该类型支持的范围 */
function setKind(k: Kind) {
    kind.value = k
    platformFilter.value = ''
    rankedOnly.value = false
    const allowed = SORTS_BY_KIND[KIND_QUERY[k].searchMode].map((s) => s.key)
    // 收敛到该类型**支持**的排序。之前固定回落到 'heat'，
    // 但角色只有 相关度/收藏数，'heat' 对角色不合法 →
    // 结果是一个 chip 都不高亮、而且查询参数也是错的。
    if (!allowed.includes(sort.value)) sort.value = allowed[0] ?? 'match'
    void runSearch()
}

/** Bangumi 搜索接口返回的最小字段集（只声明我们真正用到的，避免 any） */
interface RawBgmItem {
    id: number
    name?: string
    name_cn?: string
    date?: string | null
    platform?: string
    images?: Record<string, string>
    rating?: { score?: number }
    collection?: { wish?: number; collect?: number; doing?: number }
    stat?: { collects?: number }
}

/** 把 Bangumi 的返回映射成 BoardItem —— 字段名在实测中确认过 */
function toBoardItem(raw: RawBgmItem, isCharacter: boolean): BoardItem {
    const images = raw.images || {}
    const rating = raw.rating || {}
    const collection = raw.collection || {}
    const stat = raw.stat || {}
    return {
        uid: `${isCharacter ? 'c' : 's'}:${raw.id}`,
        id: raw.id,
        // 作品优先用中文名，角色用原名
        name: (isCharacter ? raw.name : raw.name_cn || raw.name) || raw.name || `#${raw.id}`,
        // 用 large 档位当源：grid 只有 75×75 且是方的，显示时必然糊
        image: images.large || images.medium || images.grid || images.common || '',
        score: typeof rating.score === 'number' && rating.score > 0 ? rating.score : undefined,
        date: raw.date || undefined,
        platform: raw.platform || undefined,
        collects: isCharacter
            ? typeof stat.collects === 'number'
                ? stat.collects
                : undefined
            : (collection.wish || 0) + (collection.collect || 0) + (collection.doing || 0),
    }
}

/**
 * 只有这些条件需要重新联网。
 * 平台过滤和角色排序是纯客户端的（见 results computed），故意不进来。
 */
function serverQueryKey(): string {
    const q = KIND_QUERY[kind.value]
    return JSON.stringify([
        q.searchMode,
        // types 必须进 key！各 tab 的服务端 filter 不一样（动画 [2]、游戏 [4]、全部 [1,2,3,4]…），
        // 漏掉它会让「动画 ↔ 漫画」命中同一份缓存，直接显示错的结果。
        q.types.join(','),
        keyword.value.trim(),
        q.searchMode === 'subject' ? sort.value : '',
        yearKey.value,
        rankedOnly.value,
    ])
}

/** 真正联网取一页，成功后写进缓存 */
async function fetchPage(cacheKey: string, offset: number): Promise<SearchPage> {
    const q = KIND_QUERY[kind.value]
    const isChar = q.searchMode === 'character'

    const filter: Record<string, unknown> = { type: q.types }
    const yearRange = YEAR_FILTERS.find((y) => y.key === yearKey.value)?.range
    if (yearRange && !isChar) filter.air_date = yearRange
    // rank 过滤只对 subject 有效（已实测：rank=[">0","<=500"] 生效）
    if (rankedOnly.value && !isChar) filter.rank = ['>0', '<=500']

    const body: Record<string, unknown> = {
        keyword: keyword.value.trim(),
        filter,
        offset,
        limit: PAGE_SIZE,
        searchMode: q.searchMode,
    }
    // 服务端 sort 只对 subject 生效；角色靠客户端按收藏数排
    if (!isChar && sort.value !== 'match' && sort.value !== 'collects') body.sort = sort.value

    const res = await fetch(SEARCH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { data?: RawBgmItem[]; total?: number }
    // 客户端过滤/排序都放在 results computed 里，这里只存原始结果
    const items = (data.data || []).map((raw) => toBoardItem(raw, isChar)).filter((i) => i.image)
    // total 缺失时用「offset + 本页条数」兜底 → hasMore 会自然变 false，不会无限请求
    const total = typeof data.total === 'number' ? data.total : offset + items.length
    const page: SearchPage = { items, total }
    searchCache.set(cacheKey, page)
    return page
}

/** 网络不可用时的本地回落，保证原型永远可测 */
function fallbackResults(): BoardItem[] {
    const kw = keyword.value.trim()
    return PROTO_POOL.filter((p) => !kw || p.name.includes(kw)).map((p) => ({
        uid: `c:${p.id}`,
        id: p.id,
        name: p.name,
        image: p.image,
    }))
}

/**
 * 把一页合并进结果。
 *
 * 跨页按 uid 去重 —— 上游分页确实会给出重复项（改过排序/筛选之后更容易出现）。
 */
function applyPage(page: SearchPage, offset: number, isReset: boolean) {
    if (isReset) {
        rawResults.value = page.items
        // 回到顶部：换了条件却还停在半中间最让人迷失
        if (scrollEl.value) scrollEl.value.scrollTop = 0
    } else {
        const seen = new Set(rawResults.value.map((i) => i.uid))
        rawResults.value = [...rawResults.value, ...page.items.filter((i) => !seen.has(i.uid))]
    }
    // 用「已消费的原始条数」推进 offset，而不是去重后的长度
    nextOffset.value = isReset ? page.items.length : offset + page.items.length
    totalCount.value = page.total
}

/**
 * 取一页。offset=0 表示重新开始（筛选/关键词变了），否则是接着往下加载。
 */
async function loadPage(offset: number, opts: { force?: boolean } = {}) {
    const baseKey = serverQueryKey()
    const cacheKey = `${baseKey}|${offset}`
    const isReset = offset === 0
    const seq = ++requestSeq

    // ---- 缓存命中：立刻出结果，绝不转圈 ----
    const hit = opts.force ? null : searchCache.get(cacheKey)
    if (hit) {
        cacheHits.value++
        applyPage(hit.value, offset, isReset)
        // 旧了就在后台悄悄换新，界面仍然是「秒开」
        if (!hit.fresh) void revalidatePage(cacheKey, baseKey, offset)
        return
    }

    if (isReset) {
        loading.value = true
        searchError.value = ''
        usedFallback.value = false
    } else {
        loadingMore.value = true
        loadMoreError.value = ''
    }

    try {
        const page = await fetchPage(cacheKey, offset)
        if (seq !== requestSeq) return
        applyPage(page, offset, isReset)
    } catch (e) {
        if (seq !== requestSeq) return
        if (isReset) {
            // 网络不可用时回落，保证原型永远可测
            usedFallback.value = true
            searchError.value = String(e)
            const items = fallbackResults()
            applyPage({ items, total: items.length }, offset, true)
        } else {
            // 加载更多失败**不能**破坏已经看到的结果，只在底部提示并可重试
            loadMoreError.value = String(e)
        }
    } finally {
        if (seq === requestSeq) {
            loading.value = false
            loadingMore.value = false
        }
    }
}

async function runSearch(opts: { force?: boolean } = {}) {
    await loadPage(0, opts)
}

/** 滚到底部附近自动加载下一页 */
async function loadMore() {
    if (loading.value || loadingMore.value || !hasMore.value) return
    await loadPage(nextOffset.value)
}

/**
 * 后台换新一页（stale-while-revalidate 里的 revalidate）。
 *
 * 三条约束：不转圈、不清空、失败静默。
 * 只在用户还停在这个查询上时才覆盖界面，否则会把用户已经切过去的那批结果冲掉。
 */
async function revalidatePage(cacheKey: string, baseKey: string, offset: number) {
    if (revalidating.value) return
    revalidating.value = true
    try {
        const fresh = await fetchPage(cacheKey, offset)
        if (serverQueryKey() === baseKey) applyPage(fresh, offset, offset === 0)
    } catch {
        /* 后台失败静默：界面上的旧数据继续用 */
    } finally {
        revalidating.value = false
    }
}

/**
 * 关键词即时搜（去抖 350ms）。
 *
 * 原来改关键词必须按「搜索」才生效，而改筛选是立即生效 ——
 * 同一区域里两种交互模式混着，用起来最恼人。现在统一成即时。
 */
watch(
    keyword,
    debounce(() => {
        void runSearch()
    }, 350),
)

function toggleSelect(it: BoardItem) {
    const i = selectedItems.value.findIndex((s) => s.uid === it.uid)
    if (i >= 0) selectedItems.value.splice(i, 1)
    else selectedItems.value.push(it)
}

/**
 * 添加：把**选中的物品本体**追加进目标层。
 *
 * 两条规则：
 *  1. 不再回 results 里反查 —— 之前是 `results.value.find(id)`，
 *     只要选中后重新搜过一次，results 被整批替换，反查就落空、
 *     物品被静默丢弃，而底部仍显示「已选 N」。现在选择本身就是完整数据。
 *  2. **一个物品只占一层**：如果它已经在别的层里，就**移过来**而不是复制一份。
 *     之前允许同一个作品同时出现在「夯」和「顶级」—— 对排行来说这是没有意义的，
 *     而且真到导出时会变成两格重复的图。
 */
function commitToTier() {
    const tier = dialogTier.value
    if (!tier || !selectedItems.value.length) return
    let added = 0
    let moved = 0
    let skipped = 0
    pushHistory()
    for (const item of selectedItems.value) {
        const from = tiers.value.find((t) => t.items.some((i) => i.uid === item.uid))
        if (from && from.key === tier.key) {
            skipped++
            continue
        }
        if (from) {
            from.items = from.items.filter((i) => i.uid !== item.uid)
            moved++
        } else {
            added++
        }
        tier.items.push({ ...item })
    }
    // 加完就清空选择：这批已经落层了，不该在下次打开时还勾着
    selectedItems.value = []
    flashTier.value = tier.key
    window.setTimeout(() => (flashTier.value = null), 300)
    if (navigator.vibrate) navigator.vibrate(10)
    closeDialog()
    // 结果说清楚，别让用户自己猜「点了 5 个怎么只多了 3 个」
    const parts: string[] = []
    if (added) parts.push(`新增 ${added} 个`)
    if (moved) parts.push(`移到本层 ${moved} 个`)
    if (skipped) parts.push(`已在「${tier.name}」跳过 ${skipped} 个`)
    showToast(`「${tier.name}」：${parts.join(' · ') || '没有变化'}`)
}

onMounted(() => {
    // 打开页面先把第一层的第一屏铺出来，便于直接体验
    void runSearch()
})

// ---------------------------------------------------------------- 导出

const DEFAULT_TITLE = '我的夯拉榜'
const boardTitle = ref(prefs?.title || DEFAULT_TITLE)
const boardAuthor = ref(prefs?.author ?? '')
const showItemNames = ref(prefs?.showNames ?? true)
const showQrCode = ref(prefs?.showQr ?? true)
const showExportOpts = ref(false)
const exporting = ref(false)
const exportedUrl = ref('')

/** 折叠状态下的设置摘要：不展开也知道会导出成什么样 */
const exportSummary = computed(() =>
    [
        boardAuthor.value.trim() || '未填排表人',
        showItemNames.value ? '显示名字' : '不显示名字',
        showQrCode.value ? '有二维码' : '无二维码',
    ].join(' · '),
)

async function exportBoard() {
    if (exporting.value) return
    exporting.value = true
    try {
        exportedUrl.value = await drawHanglaBoard({
            tiers: tiers.value.map((t) => ({ name: t.name, color: t.color, items: t.items })),
            title: boardTitle.value.trim() || DEFAULT_TITLE,
            author: boardAuthor.value,
            showNames: showItemNames.value,
            showQr: showQrCode.value,
            // 原型阶段还没有短链，二维码先指向 /hangla；
            // 正式版应指向该榜的短链（/h/:id），因为微信/QQ 里链接可能被拦、图片能过。
            qrUrl: `${window.location.origin}/hangla`,
        })
    } catch (e) {
        console.error('[hangla] 导出失败', e)
        showToast(`导出失败：${String(e)}`, 4000)
    } finally {
        exporting.value = false
    }
}

// ---------------------------------------------------------------- 记忆：写回偏好

const persistPrefs = debounce(
    () =>
        saveStored(STORE_KEYS.prefs, {
            title: boardTitle.value,
            author: boardAuthor.value,
            showNames: showItemNames.value,
            showQr: showQrCode.value,
            headerMode: headerMode.value,
            kind: kind.value,
            keyword: keyword.value,
            sort: sort.value,
            yearKey: yearKey.value,
        }),
    200,
)
watch(
    [boardTitle, boardAuthor, showItemNames, showQrCode, headerMode, kind, keyword, sort, yearKey],
    persistPrefs,
)

/** 真的清掉全部记忆：调试和「我不想它记得」时有用 */
function forgetEverything() {
    removeStored(STORE_KEYS.board)
    removeStored(STORE_KEYS.prefs)
    searchCache.clear()
    undoStack.value = []
    redoStack.value = []
    tiers.value = buildTiers()
}

// ---------------------------------------------------------------- 状态面板

const stateSummary = computed(() => ({
    tiers: tiers.value.map((t) => `${t.name}[${t.items.length}]`).join(' '),
    total: tiers.value.reduce((s, t) => s + t.items.length, 0),
    history: `可撤销 ${undoStack.value.length} / 可重做 ${redoStack.value.length}`,
    search: `${kind.value} kw="${keyword.value}" sort=${sort.value} year=${yearKey.value} → ${results.value.length} 条${usedFallback.value ? ' (离线回落)' : ''}`,
    cache: `已记住 ${searchCache.size} 条查询 · 内存命中 ${cacheHits.value} 次${revalidating.value ? ' · 后台换新中' : ''}`,
}))
</script>

<template>
  <div class="h-[100dvh] flex flex-col bg-gray-50 text-gray-900 overflow-hidden select-none">

    <!-- ===== PART 1 · 品牌主视图 ===== -->
    <header class="shrink-0 bg-white border-b border-gray-100 px-3" :class="headerMode === 'full' ? 'pt-5 pb-3' : 'py-2'">
      <div v-if="headerMode === 'full'" class="flex flex-col items-center gap-2">
        <img src="/logo.png" alt="我推的格子" class="w-14 h-14 object-contain" />
        <h1 class="font-bold tracking-widest text-2xl" style="font-family: 'Noto Serif SC', serif;">
          【我推<span class="text-primary">的</span>格子】
        </h1>
        <div class="bg-primary rounded-full w-full max-w-xs h-[3px]" />
        <p class="text-[11px] text-gray-400 tracking-wider">从夯到拉的排序头脑战</p>
      </div>
      <div v-else class="flex items-center gap-2">
        <img src="/logo.png" alt="我推的格子" class="w-7 h-7 object-contain" />
        <div class="min-w-0">
          <div class="font-bold tracking-widest text-sm leading-tight" style="font-family: 'Noto Serif SC', serif;">
            【我推<span class="text-primary">的</span>格子】
          </div>
          <div class="text-[10px] text-gray-400 tracking-wide leading-tight truncate">从夯到拉的排序头脑战</div>
        </div>
      </div>
    </header>

    <!-- ===== PART 2 · 预览区 = 操作区（层级行） ===== -->
    <main class="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2" style="overscroll-behavior: none;">
      <div
        v-for="(tier, ti) in tiers"
        :key="tier.key"
        class="flex rounded-lg overflow-hidden border border-gray-200 bg-white"
        :class="flashTier === tier.key ? 'ring-4 ring-primary/40 shadow-lg' : ''"
        style="min-height: 64px;"
      >
        <!-- 层级色块 + 名称 -->
        <div class="w-[76px] shrink-0 flex flex-col items-center justify-center text-white px-1" :style="{ backgroundColor: tier.color }">
          <input
            v-if="editMode"
            :value="tier.name"
            class="w-full bg-white/25 rounded text-center text-xs font-bold outline-none"
            @change="renameTier(tier, ($event.target as HTMLInputElement).value)"
          />
          <span v-else class="text-sm font-black tracking-wide text-center leading-tight">{{ tier.name }}</span>
          <span class="text-[10px] opacity-90 mt-0.5">{{ tier.items.length }}</span>
        </div>

        <!-- 已有的物品 + 末尾的「虚线 + 空位」 -->
        <VueDraggable
          v-model="tier.items"
          :group="{ name: 'hangla', pull: true, put: true }"
          :animation="150"
          :delay="250"
          :delay-on-touch-only="true"
          :force-fallback="true"
          :fallback-on-body="true"
          class="flex-1 min-w-0 flex items-center gap-1 px-1.5 py-1.5 overflow-x-auto overflow-y-hidden"
          style="overscroll-behavior: contain; min-height: 48px;"
          @start="onDragStart"
        >
          <div v-for="it in tier.items" :key="it.uid" class="shrink-0 relative">
            <img
              :src="imgSrc(it.image, 200)"
              class="w-12 h-12 rounded object-cover object-top border border-gray-200 pointer-events-none"
              :title="it.name"
              loading="lazy"
              draggable="false"
            />
            <button
              v-if="editMode"
              class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] leading-none"
              @click.stop="removeItem(tier, it.uid)"
            >✕</button>
          </div>

          <!-- ★ 主操作入口：虚线加号 -->
          <button
            class="shrink-0 w-12 h-12 rounded border-2 border-dashed flex flex-col items-center justify-center transition-colors"
            :class="editMode ? 'border-gray-200 text-gray-300' : 'border-gray-400 text-gray-500 active:bg-pink-50 active:border-primary active:text-primary'"
            @click.stop="openDialog(tier.key)"
          >
            <span class="text-lg leading-none font-bold">＋</span>
            <span class="text-[8px] leading-none mt-0.5">添加</span>
          </button>
        </VueDraggable>

        <!-- 编辑控件 -->
        <div v-if="editMode" class="shrink-0 flex flex-col justify-center gap-0.5 pr-1">
          <input
            type="color"
            :value="tier.color"
            class="w-6 h-5 p-0 border-0 bg-transparent"
            @input="recolorTier(tier, ($event.target as HTMLInputElement).value)"
          />
          <div class="flex gap-0.5">
            <button class="text-[10px] px-1 bg-gray-100 rounded" @click="moveTier(ti, -1)">▲</button>
            <button class="text-[10px] px-1 bg-gray-100 rounded" @click="moveTier(ti, 1)">▼</button>
            <button class="text-[10px] px-1 bg-red-50 text-red-500 rounded" @click="removeTier(tier)">✕</button>
          </div>
        </div>
      </div>

      <button v-if="editMode" class="text-xs font-bold text-gray-500 border border-dashed border-gray-300 rounded-lg py-2" @click="addTier">
        ＋ 加一层
      </button>

      <div v-if="showState" class="p-2 rounded-lg bg-gray-900 text-gray-100 text-[10px] font-mono leading-relaxed">
        <div>tiers: {{ stateSummary.tiers }}</div>
        <div>total: {{ stateSummary.total }} &nbsp; {{ stateSummary.history }}</div>
        <div>search: {{ stateSummary.search }}</div>
        <div>cache: {{ stateSummary.cache }}</div>
        <button class="mt-1.5 px-2 py-1 rounded bg-gray-700 text-gray-100" @click="forgetEverything">
          忘掉全部记忆（清榜 + 清设置 + 清缓存）
        </button>
      </div>
    </main>

    <!-- ===== PART 3 · 按钮区（导出是第一大按钮，PRD §3） ===== -->
    <div class="shrink-0 bg-white border-t border-gray-200 px-2 pt-1.5 pb-1.5 flex flex-col gap-1.5">
      <!-- 导出设置：折叠时只占一行，并直接把当前的导出效果写在摘要里 -->
      <button
        class="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-left"
        @click="showExportOpts = !showExportOpts"
      >
        <span class="i-carbon-settings text-gray-500 shrink-0" />
        <span class="text-[11px] text-gray-600 truncate flex-1">
          {{ boardTitle || DEFAULT_TITLE }}<span class="text-gray-400"> · {{ exportSummary }}</span>
        </span>
        <span
          class="shrink-0 text-gray-400"
          :class="showExportOpts ? 'i-carbon-chevron-up' : 'i-carbon-chevron-down'"
        />
      </button>

      <div v-if="showExportOpts" class="flex flex-col gap-1.5 p-2 rounded-lg bg-gray-50 border border-gray-200">
        <input
          v-model="boardTitle"
          class="w-full px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-xs text-black outline-none focus:border-primary transition-colors"
          placeholder="榜单标题"
          type="text"
        />
        <input
          v-model="boardAuthor"
          class="w-full px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-xs text-black outline-none focus:border-primary transition-colors"
          placeholder="排表人（留空则不显示）"
          type="text"
        />
        <div class="flex items-center gap-1.5">
          <button
            class="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-md border bg-white"
            :class="showItemNames ? 'border-primary text-primary' : 'border-gray-300 text-gray-500'"
            @click="showItemNames = !showItemNames"
          >
            <span :class="showItemNames ? 'i-carbon-checkbox-checked' : 'i-carbon-checkbox'" />
            显示名字
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-md border bg-white"
            :class="showQrCode ? 'border-primary text-primary' : 'border-gray-300 text-gray-500'"
            @click="showQrCode = !showQrCode"
          >
            <span :class="showQrCode ? 'i-carbon-checkbox-checked' : 'i-carbon-checkbox'" />
            二维码
          </button>
        </div>
      </div>

      <button class="btn-primary w-full py-2.5 text-sm" :disabled="exporting" @click="exportBoard">
        <span :class="exporting ? 'i-carbon-circle-dash animate-spin' : 'i-carbon-download'" />
        {{ exporting ? '正在合成图片…' : '导出图片' }}
      </button>
      <div class="flex items-center gap-1.5">
        <button class="btn-outline-gray text-xs px-2 py-1.5" :class="editMode ? 'ring-2 ring-primary' : ''" @click="editMode = !editMode">层级编辑</button>
        <button class="btn-outline-gray text-xs px-2 py-1.5" :class="!undoStack.length ? 'opacity-40' : ''" @click="undo">撤销{{ undoStack.length ? ` ${undoStack.length}` : '' }}</button>
        <button class="btn-outline-gray text-xs px-2 py-1.5" :class="!redoStack.length ? 'opacity-40' : ''" @click="redo">重做{{ redoStack.length ? ` ${redoStack.length}` : '' }}</button>
        <button class="btn-outline-gray text-xs px-2 py-1.5" @click="resetAll">重置</button>
        <button class="btn-outline-gray text-xs px-2 py-1.5 ml-auto" @click="showState = !showState">{{ showState ? '藏状态' : '看状态' }}</button>
      </div>
    </div>

    <!-- ===== PART 4 · 原型提示条 ===== -->
    <div class="shrink-0 bg-gray-900 px-2 py-1.5">
      <div class="flex items-center gap-2">
        <p class="text-[10px] text-gray-300 leading-tight flex-1">
          点任意层里的 <span class="text-primary font-bold">虚线 ＋</span> → 弹框搜索/筛选/排序 → 多选 → 「添加」
        </p>
        <button class="text-[10px] font-bold rounded px-2 py-1 bg-white/10 text-gray-300 shrink-0" @click="headerMode = headerMode === 'full' ? 'compact' : 'full'">
          头部:{{ headerMode === 'full' ? '完整' : '紧凑' }}
        </button>
      </div>
    </div>

    <!-- ===== 轻提示（非阻塞） ===== -->
    <div
      v-if="toast"
      class="fixed left-1/2 -translate-x-1/2 bottom-32 z-[70] px-3 py-2 rounded-lg bg-gray-900/90 text-white text-xs shadow-lg pointer-events-none max-w-[86vw] text-center"
    >
      {{ toast }}
    </div>

    <!-- ===== 导出结果 ===== -->
    <Teleport to="body">
      <div v-if="exportedUrl" class="fixed inset-0 z-[60] bg-black/85 flex flex-col" @click="exportedUrl = ''">
        <div class="flex-1 min-h-0 overflow-auto p-3 flex items-start justify-center" @click.stop>
          <img :src="exportedUrl" class="max-w-full h-auto rounded shadow-2xl bg-white" />
        </div>
        <div class="shrink-0 bg-black/90 px-3 py-3 flex items-center gap-2" @click.stop>
          <p class="text-[11px] text-gray-300 flex-1 leading-tight">
            iOS 上<b class="text-white">长按图片</b>保存到相册；桌面端可右键另存。
          </p>
          <a :href="exportedUrl" download="hangla.png" class="btn-primary px-3 py-2 text-xs">下载</a>
          <button class="text-gray-300 text-xs px-2 py-2" @click="exportedUrl = ''">关闭</button>
        </div>
      </div>
    </Teleport>

    <!-- ===== 弹框：搜索 / 筛选 / 排序 → 添加 ===== -->
    <Teleport to="body">
      <div v-if="dialogOpen" class="fixed inset-0 z-50 flex flex-col bg-gray-50">
        <!-- 顶栏 -->
        <div class="shrink-0 bg-white px-3 pt-2 flex items-center gap-2">
          <span class="text-sm font-black">加进榜里</span>
          <button class="ml-auto text-gray-400 text-xl leading-none px-1" @click="closeDialog">×</button>
        </div>

        <!--
          目标层：可以直接在这里切换。
          之前要换层必须关掉弹框 → 点另一层的虚线＋ → 再搜一遍，
          同一个词要搜两次才能放进两层 —— 这是「操作逻辑不对」最直观的地方。
        -->
        <div class="shrink-0 bg-white px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto border-b border-gray-100">
          <span class="text-[10px] text-gray-400 shrink-0">加到</span>
          <button
            v-for="t in tiers"
            :key="t.key"
            class="shrink-0 text-[11px] font-bold rounded-full px-2.5 py-1 border"
            :class="dialogTierKey === t.key ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 bg-gray-50'"
            :style="dialogTierKey === t.key ? { backgroundColor: t.color } : undefined"
            @click="dialogTierKey = t.key"
          >{{ t.name }}</button>
        </div>

        <!-- 类型 tab -->
        <div class="shrink-0 bg-white px-2 py-1.5 flex gap-1.5 overflow-x-auto border-b border-gray-100">
          <button
            v-for="t in KIND_TABS"
            :key="t.key"
            class="shrink-0 text-xs font-bold rounded-full px-3 py-1.5"
            :class="kind === t.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'"
            @click="setKind(t.key)"
          >{{ t.label }}</button>
        </div>

        <!-- 搜索 + 筛选入口（筛选条件收进面板，结果区不再被压掉一半） -->
        <div class="shrink-0 bg-white px-2 py-2 flex flex-col gap-1.5 border-b border-gray-100">
          <div class="flex gap-1.5">
            <input
              v-model="keyword"
              class="input-std flex-1 py-2"
              :placeholder="isSubject ? '搜作品名（留空＝直接看榜）' : '搜角色名'"
              @keyup.enter="runSearch({ force: true })"
            />
            <button class="btn-primary text-xs px-3" @click="runSearch({ force: true })">搜索</button>
          </div>

          <div class="flex items-center gap-1.5 min-w-0">
            <button
              class="shrink-0 flex items-center gap-1 text-[11px] font-bold rounded px-2.5 py-1 border"
              :class="activeFilterCount ? 'border-primary text-primary bg-white' : 'border-gray-200 text-gray-600 bg-gray-50'"
              @click="filterSheetOpen = true"
            ><span class="i-carbon-filter" />筛选<span v-if="activeFilterCount">（{{ activeFilterCount }}）</span></button>
            <span class="text-[11px] text-gray-400 truncate">{{ activeFilterSummary || '未加筛选' }}</span>
            <button
              v-if="activeFilterCount"
              class="ml-auto shrink-0 text-[11px] text-gray-400 underline"
              @click="clearFilters"
            >清空</button>
          </div>
        </div>

        <!-- 结果网格（多选） -->
        <!--
          取数走 /api/search。注：limit/offset 原先在服务端被完全忽略（恒 10 条、恒第 0 页），
          已在分支 fix/search-pagination 修好并在预览验证通过；
          在它合入生产之前，本地这里仍只会显示 10 条。
          picker 目前只取第一页，翻页留给正式实现。
        -->
        <div ref="scrollEl" class="flex-1 min-h-0 overflow-y-auto p-2">
          <div v-if="!loading && rawResults.length" class="text-[10px] text-gray-400 pb-1.5">
            已加载 {{ rawResults.length }} 条<span v-if="totalCount"> / 共 {{ totalCount }} 条</span>
            <span v-if="rawResults.length !== results.length" class="text-gray-300">
              （筛选后显示 {{ results.length }} 条）
            </span>
          </div>
          <div v-if="loading" class="text-center py-10 text-sm text-gray-400">搜索中…</div>
          <div v-else-if="!results.length" class="text-center py-10 text-sm text-gray-400">
            <div>没搜到。换个关键词，或清空关键词直接看榜。</div>
            <!-- 筛选把结果滤空时，直接给出路，而不是只告诉用户「没搜到」 -->
            <button v-if="activeFilterCount" class="mt-2 text-primary text-xs underline" @click="clearFilters">
              清空筛选试试
            </button>
          </div>
          <div v-else class="grid grid-cols-3 gap-2">
            <button
              v-for="it in results"
              :key="it.uid"
              class="relative rounded-lg overflow-hidden bg-white border text-left"
              :class="isSelected(it) ? 'border-primary ring-2 ring-primary' : 'border-gray-200'"
              @click="toggleSelect(it)"
            >
              <img :src="imgSrc(it.image, 400)" class="w-full aspect-[2/3] object-cover object-top bg-gray-100" loading="lazy" />
              <div class="p-1">
                <div class="text-[10px] font-bold leading-tight line-clamp-2">{{ it.name }}</div>
                <div class="text-[9px] text-gray-400 leading-tight mt-0.5 flex gap-1">
                  <span v-if="it.score" class="text-amber-600 font-bold">{{ it.score.toFixed(1) }}</span>
                  <span v-if="it.date">{{ it.date.slice(0, 4) }}</span>
                  <span v-if="it.platform">{{ it.platform }}</span>
                </div>
              </div>
              <div v-if="isSelected(it)" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-white text-[11px] leading-none flex items-center justify-center font-bold">✓</div>
              <!-- 已经在榜上的，直接标出在哪一层：不然只能选完点添加、再被 toast 告知「已经在里了」，白操作一次 -->
              <div
                v-if="placedByUid.get(it.uid)"
                class="absolute top-1 left-1 max-w-[74px] truncate rounded px-1 py-0.5 text-[9px] font-bold text-white"
                :style="{ backgroundColor: placedByUid.get(it.uid)?.color }"
              >{{ placedByUid.get(it.uid)?.name }}</div>
            </button>
          </div>
          <!--
            无限滚动的哨兵。
            真正触发加载的时机在 IntersectionObserver 里（rootMargin 提前 600px）——
            所以正常情况下用户根本看不到这行文字，滚动是连续不断的。
            这一行是给「加载不动」的情况一个可点击的出路，以及明确告知「到底了」。
          -->
          <div ref="sentinelEl" class="h-10 flex items-center justify-center text-[10px] text-gray-400">
            <template v-if="loadingMore">加载中…</template>
            <template v-else-if="loadMoreError">
              <button class="underline text-amber-600" @click="loadMore">加载失败，点这里重试</button>
            </template>
            <template v-else-if="hasMore">继续向下滚动</template>
            <template v-else-if="reachedCap">
              结果很多 · 已加载 {{ rawResults.length }} 条，输入关键词能更快找到
            </template>
            <template v-else-if="results.length">没有更多了</template>
          </div>

          <p v-if="usedFallback" class="text-[10px] text-amber-600 mt-2">
            网络请求失败，已回落到本地 28 个角色（{{ searchError }}）
          </p>
        </div>

        <!-- 筛选面板：底出面板，条件按维度分组，不再和主界面挤在一行 -->
        <div
          v-if="filterSheetOpen"
          class="absolute inset-0 z-[60] flex flex-col justify-end bg-black/40"
          @click="filterSheetOpen = false"
        >
          <div class="bg-white rounded-t-2xl max-h-[78%] flex flex-col" @click.stop>
            <div class="shrink-0 px-3 py-2 border-b border-gray-100 flex items-center">
              <span class="text-sm font-bold">筛选</span>
              <button class="ml-auto text-gray-400 text-xl leading-none px-1" @click="filterSheetOpen = false">×</button>
            </div>

            <div class="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3.5">
              <div>
                <div class="text-[10px] text-gray-400 mb-1.5">排序</div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="s in availableSorts"
                    :key="s.key"
                    class="text-[11px] font-bold rounded px-2.5 py-1.5"
                    :class="sort === s.key ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'"
                    @click="sort = s.key; runSearch()"
                  >{{ s.label }}</button>
                </div>
              </div>

              <div v-if="isSubject">
                <div class="text-[10px] text-gray-400 mb-1.5">年份</div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="y in YEAR_FILTERS"
                    :key="y.key"
                    class="text-[11px] font-bold rounded px-2.5 py-1.5"
                    :class="yearKey === y.key ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'"
                    @click="yearKey = y.key; runSearch()"
                  >{{ y.label }}</button>
                </div>
              </div>

              <!-- 「名次」单独一组：它和年份是两个维度，之前挤在同一行很容易看错 -->
              <div v-if="isSubject">
                <div class="text-[10px] text-gray-400 mb-1.5">名次</div>
                <button
                  class="text-[11px] font-bold rounded px-2.5 py-1.5"
                  :class="rankedOnly ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'"
                  @click="rankedOnly = !rankedOnly; runSearch()"
                >只要有名次</button>
              </div>

              <!--
                平台选项来自当前这批结果。若已选的平台不在结果里也照样列出来，
                否则换关键词后这一组会整组消失，而筛选仍在生效 —— 结果为空却说不出原因。
              -->
              <div v-if="platformOptions.length > 1 || platformFilter">
                <div class="text-[10px] text-gray-400 mb-1.5">平台</div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    class="text-[11px] font-bold rounded px-2.5 py-1.5"
                    :class="!platformFilter ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'"
                    @click="platformFilter = ''"
                  >全部</button>
                  <button
                    v-for="p in platformOptions"
                    :key="p"
                    class="text-[11px] font-bold rounded px-2.5 py-1.5"
                    :class="platformFilter === p ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'"
                    @click="platformFilter = p"
                  >{{ p }}</button>
                </div>
              </div>
            </div>

            <div class="shrink-0 px-3 py-2 border-t border-gray-100 flex gap-2">
              <button class="btn-outline-gray flex-1 py-2 text-xs" @click="clearFilters">清空全部</button>
              <button class="btn-primary flex-1 py-2 text-xs" @click="filterSheetOpen = false">完成</button>
            </div>
          </div>
        </div>

        <!-- 底部：已选 N + 添加 -->
        <div class="shrink-0 bg-white border-t-2 border-primary/30 px-3 py-2 flex items-center gap-2">
          <span class="text-xs text-gray-500">
            已选 <b class="text-primary text-base">{{ selectedItems.length }}</b> 个
          </span>
          <button
            class="btn-primary flex-1 py-2.5 text-sm"
            :disabled="!selectedItems.length"
            :class="!selectedItems.length ? 'opacity-40' : ''"
            @click="commitToTier"
          >添加到「{{ dialogTier?.name }}」</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
