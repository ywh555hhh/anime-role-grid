/**
 * 原型的「记忆 + 缓存」层
 * ======================
 *
 * ## 为什么需要它
 * 这个原型之前有两个体感问题，用户描述得很准：
 *   - 「没有记忆」—— 刷新一下榜就没了；弹框里筛好的、输一半的关键词也全没
 *   - 「没有缓存」—— 每次打开弹框都重新联网搜一遍，条件明明一模一样
 *
 * ## 拆成两件事，各自用合适的存储
 *
 *   记忆（用户创造的，必须留）
 *     localStorage：榜（tiers）、导出设置、弹框筛选偏好
 *     跨会话、跨标签页；容量 ~5MB；同步 API
 *
 *   缓存（可以重新算出来的，为了快）
 *     内存 LRU + sessionStorage 镜像：搜索结果
 *     按查询指纹索引；命中就瞬间出结果；跨刷新仍然热
 *
 * ## 几条刻意的取舍（都是踩过才知道的）
 *
 * - **写入去抖**：拖拽物品会高频改数组，绝不能每次 push 都写一遍 localStorage ——
 *   那是同步 IO，会直接造成拖拽卡顿。统一走 debounce。
 *
 * - **版本化 key**：`hangla:v1:...`。将来数据结构变了直接升 v2，老数据自然失效。
 *   原型阶段写迁移代码是纯负担，升版本号就够了。
 *
 * - **读取一律 try/catch + 形状校验**：localStorage 是用户随手就能改的外部输入，
 *   也可能是旧版本写的。坏数据必须降级成「没有记忆」，而不是让页面白屏。
 *
 * - **写不进去就当没有记忆**：无痕模式 / 配额满了会抛异常，吞掉即可，功能照用。
 *
 * - **缓存要有新鲜度，但不是简单的过期即失效**：超过 TTL 仍然先把旧结果给你
 *   （瞬间出结果），同时在后台悄悄换新 —— 也就是 stale-while-revalidate。
 *   这样才既有「记得住」的体感，数据又不真的陈旧。
 */

const KEY_PREFIX = "hangla:v1:";

/** 全部存储键集中在这里，一眼能看清这个原型到底记了什么 */
export const STORE_KEYS = {
   /** 榜：层级 + 物品 + tierSeq */
   board: `${KEY_PREFIX}board`,
   /** 导出设置与界面偏好 */
   prefs: `${KEY_PREFIX}prefs`,
   /** 搜索结果缓存（sessionStorage 镜像） */
   searchCache: `${KEY_PREFIX}search-cache`,
} as const;

// ---------------------------------------------------------------- 存储读写

type StorageKind = "local" | "session";

/**
 * 拿一个可用的 Storage。
 *
 * 无痕模式下 localStorage 存在但 setItem 会抛 QuotaExceededError，
 * 所以这里先做一次真实写入探测，而不是只看 `"localStorage" in window`。
 */
function getStorage(kind: StorageKind): Storage | null {
   try {
      const s = kind === "local" ? window.localStorage : window.sessionStorage;
      const probe = `${KEY_PREFIX}__probe`;
      s.setItem(probe, "1");
      s.removeItem(probe);
      return s;
   } catch {
      return null;
   }
}

/**
 * 读一个 JSON。任何异常 / 校验不过 → null（当作「没有记忆」）。
 *
 * @param validate 形状校验。必须传：存进去的东西可能来自旧版本或被用户手改过。
 */
export function loadStored<T>(
   key: string,
   validate: (v: unknown) => v is T,
   kind: StorageKind = "local",
): T | null {
   const s = getStorage(kind);
   if (!s) return null;
   try {
      const raw = s.getItem(key);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return validate(parsed) ? parsed : null;
   } catch {
      return null;
   }
}

/** 写一个 JSON。写不进去（无痕 / 配额满）返回 false，调用方不需要管。 */
export function saveStored(
   key: string,
   value: unknown,
   kind: StorageKind = "local",
): boolean {
   const s = getStorage(kind);
   if (!s) return false;
   try {
      s.setItem(key, JSON.stringify(value));
      return true;
   } catch {
      return false;
   }
}

export function removeStored(key: string, kind: StorageKind = "local"): void {
   try {
      getStorage(kind)?.removeItem(key);
   } catch {
      /* 清不掉也无所谓，下次读写会自己校验 */
   }
}

// ---------------------------------------------------------------- 工具

/** 去抖：把高频写入（拖拽）合并成一次 */
export function debounce<A extends unknown[]>(
   fn: (...args: A) => void,
   ms: number,
): (...args: A) => void {
   let timer: number | undefined;
   return (...args: A) => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
         timer = undefined;
         fn(...args);
      }, ms);
   };
}

/** 通用校验器工厂：数组 + 每项通过 item */
export function isArrayOf<T>(item: (v: unknown) => v is T) {
   return (v: unknown): v is T[] => Array.isArray(v) && v.every(item);
}

export const isString = (v: unknown): v is string => typeof v === "string";
export const isNumber = (v: unknown): v is number =>
   typeof v === "number" && Number.isFinite(v);
export const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";
export const isOptionalString = (v: unknown) => v === undefined || isString(v);
export const isOptionalNumber = (v: unknown) => v === undefined || isNumber(v);

// ---------------------------------------------------------------- 查询缓存

export interface CacheHit<T> {
   value: T;
   /** 距写入过了多久 */
   ageMs: number;
   /** 是否还在 TTL 内 */
   fresh: boolean;
}

export interface QueryCache<T> {
   get(key: string): CacheHit<T> | null;
   set(key: string, value: T): void;
   has(key: string): boolean;
   readonly size: number;
   clear(): void;
}

export interface QueryCacheOptions {
   /** 最多记多少条查询，超出淘汰最久未用的 */
   limit?: number;
   /** 多久算旧（超过仍然先给旧的，只是会触发后台刷新） */
   ttlMs?: number;
   /** 传了就额外镜像到 sessionStorage，页面刷新后仍然热 */
   mirrorKey?: string;
   /** 镜像内容的形状校验 */
   mirrorValidate?: (v: unknown) => boolean;
}

interface Entry<T> {
   value: T;
   at: number;
}

/** 镜像到 sessionStorage 时必须把 key 一起带上（Map 的键不会进 JSON） */
interface MirrorEntry<T> extends Entry<T> {
   key: string;
}

/**
 * 按查询指纹索引的 LRU 缓存。
 *
 * 为什么不是「只记上一次查询」：那样在 tab / 筛选项之间来回切就要反复联网，
 * 每次都得看一遍「搜索中…」。用 Map 的插入序做 LRU —— 命中就删了再塞回尾部，
 * 淘汰就从头部（最久未用）开始。
 *
 * 顺带说明为什么不用 `caches.default` / Service Worker：
 * 那些是 HTTP 层缓存，只能缓存「响应」，而且在这里还得先真发一次请求。
 * 我们要的是「同一个查询条件直接命中结果对象」，属于应用层缓存。
 */
export function createQueryCache<T>(
   options: QueryCacheOptions = {},
): QueryCache<T> {
   const {
      limit = 40,
      ttlMs = 10 * 60_000,
      mirrorKey,
      mirrorValidate,
   } = options;

   // Map 保持插入顺序 → 天然就是 LRU 队列
   const mem = new Map<string, Entry<T>>();

   // 冷启动时先把镜像装回来
   if (mirrorKey && mirrorValidate) {
      const mirrored = loadStored<MirrorEntry<T>[]>(
         mirrorKey,
         isArrayOf(isMirrorEntry(mirrorValidate)),
         "session",
      );
      if (mirrored) {
         for (const e of mirrored.slice(-limit))
            mem.set(e.key, { value: e.value, at: e.at });
      }
   }

   const flushMirror =
      mirrorKey && mirrorValidate
         ? debounce(() => {
              // 只镜像最近 limit 条：sessionStorage 也是有配额的
              saveStored(
                 mirrorKey,
                 [...mem.entries()]
                    .slice(-limit)
                    .map(([key, e]) => ({ key, value: e.value, at: e.at })),
                 "session",
              );
           }, 400)
         : () => {};

   return {
      get(key) {
         const e = mem.get(key);
         if (!e) return null;
         // 命中就移到队尾（最新）
         mem.delete(key);
         mem.set(key, e);
         const ageMs = Date.now() - e.at;
         return { value: e.value, ageMs, fresh: ageMs < ttlMs };
      },

      set(key, value) {
         mem.delete(key);
         mem.set(key, { value, at: Date.now() });
         // 淘汰最久未用的
         while (mem.size > limit) {
            const oldest = mem.keys().next().value;
            if (oldest === undefined) break;
            mem.delete(oldest);
         }
         flushMirror();
      },

      has: (key) => mem.has(key),

      get size() {
         return mem.size;
      },

      clear() {
         mem.clear();
         if (mirrorKey) removeStored(mirrorKey, "session");
      },
   };
}

/** 镜像条目的形状校验（要带上 key，所以不能只校验 value） */
function isMirrorEntry<T>(valueOk: (v: unknown) => boolean) {
   return (v: unknown): v is MirrorEntry<T> => {
      if (typeof v !== "object" || v === null) return false;
      const rec = v as Record<string, unknown>;
      return isString(rec.key) && isNumber(rec.at) && valueOk(rec.value);
   };
}
