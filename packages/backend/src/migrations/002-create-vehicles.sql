CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate VARCHAR(20) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('van', 'truck', 'motorcycle')),
  weight_capacity_kg DECIMAL(10, 2) NOT NULL CHECK (weight_capacity_kg > 0),
  volume_capacity_cbm DECIMAL(10, 4) NOT NULL CHECK (volume_capacity_cbm > 0),
  current_depot_id UUID REFERENCES depots(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_transit', 'maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_current_depot ON vehicles (current_depot_id);
CREATE INDEX idx_vehicles_status ON vehicles (status);
CREATE INDEX idx_vehicles_type ON vehicles (type);
