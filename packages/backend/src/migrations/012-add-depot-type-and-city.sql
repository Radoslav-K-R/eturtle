ALTER TABLE depots
  ADD COLUMN IF NOT EXISTS type VARCHAR(10) NOT NULL DEFAULT 'depot' CHECK (type IN ('depot', 'hub'));

ALTER TABLE depots
  ADD COLUMN IF NOT EXISTS city VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_depots_type ON depots (type);
CREATE INDEX IF NOT EXISTS idx_depots_city ON depots (city);
CREATE INDEX IF NOT EXISTS idx_depots_type_active ON depots (type, is_active);
CREATE INDEX IF NOT EXISTS idx_depots_coordinates ON depots (latitude, longitude);
