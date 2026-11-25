'use strict';
// Pruebas de las reglas de negocio con SQLite en memoria (sin servidor HTTP).
process.env.DB_ARCHIVO = ':memory:';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const s = require('../src/servicio');

const base = {
  codigo: 'R001', nombre: 'Mouse', categoria: 'Electrónica',
  cantidad: 10, stock_minimo: 4, precio: 8.5
};
const falla = (estado, accion) =>
  assert.throws(accion, error => error.estado === estado);
const mover = (tipo, cantidad) =>
  s.registrarMovimiento('R001', { tipo, cantidad, motivo: 'Prueba' });

test('crear un producto registra el saldo inicial', () => {
  assert.equal(s.crearProducto(base).estado, 'Disponible');
  assert.equal(s.listarMovimientos('R001')[0].motivo, 'Saldo inicial');
});

test('una salida descuenta stock y activa la alerta', () => {
  const producto = mover('SALIDA', 6);
  assert.equal(producto.cantidad, 4);
  assert.equal(producto.estado, 'Stock bajo');
});

test('no permite stock negativo ni altera el historial', () => {
  falla(409, () => mover('SALIDA', 5));
  assert.equal(s.obtenerProducto('R001').cantidad, 4);
  assert.equal(s.listarMovimientos('R001').length, 2);
});

test('no permite superar el stock máximo', () => {
  falla(409, () => mover('ENTRADA', 999999));
});

test('rechaza tipos de dato inválidos', () => {
  falla(400, () => s.crearProducto({ ...base, codigo: {} }));
  falla(400, () => s.crearProducto({ ...base, codigo: 'R002', nombre: ['x'] }));
  falla(400, () => s.crearProducto({ ...base, codigo: 'R002', cantidad: true }));
  falla(400, () => s.crearProducto(null));
});

test('rechaza movimientos inválidos', () => {
  for (const cantidad of [0, -1, 1.5, '']) falla(400, () => mover('ENTRADA', cantidad));
  falla(400, () => mover('AJUSTE', 1));
});

test('rechaza una categoría inexistente y un código duplicado', () => {
  falla(400, () => s.crearProducto({ ...base, codigo: 'R002', categoria: 'X' }));
  falla(409, () => s.crearProducto(base));
});

test('editar no permite cambiar la cantidad', () => {
  falla(400, () => s.editarProducto('R001', base));
  const { cantidad, ...sinCantidad } = base;
  assert.equal(s.editarProducto('R001', { ...sinCantidad, nombre: 'Mouse USB' }).cantidad, 4);
});

test('solo da de baja un producto sin stock', () => {
  falla(409, () => s.darDeBaja('R001'));
  assert.equal(mover('SALIDA', 4).estado, 'Agotado');
  s.darDeBaja('R001');
  falla(404, () => s.obtenerProducto('R001'));
  falla(409, () => s.crearProducto(base));
});
