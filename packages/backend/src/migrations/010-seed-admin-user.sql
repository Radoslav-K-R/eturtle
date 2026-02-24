-- Seed admin user: admin@eturtle.com / admin123456
-- Password hash is bcrypt with cost factor 12
-- This must be regenerated for production
INSERT INTO users (email, password_hash, full_name, role)
VALUES (
  'admin@eturtle.com',
  '$2b$12$LJ3m4ys3Lg8kOxmGKqfHZOaGGvVU7B7r5HxGBqEjR4X8YBjRmdy6m',
  'System Administrator',
  'admin'
);
