-- Migration number: 0002 	 2024-12-15T00:00:00.000Z
DROP TABLE IF EXISTS custom_templates;
CREATE TABLE custom_templates (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'grid',
  title TEXT,
  author_ip_hash TEXT,
  config JSON,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX idx_custom_templates_created_at ON custom_templates(created_at);
