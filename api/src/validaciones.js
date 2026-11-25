'use strict';
// Validación del formato de los datos que recibe la API.

const MAXIMO = 999999;
const PATRON_CODIGO = /^[A-Z0-9_-]{1,30}$/;

const texto = valor => (typeof valor === 'string' ? valor.trim() : '');
const normalizarCodigo = valor => texto(valor).toUpperCase();

// Acepta un número o un texto numérico; rechaza booleanos, listas y objetos.
function numero(valor, patron) {
  if (typeof valor !== 'number' && typeof valor !== 'string') return NaN;
  return patron.test(String(valor).trim()) ? Number(valor) : NaN;
}
const entero = valor => numero(valor, /^\d+$/);
const decimal = valor => numero(valor, /^\d+(\.\d{1,2})?$/);

const objeto = valor =>
  valor !== null && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};

function validarProducto(cuerpo, { esNuevo = true } = {}) {
  const entrada = objeto(cuerpo);
  const datos = {
    codigo: normalizarCodigo(entrada.codigo),
    nombre: texto(entrada.nombre),
    categoria: texto(entrada.categoria),
    stock_minimo: entero(entrada.stock_minimo ?? 3),
    precio: decimal(entrada.precio)
  };
  const errores = [];

  if (!PATRON_CODIGO.test(datos.codigo)) {
    errores.push('El código debe tener de 1 a 30 caracteres: letras sin tilde, números, guion o guion bajo.');
  }
  if (!datos.nombre || datos.nombre.length > 100) {
    errores.push('El nombre debe tener entre 1 y 100 caracteres.');
  }
  if (!datos.categoria) {
    errores.push('Selecciona una categoría válida.');
  }
  if (!(datos.stock_minimo <= MAXIMO)) {
    errores.push('El stock mínimo debe ser un número entero entre 0 y 999999.');
  }
  if (!(datos.precio <= 99999999)) {
    errores.push('El precio debe ser válido, no negativo y tener máximo dos decimales.');
  }

  if (esNuevo) {
    datos.cantidad = entero(entrada.cantidad);
    if (!(datos.cantidad <= MAXIMO)) {
      errores.push('La cantidad debe ser un número entero entre 0 y 999999.');
    }
  } else if (entrada.cantidad !== undefined) {
    errores.push('La cantidad solo se modifica mediante movimientos.');
  }

  return { valido: errores.length === 0, errores, datos };
}

function validarMovimiento(cuerpo) {
  const entrada = objeto(cuerpo);
  const datos = {
    tipo: texto(entrada.tipo).toUpperCase(),
    cantidad: entero(entrada.cantidad),
    motivo: texto(entrada.motivo)
  };
  const errores = [];

  if (!['ENTRADA', 'SALIDA'].includes(datos.tipo)) {
    errores.push('El tipo debe ser ENTRADA o SALIDA.');
  }
  if (!(datos.cantidad >= 1 && datos.cantidad <= MAXIMO)) {
    errores.push('La cantidad del movimiento debe ser un entero entre 1 y 999999.');
  }
  if (!datos.motivo || datos.motivo.length > 150) {
    errores.push('El motivo debe tener entre 1 y 150 caracteres.');
  }

  return { valido: errores.length === 0, errores, datos };
}

module.exports = { validarProducto, validarMovimiento, normalizarCodigo };
