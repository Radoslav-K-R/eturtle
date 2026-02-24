CREATE TABLE route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  depot_id UUID NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL CHECK (stop_order > 0),
  estimated_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_route_stops_order UNIQUE (route_id, stop_order)
);

CREATE INDEX idx_route_stops_route ON route_stops (route_id);
