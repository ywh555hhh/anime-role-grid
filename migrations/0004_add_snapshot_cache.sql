-- Migration number: 0004 	 2026-10-14T00:00:00.000Z
--
-- 目的
-- 把「热榜 / 热门模板 / 投票统计」这些聚合结果**预先算好存起来**，
-- 读取时只查一行，从而不再让每次请求都全量扫描 save_items。
--
-- 背景（实测数据）
--   线上每天读 2~4 亿行，而 D1 免费额度只有 5,000,000 行/天。
--   单次 /api/trending           扫 568,255 行（每天被调 440 次）
--   单次 /api/stats/<id>         扫 791,290 行（每天被调  54 次）
--   单次 /api/trending-templates 扫  63,039 行（每天被调  70 次）
--   而真正需要的数据量极小：最近 24h 只有 122 条 item，最近 7 天只有 1,616 条。
--
-- 本迁移是**非破坏性**的（只使用 IF NOT EXISTS），与 0001/0002 的 DROP TABLE 风格不同，
-- 因为它要作用在已有生产数据的库上。
--
-- 说明：投票统计的快照复用已有的 statistics_cache 表（主键 (template_id, period)），
--       不新增表。

-- 1) 小列表快照：热榜 4 个周期 + 热门模板，每个键一行 JSON
CREATE TABLE IF NOT EXISTS snapshot_cache (
    key        TEXT PRIMARY KEY,   -- 如 'trending:week' / 'trending-templates'
    data       TEXT NOT NULL,      -- JSON 字符串
    updated_at INTEGER NOT NULL    -- Unix 秒，写入时间
);

-- 2) JOIN 键索引
--    save_items(save_id) 一直缺索引（FOREIGN KEY 在 SQLite 不会自动建索引），
--    导致所有「从 saves 侧驱动」的查询退化成嵌套循环全表扫。
--    实测：我做一次带 save_id IN (...) 的 COUNT 就读了 3,257,321 行。
--    有了它，「按模板取全部 item」的总读取量才等于 item 总数（每个 item 只读一次）。
CREATE INDEX IF NOT EXISTS idx_items_save_id ON save_items(save_id);
