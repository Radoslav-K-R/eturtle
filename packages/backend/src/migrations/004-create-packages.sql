CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number VARCHAR(50) NOT NULL UNIQUE,
  origin_address VARCHAR(500) NOT NULL,
  origin_depot_id UUID REFERENCES depots(id) ON DELETE SET NULL,
  destination_address VARCHAR(500) NOT NULL,
  destination_depot_id UUID REFERENCES depots(id) ON DELETE SET NULL,
  weight_kg DECIMAL(10, 2) NOT NULL CHECK (weight_kg > 0),
  length_cm DECIMAL(10, 2) NOT NULL CHECK (length_cm > 0),
  width_cm DECIMAL(10, 2) NOT NULL CHECK (width_cm > 0),
  height_cm DECIMAL(10, 2) NOT NULL CHECK (height_cm > 0),
  volume_cbm DECIMAL(10, 4) GENERATED ALWAYS AS (length_cm * width_cm * height_cm / 1000000.0) STORED,
  contents_description TEXT,
  current_status VARCHAR(30) NOT NULL DEFAULT 'registered',
  assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_packages_current_status ON packages (current_status);
CREATE INDEX idx_packages_assigned_vehicle ON packages (assigned_vehicle_id);
CREATE INDEX idx_packages_origin_depot ON packages (origin_depot_id);
CREATE INDEX idx_packages_destination_depot ON packages (destination_depot_id);
