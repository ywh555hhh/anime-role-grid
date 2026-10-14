-- MASTER SCHEMA
-- Combined from base + 0001_add_analytics_columns + 0002_add_custom_templates
-- + 0003_add_statistics_cache + 0004_add_snapshot_cache

DROP TABLE IF EXISTS save_items;
DROP TABLE IF EXISTS saves;
DROP TABLE IF EXISTS custom_templates;
DROP TABLE IF EXISTS statistics_cache;
DROP TABLE IF EXISTS snapshot_cache;

-- 1. SAVES TABLE
CREATE TABLE saves (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    custom_title TEXT,
    user_hash TEXT,               -- NEW: Unique User ID (Anonymized)
    device_type TEXT,             -- NEW: Mobile / Desktop
    referer TEXT,                 -- NEW: Traffic Source
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 2. SAVE ITEMS TABLE
CREATE TABLE save_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id TEXT NOT NULL,
    slot_index INTEGER NOT NULL,
    slot_label TEXT NOT NULL,
    character_name TEXT NOT NULL,
    img_url TEXT,
    
    -- Analytics Columns (from 0001)
    bangumi_id INTEGER,
    item_category TEXT, -- 'character', 'subject', 'person', 'custom'
    subject_type TEXT,  -- 'anime', 'game', 'music' (only if category='subject')

    FOREIGN KEY(save_id) REFERENCES saves(id)
);

-- 3. CUSTOM TEMPLATES TABLE (from 0002)
CREATE TABLE custom_templates (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'grid',
  title TEXT,
  author_ip_hash TEXT,
  config JSON,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 4. STATISTICS CACHE TABLE (from 0003 - Party War Strategy)
CREATE TABLE statistics_cache (
    template_id TEXT,
    period TEXT, -- '24h', 'week', 'all'
    data JSON,   -- Pre-calculated stats (Top lists per slot)
    updated_at INTEGER,
    PRIMARY KEY (template_id, period)
);

-- 4b. SNAPSHOT CACHE TABLE (from 0004)
-- 存放「小列表」类快照（热榜各周期、热门模板），每个键一行 JSON。
-- 由 workers/snapshot-refresh 定期刷新，接口只需读一行。
CREATE TABLE snapshot_cache (
    key        TEXT PRIMARY KEY,   -- 如 'trending:week' / 'trending-templates'
    data       TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- INDEXES
CREATE INDEX idx_saves_template ON saves(template_id);
CREATE INDEX idx_saves_user ON saves(user_hash);
CREATE INDEX idx_items_char ON save_items(character_name);
CREATE INDEX idx_items_label ON save_items(slot_label);
CREATE INDEX idx_items_bangumi_id ON save_items(bangumi_id);
CREATE INDEX idx_items_category ON save_items(item_category);
-- JOIN 键：缺它会让所有「从 saves 侧驱动」的查询退化为嵌套循环全表扫（from 0004）
CREATE INDEX idx_items_save_id ON save_items(save_id);
CREATE INDEX idx_custom_templates_created_at ON custom_templates(created_at);
-- statistics_cache / snapshot_cache 的查询都走主键，无需额外索引
