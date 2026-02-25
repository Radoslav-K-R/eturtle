ALTER TABLE packages
  ADD COLUMN origin_latitude DECIMAL(10, 7),
  ADD COLUMN origin_longitude DECIMAL(10, 7),
  ADD COLUMN destination_latitude DECIMAL(10, 7),
  ADD COLUMN destination_longitude DECIMAL(10, 7);

CREATE INDEX idx_packages_origin_coords ON packages (origin_latitude, origin_longitude)
  WHERE origin_latitude IS NOT NULL;
CREATE INDEX idx_packages_destination_coords ON packages (destination_latitude, destination_longitude)
  WHERE destination_latitude IS NOT NULL;
