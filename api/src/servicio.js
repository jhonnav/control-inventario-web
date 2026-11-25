'use strict';
// Reglas de negocio del inventario, independientes de HTTP y de la interfaz.
const db = require('./db');
const {
  validarProducto, validarMovimiento, normalizarCodigo
} = require('./validaciones');

class ErrorNegocio extends Error {
  constructor(estado, errores) {
    const lista = [].concat(errores);
    super(lista.join(' '));
    this.estado = estado;
    this.errores = lista;
  }
}

function exigirValido({ valido, errores, datos }) {
  if (!valido) throw new ErrorNegocio(400, errores);
  return datos;
}

// Regla: agotado sin unidades; stock bajo al llegar al mínimo del producto.
function estadoStock({ cantidad, stock_minimo }) {
  if (cantidad === 0) return 'Agotado';
  return cantidad <= stock_minimo ? 'Stock bajo' : 'Disponible';
}

const conEstado = producto => ({ ...producto, estado: estadoStock(producto) });

function buscar(codigo) {
  const producto = db.obtener(normalizarCodigo(codigo));
  if (!producto) throw new ErrorNegocio(404, 'Producto no encontrado.');
  return producto;
}

function conCategoria(datos) {
  const categoria = db.obtenerCategoria(datos.categoria);
  if (!categoria) throw new ErrorNegocio(400, 'Selecciona una categoría válida.');
  return { ...datos, categoriaId: categoria.id };
}

function sinDuplicados(operacion) {
  try {
    return operacion();
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed: productos.codigo')) {
      throw new ErrorNegocio(409,
        'Ya existe un producto con ese código (puede estar dado de baja).');
    }
    throw error;
  }
}

const listarProductos = () => db.listar().map(conEstado);
const obtenerProducto = codigo => conEstado(buscar(codigo));

function crearProducto(cuerpo) {
  const datos = conCategoria(exigirValido(validarProducto(cuerpo)));

  sinDuplicados(() => db.transaccion(() => {
    const id = db.insertarProducto(datos);
    // Regla: todo stock queda respaldado por un movimiento.
    if (datos.cantidad > 0) {
      db.insertarMovimiento(id,
        { tipo: 'ENTRADA', cantidad: datos.cantidad, motivo: 'Saldo inicial' },
        datos.cantidad);
    }
  }));

  return obtenerProducto(datos.codigo);
}

function editarProducto(codigo, cuerpo) {
  const actual = buscar(codigo);
  const datos = conCategoria(
    exigirValido(validarProducto(cuerpo, { esNuevo: false })));

  sinDuplicados(() => db.actualizarProducto(actual.id, datos));
  return obtenerProducto(datos.codigo);
}

// Regla: solo se da de baja un producto sin stock; su historial se conserva.
function darDeBaja(codigo) {
  const producto = buscar(codigo);
  if (producto.cantidad > 0) {
    throw new ErrorNegocio(409,
      'No se puede eliminar un producto con stock. Registra primero la salida de sus unidades.');
  }
  db.desactivarProducto(producto.id);
}

function registrarMovimiento(codigo, cuerpo) {
  const datos = exigirValido(validarMovimiento(cuerpo));

  db.transaccion(() => {
    const producto = buscar(codigo);
    const nuevoStock = producto.cantidad +
      (datos.tipo === 'ENTRADA' ? datos.cantidad : -datos.cantidad);

    if (nuevoStock < 0) {
      throw new ErrorNegocio(409,
        `Stock insuficiente: hay ${producto.cantidad} unidades disponibles.`);
    }
    if (nuevoStock > 999999) {
      throw new ErrorNegocio(409, 'El stock no puede superar 999999 unidades.');
    }

    db.actualizarStock(producto.id, nuevoStock);
    db.insertarMovimiento(producto.id, datos, nuevoStock);
  });

  return obtenerProducto(codigo);
}

const listarMovimientos = codigo => db.listarMovimientos(buscar(codigo).id);

module.exports = {
  ErrorNegocio, listarProductos, obtenerProducto, crearProducto,
  editarProducto, darDeBaja, registrarMovimiento, listarMovimientos,
  listarCategorias: db.listarCategorias
};
