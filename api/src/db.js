'use strict';
// Acceso a datos: solo consultas SQL, sin reglas de negocio.
const { DatabaseSync } = require('node:sqlite');
const { dbArchivo } = require('./config');
const { migrar } = require('./migrar');

const db = new DatabaseSync(dbArchivo);
db.exec('PRAGMA foreign_keys = ON');
migrar(db);

const SELECT_PRODUCTO = `
  SELECT p.id, p.codigo, p.nombre, c.nombre AS categoria,
         p.cantidad, p.stock_minimo, p.precio
  FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
  WHERE p.activo = 1
`;

const listar = () =>
  db.prepare(`${SELECT_PRODUCTO} ORDER BY p.nombre COLLATE NOCASE`).all();

const obtener = codigo =>
  db.prepare(`${SELECT_PRODUCTO} AND p.codigo = ?`).get(codigo);

const listarCategorias = () =>
  db.prepare('SELECT id, nombre FROM categorias ORDER BY id').all();

const obtenerCategoria = nombre =>
  db.prepare('SELECT id FROM categorias WHERE nombre = ?').get(nombre);

const insertarProducto = p =>
  db.prepare(`
    INSERT INTO productos
      (codigo, nombre, categoria_id, cantidad, stock_minimo, precio)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(p.codigo, p.nombre, p.categoriaId, p.cantidad, p.stock_minimo, p.precio)
    .lastInsertRowid;

const actualizarProducto = (id, p) =>
  db.prepare(`
    UPDATE productos
    SET codigo = ?, nombre = ?, categoria_id = ?, stock_minimo = ?, precio = ?
    WHERE id = ?
  `).run(p.codigo, p.nombre, p.categoriaId, p.stock_minimo, p.precio, id);

const actualizarStock = (id, cantidad) =>
  db.prepare('UPDATE productos SET cantidad = ? WHERE id = ?').run(cantidad, id);

const desactivarProducto = id =>
  db.prepare('UPDATE productos SET activo = 0 WHERE id = ?').run(id);

const insertarMovimiento = (productoId, m, stockResultante) =>
  db.prepare(`
    INSERT INTO movimientos
      (producto_id, tipo, cantidad, stock_resultante, motivo)
    VALUES (?, ?, ?, ?, ?)
  `).run(productoId, m.tipo, m.cantidad, stockResultante, m.motivo);

const listarMovimientos = productoId =>
  db.prepare(`
    SELECT id, tipo, cantidad, stock_resultante, motivo, fecha
    FROM movimientos WHERE producto_id = ? ORDER BY id DESC
  `).all(productoId);

// Ejecuta varias escrituras como una sola operación (todo o nada).
function transaccion(operacion) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const resultado = operacion();
    db.exec('COMMIT');
    return resultado;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

module.exports = {
  listar, obtener, listarCategorias, obtenerCategoria, insertarProducto,
  actualizarProducto, actualizarStock, desactivarProducto,
  insertarMovimiento, listarMovimientos, transaccion,
  cerrar: () => db.close()
};
