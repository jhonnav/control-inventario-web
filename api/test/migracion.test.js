'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { migrar } = require('../src/migrar');

test('la migración conserva los productos de una base anterior', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(fs.readFileSync(
    path.join(__dirname, '..', 'migrations', '001_productos.sql'), 'utf8'));
  db.exec(`INSERT INTO productos (codigo, nombre, categoria, cantidad, precio)
           VALUES ('A1', 'Lápiz', 'Oficina', 7, 0.5)`);

  migrar(db);
  migrar(db); // Repetirla no debe duplicar datos.

  assert.equal(db.prepare('SELECT cantidad FROM productos').get().cantidad, 7);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM movimientos').get().n, 1);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  db.close();
});
