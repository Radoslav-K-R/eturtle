CREATE TABLE route_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  pickup_stop_id UUID NOT NULL REFERENCES route_stops(id) ON DELETE CASCADE,
  dropoff_stop_id UUID NOT NULL REFERENCES route_stops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_route_packages UNIQUE (route_id, package_id)
);

CREATE INDEX idx_route_packages_route ON route_packages (route_id);
CREATE INDEX idx_route_packages_package ON route_packages (package_id);
