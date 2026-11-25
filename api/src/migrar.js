'use strict';
// Aplica en orden los scripts SQL pendientes, cada uno en una transacción.
const fs = require('node:fs');
const path = require('node:path');

const CARPETA = path.join(__dirname, '..', 'migrations');

function migrar(db) {
  db.exec('CREATE TABLE IF NOT EXISTS migraciones (nombre TEXT PRIMARY KEY)');
  const aplicada = db.prepare('SELECT 1 FROM migraciones WHERE nombre = ?');
  const registrar = db.prepare('INSERT INTO migraciones (nombre) VALUES (?)');

  for (const nombre of fs.readdirSync(CARPETA).filter(n => n.endsWith('.sql')).sort()) {
    if (aplicada.get(nombre)) continue;

    db.exec('BEGIN');
    try {
      db.exec(fs.readFileSync(path.join(CARPETA, nombre), 'utf8'));
      registrar.run(nombre);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

module.exports = { migrar };
