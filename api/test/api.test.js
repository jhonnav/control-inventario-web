'use strict';

// Pruebas de integración de la API REST.
// Se utiliza SQLite en memoria para no modificar el inventario real.
process.env.DB_ARCHIVO = ':memory:';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const db = require('../src/db');

let servidor;
let url;

// Iniciar la API en un puerto disponible.
before(async () => {
  await new Promise((resolver) => {
    servidor = app.listen(0, '127.0.0.1', resolver);
  });

  url = `http://127.0.0.1:${servidor.address().port}/api/productos`;
});

// Cerrar el servidor y la base de datos al finalizar.
after(async () => {
  await new Promise((resolver, rechazar) => {
    servidor.close((error) =>
      error ? rechazar(error) : resolver()
    );
  });

  db.cerrar();
});

// Datos de ejemplo para las pruebas.
const producto = {
  codigo: 'P001',
  nombre: 'Teclado',
  categoria: 'Electrónica',
  cantidad: 10,
  precio: 15.50
};

// Al editar no se envía la cantidad.
const { cantidad, ...edicion } = producto;

// Función para enviar solicitudes HTTP.
const enviar = (metodo, ruta, datos) => fetch(url + ruta, {
  method: metodo,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(datos)
});

// Consultar el inventario vacío.
test('GET devuelve una lista vacía', async () => {
  const respuesta = await fetch(url);

  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), []);
});

// Registrar un producto válido.
test('POST registra un producto válido', async () => {
  const respuesta = await enviar('POST', '', producto);

  assert.equal(respuesta.status, 201);

  const datos = await respuesta.json();
  assert.equal(datos.codigo, 'P001');
  assert.equal(datos.nombre, 'Teclado');
});

// Rechazar datos inválidos.
test('POST rechaza datos inválidos', async () => {
  const respuesta = await enviar('POST', '', {
    codigo: '',
    nombre: '',
    categoria: 'No válida',
    cantidad: -5,
    precio: -10
  });

  assert.equal(respuesta.status, 400);

  const datos = await respuesta.json();
  assert.ok(datos.errores.length > 0);
});

// Rechazar códigos duplicados.
test('POST rechaza un código duplicado', async () => {
  const respuesta = await enviar('POST', '', producto);

  assert.equal(respuesta.status, 409);
});

// Consultar productos registrados.
test('GET devuelve los productos registrados', async () => {
  const respuesta = await fetch(url);

  assert.equal(respuesta.status, 200);

  const productos = await respuesta.json();

  assert.equal(productos.length, 1);
  assert.equal(productos[0].codigo, 'P001');
});

// Actualizar un producto.
test('PUT actualiza un producto', async () => {
  const respuesta = await enviar('PUT', '/P001', {
    ...edicion,
    precio: 18.50
  });

  assert.equal(respuesta.status, 200);

  const actualizado = await respuesta.json();

  assert.equal(actualizado.cantidad, 10);
  assert.equal(actualizado.precio, 18.50);
});

// Actualizar producto inexistente.
test('PUT devuelve 404 si no existe', async () => {
  const respuesta = await enviar('PUT', '/NOEXISTE', edicion);

  assert.equal(respuesta.status, 404);
});

test('GET consulta un producto por su código', async () => {
  const respuesta = await fetch(`${url}/P001`);

  assert.equal(respuesta.status, 200);
  assert.equal((await respuesta.json()).codigo, 'P001');
});

test('DELETE rechaza un producto con stock', async () => {
  const respuesta = await fetch(`${url}/P001`, { method: 'DELETE' });

  assert.equal(respuesta.status, 409);
});

test('POST de movimiento descuenta el stock', async () => {
  const respuesta = await enviar('POST', '/P001/movimientos', {
    tipo: 'SALIDA', cantidad: 10, motivo: 'Entrega'
  });

  assert.equal(respuesta.status, 201);
  assert.equal((await respuesta.json()).cantidad, 0);
});

test('POST rechaza JSON mal formado', async () => {
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{mal'
  });

  assert.equal(respuesta.status, 400);
});

// Eliminar un producto.
test('DELETE elimina un producto', async () => {
  const respuesta = await fetch(`${url}/P001`, {
    method: 'DELETE'
  });

  assert.equal(respuesta.status, 204);
});

// Eliminar producto inexistente.
test('DELETE devuelve 404 si no existe', async () => {
  const respuesta = await fetch(`${url}/P001`, {
    method: 'DELETE'
  });

  assert.equal(respuesta.status, 404);
});