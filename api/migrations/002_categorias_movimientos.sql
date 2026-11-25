-- Modelo relacional: categorias 1:N productos 1:N movimientos.
CREATE TABLE categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

INSERT INTO categorias (nombre) VALUES
  ('Electrónica'), ('Oficina'), ('Limpieza'), ('Otros');

-- Conserva cualquier categoría previa que no esté en la lista.
INSERT OR IGNORE INTO categorias (nombre)
  SELECT DISTINCT categoria FROM productos;

CREATE TABLE productos_nueva (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad >= 0 AND cantidad <= 999999),
  stock_minimo INTEGER NOT NULL DEFAULT 3
    CHECK (stock_minimo >= 0 AND stock_minimo <= 999999),
  precio REAL NOT NULL CHECK (precio >= 0 AND precio <= 99999999),
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

INSERT INTO productos_nueva (id, codigo, nombre, categoria_id, cantidad, precio)
  SELECT p.id, p.codigo, p.nombre, c.id, p.cantidad, p.precio
  FROM productos p JOIN categorias c ON c.nombre = p.categoria;

DROP TABLE productos;
ALTER TABLE productos_nueva RENAME TO productos;

CREATE TABLE movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA')),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0 AND cantidad <= 999999),
  stock_resultante INTEGER NOT NULL
    CHECK (stock_resultante >= 0 AND stock_resultante <= 999999),
  motivo TEXT NOT NULL,
  fecha TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_movimientos_producto ON movimientos(producto_id);

-- El stock existente queda registrado como saldo inicial del historial.
INSERT INTO movimientos (producto_id, tipo, cantidad, stock_resultante, motivo)
  SELECT id, 'ENTRADA', cantidad, cantidad, 'Saldo inicial (migración)'
  FROM productos WHERE cantidad > 0;
