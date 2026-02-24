CREATE TABLE package_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_psh_package_id ON package_status_history (package_id);
CREATE INDEX idx_psh_created_at ON package_status_history (created_at);
