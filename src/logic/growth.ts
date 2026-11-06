/**
 * 引流弹窗的频控中枢
 * ====================
 *
 * ## 为什么要有这个文件
 * 之前频控散在两个地方：
 *
 *   - `Home.vue`        → `localStorage.lastGuideDate`（每天一次）
 *   - `trendingTrigger` → `localStorage.lastTrendingTime`（一小时一次）
 *
 * 两个 key、两种粒度、两个文件，而且 FirstTimeGuide 关闭后还会**立刻**
 * 链式触发 trending —— 于是用户刚关掉一个弹窗，又来一个。
 *
 * 现在统一成：
 *
 *   - 一个 key 命名空间、一套 API（`canShow` / `markShown`）
 *   - **同一次访问最多弹一个自动弹窗**，不连弹
 *   - 优先级直接复用 `modalStore` 的 `MODAL_PRIORITY`，不另立一套
 *
 * ## 为什么要区分「冷却」和「本次访问」
 * - **冷却**（持久化到 localStorage）：「这个弹窗多久该出现一次」
 * - **本次访问**（模块级变量）：「这一次打开网页，已经弹过了没有」
 *
 * 后者用模块级变量而不是 localStorage，是因为它要表达的是
 * 「这一次打开网页」，刷新页面就该重置 —— 写进 localStorage 就变成
 * 「今天不弹了」，那是冷却该管的事。
 */

import { MODAL_PRIORITY } from "~/stores/modalStore";

/** 持久化 key 的前缀。改数据结构时升版本号，老数据自然失效 */
const KEY_PREFIX = "arg:growth:v1:";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** 自动弹窗的槽位。每加一种自动弹窗，就加一个槽位 */
export type GrowthSlot = "daily-picks" | "trending-picks";

export interface GrowthPolicy {
    /**
     * 冷却粒度。
     *
     * - `day` —— **日历日**。今天弹过就今天不弹，跨过零点立刻恢复。
     *   用「24 小时时间戳」实现是不对的：晚上 11:59 弹过，
     *   第二天早上 8 点进来就该能看到，但按 24h 算还在冷却里。
     * - `duration` —— 固定时长（毫秒）。
     */
    granularity: "day" | "duration";
    /** granularity === "duration" 时的冷却时长（毫秒） */
    cooldownMs: number;
    /** 展示优先级。复用 modalStore，不另立体系 */
    priority: number;
}

/**
 * 各槽位的策略。
 *
 * - `daily-picks`（每日精选引导）：一天一次。用户在「今天第一次来」时看到，
 *   之后就该让他安安静静做表了。
 * - `trending-picks`（热门模板推荐）：一小时一次。热度天天在变，
 *   隔一小时再推一次是合理的；但每天推同一个就没意义了。
 */
export const GROWTH_POLICIES: Record<GrowthSlot, GrowthPolicy> = {
    "daily-picks": { granularity: "day", cooldownMs: 0, priority: MODAL_PRIORITY.GUIDE },
    "trending-picks": {
        granularity: "duration",
        cooldownMs: HOUR,
        priority: MODAL_PRIORITY.PROMOTION,
    },
};

/** 两个时间戳是不是同一个日历日（按本地时区） */
function isSameDay(a: number, b: number): boolean {
    const da = new Date(a);
    const db = new Date(b);
    return (
        da.getFullYear() === db.getFullYear() &&
        da.getMonth() === db.getMonth() &&
        da.getDate() === db.getDate()
    );
}

/**
 * 旧版频控 key（2026-11 之前）
 *
 * 以前频控散落着两个 key，粒度还不一样。现在统一到 KEY_PREFIX 下，
 * 这两个就没人读了 —— 清掉，免得 localStorage 里留垃圾。
 */
const LEGACY_KEYS = ["lastGuideDate", "lastTrendingTime"];

function cleanupLegacyKeys(): void {
    try {
        for (const key of LEGACY_KEYS) {
            localStorage.removeItem(key);
        }
    } catch {
        /* 无痕模式 / 读不到就清不掉，无所谓 */
    }
}

cleanupLegacyKeys();

/** 本次页面访问是否已经弹过自动弹窗 */
let shownThisVisit = false;

/** 上次展示时间（毫秒时间戳）。读不到就是 null */
function readLastShown(slot: GrowthSlot): number | null {
    try {
        const raw = localStorage.getItem(KEY_PREFIX + slot);
        if (!raw) return null;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
        // localStorage 是外部输入（可能无痕模式、可能被人改过），坏数据当没有
        return null;
    }
}

/**
 * 这个槽位现在能不能弹。
 *
 * 冷却到期 → 能弹；从没弹过 → 能弹；localStorage 读不出来 → 能弹
 * （宁可多弹一次，也不要因为读不到存储就完全不弹）。
 */
export function canShow(slot: GrowthSlot): boolean {
    const policy = GROWTH_POLICIES[slot];
    const last = readLastShown(slot);

    // 从没弹过 → 能弹
    if (last === null) return true;

    if (policy.granularity === "day") {
        // 日历日粒度：跨过零点就恢复
        return !isSameDay(last, Date.now());
    }

    if (policy.cooldownMs <= 0) return true;
    return Date.now() - last >= policy.cooldownMs;
}

/**
 * 记下「这个槽位刚刚弹过」。
 *
 * 写不进去就当没记录 —— 无痕模式 / 配额满了会抛异常，
 * 吞掉即可，功能照用（只是这次会多弹一次）。
 */
export function markShown(slot: GrowthSlot): void {
    try {
        localStorage.setItem(KEY_PREFIX + slot, String(Date.now()));
    } catch {
        /* 写不进去就当没有记忆 */
    }
}

/** 本次访问是否已经弹过自动弹窗 */
export function hasShownThisVisit(): boolean {
    return shownThisVisit;
}

/** 标记本次访问已经弹过自动弹窗 */
export function markShownThisVisit(): void {
    shownThisVisit = true;
}

/** 槽位策略（弹窗打开时用来取优先级） */
export function getGrowthPolicy(slot: GrowthSlot): GrowthPolicy {
    return GROWTH_POLICIES[slot];
}

/** 各槽位上次展示时间。调试用 */
export function getGrowthState(): Record<GrowthSlot, number | null> {
    return {
        "daily-picks": readLastShown("daily-picks"),
        "trending-picks": readLastShown("trending-picks"),
    };
}

/**
 * 清空所有频控记录。
 *
 * 调试、或者运营想手动重新推一次引导时用。
 * 注意：只清持久化的冷却，**不清「本次访问已弹过」** ——
 * 那个由刷新页面自然重置。
 */
export function resetGrowthCooldowns(): void {
    try {
        for (const slot of Object.keys(GROWTH_POLICIES) as GrowthSlot[]) {
            localStorage.removeItem(KEY_PREFIX + slot);
        }
    } catch {
        /* 清不掉就算了 */
    }
}
