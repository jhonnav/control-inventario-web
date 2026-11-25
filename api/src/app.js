'use strict';
// Capa HTTP: define las rutas y delega las reglas en el servicio.
const express = require('express');
const cors = require('cors');
const { corsOrigenes } = require('./config');
const servicio = require('./servicio');

const app = express();
app.use(cors({ origin: corsOrigenes }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/categorias', (req, res) => {
  res.json(servicio.listarCategorias());
});

app.get('/api/productos', (req, res) => {
  res.json(servicio.listarProductos());
});

app.get('/api/productos/:codigo', (req, res) => {
  res.json(servicio.obtenerProducto(req.params.codigo));
});

app.post('/api/productos', (req, res) => {
  res.status(201).json(servicio.crearProducto(req.body));
});

app.put('/api/productos/:codigo', (req, res) => {
  res.json(servicio.editarProducto(req.params.codigo, req.body));
});

app.delete('/api/productos/:codigo', (req, res) => {
  servicio.darDeBaja(req.params.codigo);
  res.status(204).end();
});

app.get('/api/productos/:codigo/movimientos', (req, res) => {
  res.json(servicio.listarMovimientos(req.params.codigo));
});

app.post('/api/productos/:codigo/movimientos', (req, res) => {
  res.status(201).json(
    servicio.registrarMovimiento(req.params.codigo, req.body));
});

app.use((req, res) => {
  res.status(404).json({ errores: ['Ruta no encontrada.'] });
});

// Manejo centralizado de errores.
app.use((error, req, res, next) => {
  if (error instanceof servicio.ErrorNegocio) {
    return res.status(error.estado).json({ errores: error.errores });
  }
  if (error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({
      errores: ['La solicitud no tiene un formato JSON válido.']
    });
  }
  console.error(error);
  return res.status(500).json({ errores: ['Error interno del servidor.'] });
});

module.exports = app;
