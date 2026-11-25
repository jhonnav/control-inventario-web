-- Esquema original. IF NOT EXISTS conserva una base de datos anterior.
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad >= 0 AND cantidad <= 999999),
  precio REAL NOT NULL CHECK (precio >= 0 AND precio <= 99999999)
);
