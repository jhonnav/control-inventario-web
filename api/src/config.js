'use strict';
// Configuración separada del código: se lee desde variables de entorno.
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const archivo = process.env.DB_ARCHIVO || 'inventario.db';

module.exports = {
  host: process.env.HOST || '127.0.0.1',
  puerto: Number(process.env.PORT || 3000),
  dbArchivo: archivo === ':memory:' ? archivo : path.resolve(raiz, archivo),
  corsOrigenes: (process.env.CORS_ORIGIN || 'http://localhost:4200')
    .split(',')
    .map(origen => origen.trim())
    .filter(Boolean)
};
