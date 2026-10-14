var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var SNAPSHOT_KEYS = {
  trending: /* @__PURE__ */ __name((period) => `trending:${period}`, "trending"),
  trendingTemplates: "trending-templates"
};
var TRENDING_PERIODS = ["12h", "24h", "week", "all"];
var TRENDING_LIMIT = 63;
var STATS_TOP_PER_SLOT = 50;
var STATS_MAX_TEMPLATES = 400;
var STATS_CONCURRENCY = 8;
var WRITE_BATCH_SIZE = 50;
var TRENDING_WINDOW_COLUMN = {
  "12h": "c12h",
  "24h": "c24h",
  "week": "cWeek",
  "all": "cAll"
};
var TRENDING_SQL = `
WITH agg AS MATERIALIZED (
    SELECT si.bangumi_id AS id,
           MAX(si.character_name) AS name,
           MAX(si.img_url)        AS image,
           COUNT(DISTINCT CASE WHEN s.created_at > strftime('%s','now') - 43200  THEN s.user_hash END) AS c12h,
           COUNT(DISTINCT CASE WHEN s.created_at > strftime('%s','now') - 86400  THEN s.user_hash END) AS c24h,
           COUNT(DISTINCT CASE WHEN s.created_at > strftime('%s','now') - 604800 THEN s.user_hash END) AS cWeek,
           COUNT(DISTINCT s.user_hash) AS cAll
    FROM save_items si
    JOIN saves s ON si.save_id = s.id
    WHERE si.item_category = 'character'
    GROUP BY si.bangumi_id
)
SELECT id, name, image, c12h, c24h, cWeek, cAll
FROM agg
WHERE id IN (
    SELECT id FROM (SELECT id FROM agg WHERE c12h  > 0 ORDER BY c12h  DESC LIMIT ${TRENDING_LIMIT})
    UNION
    SELECT id FROM (SELECT id FROM agg WHERE c24h  > 0 ORDER BY c24h  DESC LIMIT ${TRENDING_LIMIT})
    UNION
    SELECT id FROM (SELECT id FROM agg WHERE cWeek > 0 ORDER BY cWeek DESC LIMIT ${TRENDING_LIMIT})
    UNION
    SELECT id FROM (SELECT id FROM agg WHERE cAll  > 0 ORDER BY cAll  DESC LIMIT ${TRENDING_LIMIT})
)
`;
async function refreshTrending(db) {
  const { results } = await db.prepare(TRENDING_SQL).all();
  const now = Math.floor(Date.now() / 1e3);
  const statements = TRENDING_PERIODS.map((period) => {
    const column = TRENDING_WINDOW_COLUMN[period];
    const top = results.filter((row) => row[column] > 0).sort(
      (a, b) => b[column] - a[column]
    ).slice(0, TRENDING_LIMIT).map((row) => ({
      name: row.name,
      id: row.id,
      image: row.image,
      count: row[column]
    }));
    return db.prepare(
      "INSERT OR REPLACE INTO snapshot_cache (key, data, updated_at) VALUES (?, ?, ?)"
    ).bind(SNAPSHOT_KEYS.trending(period), JSON.stringify(top), now);
  });
  await db.batch(statements);
  return { aggRows: results.length, written: statements.length };
}
__name(refreshTrending, "refreshTrending");
async function refreshTrendingTemplates(db) {
  const { results } = await db.prepare(
    `SELECT template_id AS id, COUNT(*) AS count
             FROM saves
             GROUP BY template_id
             ORDER BY count DESC
             LIMIT 100`
  ).all();
  await db.prepare(
    "INSERT OR REPLACE INTO snapshot_cache (key, data, updated_at) VALUES (?, ?, ?)"
  ).bind(
    SNAPSHOT_KEYS.trendingTemplates,
    JSON.stringify(results),
    Math.floor(Date.now() / 1e3)
  ).run();
  return { written: results.length };
}
__name(refreshTrendingTemplates, "refreshTrendingTemplates");
var TEMPLATE_STATS_SQL = `
WITH agg AS (
    SELECT i.slot_label      AS slot,
           i.character_name  AS cname,
           i.bangumi_id      AS bid,
           MAX(i.img_url)    AS img,
           COUNT(DISTINCT s.user_hash) AS votes
    FROM saves s
    JOIN save_items i ON i.save_id = s.id
    WHERE s.template_id = ?
    GROUP BY i.slot_label, i.character_name
),
ranked AS (
    SELECT slot, cname, bid, img, votes,
           ROW_NUMBER() OVER (PARTITION BY slot ORDER BY votes DESC) AS rn
    FROM agg
)
SELECT slot, cname, bid, img, votes
FROM ranked
WHERE rn <= ?
`;
async function computeTemplateStats(db, templateId) {
  const { results } = await db.prepare(TEMPLATE_STATS_SQL).bind(templateId, STATS_TOP_PER_SLOT).all();
  const bySlot = {};
  for (const row of results) {
    if (!bySlot[row.slot]) bySlot[row.slot] = [];
    bySlot[row.slot].push({
      name: row.cname,
      id: row.bid,
      image: row.img,
      count: row.votes
    });
  }
  return bySlot;
}
__name(computeTemplateStats, "computeTemplateStats");
async function refreshStats(db, maxTemplates) {
  const { results: templates } = await db.prepare(
    `SELECT template_id, COUNT(*) AS saves
             FROM saves
             GROUP BY template_id
             ORDER BY saves DESC
             LIMIT ?`
  ).bind(maxTemplates).all();
  const now = Math.floor(Date.now() / 1e3);
  const cacheWrites = [];
  for (let i = 0; i < templates.length; i += STATS_CONCURRENCY) {
    const chunk = templates.slice(i, i + STATS_CONCURRENCY);
    const computed = await Promise.all(
      chunk.map((t) => computeTemplateStats(db, t.template_id))
    );
    for (let j = 0; j < chunk.length; j++) {
      cacheWrites.push(
        db.prepare(
          "INSERT OR REPLACE INTO statistics_cache (template_id, period, data, updated_at) VALUES (?, ?, ?, ?)"
        ).bind(chunk[j].template_id, "all", JSON.stringify(computed[j]), now)
      );
    }
  }
  for (let i = 0; i < cacheWrites.length; i += WRITE_BATCH_SIZE) {
    await db.batch(cacheWrites.slice(i, i + WRITE_BATCH_SIZE));
  }
  return { templates: cacheWrites.length };
}
__name(refreshStats, "refreshStats");
async function runRefresh(env, trigger) {
  const startedAt = Date.now();
  const outcome = {
    trigger,
    at: new Date(startedAt).toISOString(),
    ms: 0,
    failures: []
  };
  try {
    outcome.trending = await refreshTrending(env.DB);
  } catch (error) {
    outcome.failures.push({ task: "trending", error: String(error) });
    console.error("[snapshot-refresh] trending failed:", error);
  }
  try {
    outcome.trendingTemplates = await refreshTrendingTemplates(env.DB);
  } catch (error) {
    outcome.failures.push({ task: "trending-templates", error: String(error) });
    console.error("[snapshot-refresh] trending-templates failed:", error);
  }
  try {
    outcome.stats = await refreshStats(env.DB, STATS_MAX_TEMPLATES);
  } catch (error) {
    outcome.failures.push({ task: "stats", error: String(error) });
    console.error("[snapshot-refresh] stats failed:", error);
  }
  outcome.ms = Date.now() - startedAt;
  console.log("[snapshot-refresh]", JSON.stringify(outcome));
  return outcome;
}
__name(runRefresh, "runRefresh");
function isAuthorized(request, env) {
  const expected = env.REFRESH_TOKEN;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}
__name(isAuthorized, "isAuthorized");
var src_default = {
  /** 定时触发：由 wrangler.toml 的 [triggers] crons 驱动 */
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      runRefresh(env, "cron").then((outcome) => {
        if (outcome.failures.length > 0) {
          throw new Error(
            `snapshot refresh incomplete: ${JSON.stringify(outcome.failures)}`
          );
        }
      })
    );
  },
  /** 手动触发：仅用于首次引导和排障，需要 Bearer REFRESH_TOKEN */
  async fetch(request, env) {
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return new Response("Malformed request URL", { status: 400 });
    }
    if (url.pathname !== "/refresh") {
      return new Response("Not found", { status: 404 });
    }
    if (!isAuthorized(request, env)) {
      return new Response("Unauthorized", { status: 401 });
    }
    if (request.method !== "POST") {
      return new Response("Use POST", { status: 405 });
    }
    const result = await runRefresh(env, "manual");
    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
};

// ../../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-DYuWL3/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-DYuWL3/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
