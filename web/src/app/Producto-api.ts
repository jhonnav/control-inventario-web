import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Estructura de un producto registrado
export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  stock_minimo: number;
  precio: number;
  estado: 'Disponible' | 'Stock bajo' | 'Agotado';
}

// Datos para registrar o actualizar.
// La cantidad solo se envía al registrar.
export interface NuevoProducto {
  codigo: string;
  nombre: string;
  categoria: string;
  cantidad?: number;
  stock_minimo: number;
  precio: number;
}

export interface Categoria {
  id: number;
  nombre: string;
}

export interface NuevoMovimiento {
  tipo: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  motivo: string;
}

export interface Movimiento extends NuevoMovimiento {
  id: number;
  stock_resultante: number;
  fecha: string;
}

declare global {
  interface Window {
    APP_CONFIG?: { apiUrl?: string };
  }
}

@Injectable({
  providedIn: 'root'
})
export class ProductoApi {

  private readonly http = inject(HttpClient);

  private readonly base =
    window.APP_CONFIG?.apiUrl ?? 'http://localhost:3000/api';
  private readonly url = `${this.base}/productos`;

  categorias() {
    return this.http.get<Categoria[]>(`${this.base}/categorias`);
  }

  movimientos(codigo: string) {
    return this.http.get<Movimiento[]>(
      `${this.url}/${encodeURIComponent(codigo)}/movimientos`
    );
  }

  registrarMovimiento(codigo: string, movimiento: NuevoMovimiento) {
    return this.http.post<Producto>(
      `${this.url}/${encodeURIComponent(codigo)}/movimientos`,
      movimiento
    );
  }

  // GET: Obtener todos los productos
  listar() {
    return this.http.get<Producto[]>(this.url);
  }

  // GET: Obtener un producto por su código
  obtener(codigo: string) {
    return this.http.get<Producto>(
      `${this.url}/${encodeURIComponent(codigo)}`
    );
  }

  // POST: Registrar un producto
  agregar(producto: NuevoProducto) {
    return this.http.post<Producto>(
      this.url,
      producto
    );
  }

  // PUT: Actualizar un producto existente
  actualizar(codigo: string, producto: NuevoProducto) {
    return this.http.put<Producto>(
      `${this.url}/${encodeURIComponent(codigo)}`,
      producto
    );
  }

  // DELETE: Eliminar un producto
  eliminar(codigo: string) {
    return this.http.delete<void>(
      `${this.url}/${encodeURIComponent(codigo)}`
    );
  }
}