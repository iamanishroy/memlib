-- ═══════════════════════════════════════════════════════════════════
-- MemLib Entity Architecture Migration
-- Run this against each PROJECT's database (not the main app DB)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Add entity column
ALTER TABLE memories ADD COLUMN entity TEXT NOT NULL DEFAULT 'default';

-- 2. Drop old indexes
DROP INDEX IF EXISTS idx_memories_namespace;
DROP INDEX IF EXISTS idx_memories_ns_archived_created;

-- 3. Primary access pattern: namespace + entity + recent (partial, skip archived)
CREATE INDEX idx_memories_ns_entity_created
  ON memories (namespace, entity, created_at DESC)
  WHERE archived = false;

-- 4. Consolidation: find old unarchived memories grouped by ns + entity
CREATE INDEX idx_memories_archived_created
  ON memories (archived, created_at)
  WHERE archived = false;

COMMIT;
