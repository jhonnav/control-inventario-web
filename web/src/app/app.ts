import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  Producto,
  NuevoProducto,
  Movimiento,
  ProductoApi
} from './Producto-api';

type Vista = 'inicio' | 'registro' | 'consulta' | 'movimientos';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {

  private readonly api = inject(ProductoApi);
  private readonly fb = inject(FormBuilder);

  // Estado de la aplicación
  protected readonly categorias = signal<string[]>([]);
  protected readonly seleccionado = signal<Producto | null>(null);
  protected readonly historial = signal<Movimiento[]>([]);
  protected readonly vista = signal<Vista>('inicio');
  protected readonly productos = signal<Producto[]>([]);
  protected readonly busqueda = signal('');
  protected readonly codigoEnEdicion = signal<string | null>(null);

  protected readonly mensaje = signal('');
  protected readonly esError = signal(false);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);

  // Estadísticas del inventario
  protected readonly totalUnidades = computed(() =>
    this.productos().reduce(
      (total, producto) => total + producto.cantidad,
      0
    )
  );

  protected readonly stockBajo = computed(() =>
    this.productos().filter(
      producto => producto.estado !== 'Disponible'
    ).length
  );

  // Filtrar productos por código o nombre
  protected readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();

    return this.productos().filter(producto =>
      producto.codigo.toLowerCase().includes(texto) ||
      producto.nombre.toLowerCase().includes(texto)
    );
  });

  // Formulario reactivo
  protected readonly formulario = this.fb.nonNullable.group({
    codigo: ['', [
      Validators.required,
      Validators.maxLength(30),
      Validators.pattern(/^\s*[A-Za-z0-9_-]+\s*$/)
    ]],

    nombre: ['', [
      Validators.required,
      Validators.maxLength(100),
      Validators.pattern(/.*\S.*/)
    ]],

    categoria: ['', Validators.required],

    cantidad: [0, [
      Validators.required,
      Validators.min(0),
      Validators.max(999999),
      Validators.pattern(/^\d+$/)
    ]],

    stock_minimo: [3, [
      Validators.required,
      Validators.min(0),
      Validators.max(999999),
      Validators.pattern(/^\d+$/)
    ]],

    precio: [0, [
      Validators.required,
      Validators.min(0),
      Validators.max(99999999),
      Validators.pattern(/^\d+(\.\d{1,2})?$/)
    ]]
  });

  protected readonly formMovimiento = this.fb.nonNullable.group({
    tipo: this.fb.nonNullable.control<'ENTRADA' | 'SALIDA'>(
      'ENTRADA', Validators.required),
    cantidad: [1, [
      Validators.required,
      Validators.min(1),
      Validators.max(999999),
      Validators.pattern(/^\d+$/)
    ]],
    motivo: ['', [
      Validators.required,
      Validators.maxLength(150),
      Validators.pattern(/.*\S.*/)
    ]]
  });

  // Cargar datos al iniciar
  ngOnInit(): void {
    this.cargar();
    this.api.categorias().subscribe({
      next: lista => this.categorias.set(lista.map(c => c.nombre)),
      error: () => this.mostrar('No se pudieron cargar las categorías.', true)
    });
  }

  // Cambiar de pantalla
  protected navegar(destino: Vista): void {
    if (destino === 'registro') {
      this.limpiar();
    }

    this.vista.set(destino);
    this.mensaje.set('');
  }

  // Mostrar mensajes al usuario
  protected mostrar(texto: string, error = false): void {
    this.mensaje.set(texto);
    this.esError.set(error);
  }

  // GET: cargar productos desde la API
  protected cargar(): void {
    this.cargando.set(true);

    this.api.listar().subscribe({
      next: productos => {
        this.productos.set(productos);
        this.cargando.set(false);
      },

      error: () => {
        this.cargando.set(false);
        this.mostrar(
          'No se pudo conectar con la API. Verifica el servidor Express.',
          true
        );
      }
    });
  }

  // Limpiar el formulario
  protected limpiar(): void {
    this.codigoEnEdicion.set(null);
    this.formulario.controls.cantidad.enable();

    this.formulario.reset({
      codigo: '',
      nombre: '',
      categoria: '',
      cantidad: 0,
      stock_minimo: 3,
      precio: 0
    });

    this.formulario.markAsPristine();
    this.formulario.markAsUntouched();
  }

  // Cargar datos de un producto para editarlo
  protected editar(producto: Producto): void {
    this.codigoEnEdicion.set(producto.codigo);

    this.formulario.reset({
      codigo: producto.codigo,
      nombre: producto.nombre,
      categoria: producto.categoria,
      cantidad: producto.cantidad,
      stock_minimo: producto.stock_minimo,
      precio: producto.precio
    });
    // El stock solo cambia mediante movimientos.
    this.formulario.controls.cantidad.disable();

    this.vista.set('registro');
    this.mensaje.set('');
  }

  // POST o PUT: guardar producto
  protected guardar(): void {
    if (this.formulario.invalid || this.guardando()) {
      this.formulario.markAllAsTouched();
      this.mostrar('Revisa los datos del formulario.', true);
      return;
    }

    const valores = this.formulario.getRawValue();

    const datos: NuevoProducto = {
      codigo: valores.codigo.trim().toUpperCase(),
      nombre: valores.nombre.trim(),
      categoria: valores.categoria,
      stock_minimo: valores.stock_minimo,
      precio: valores.precio
    };

    const original = this.codigoEnEdicion();

    if (original === null) {
      datos.cantidad = valores.cantidad;
    }

    const solicitud = original === null
      ? this.api.agregar(datos)
      : this.api.actualizar(original, datos);

    this.guardando.set(true);

    solicitud.subscribe({
      next: () => {
        this.guardando.set(false);
        this.limpiar();
        this.vista.set('consulta');

        this.mostrar(
          original === null
            ? 'Producto registrado correctamente.'
            : 'Producto actualizado correctamente.'
        );

        this.cargar();
      },

      error: (respuesta: HttpErrorResponse) => {
        this.guardando.set(false);
        this.mostrar(this.erroresApi(respuesta), true);
      }
    });
  }

  // DELETE: eliminar producto
  protected eliminar(producto: Producto): void {
    const confirmado = window.confirm(
      `¿Deseas eliminar el producto "${producto.nombre}"?`
    );

    if (!confirmado) return;

    this.api.eliminar(producto.codigo).subscribe({
      next: () => {
        this.mostrar('Producto eliminado correctamente.');
        this.cargar();
      },

      error: (respuesta: HttpErrorResponse) => {
        this.mostrar(this.erroresApi(respuesta), true);
      }
    });
  }

  // Pantalla de entradas, salidas e historial
  protected verMovimientos(producto: Producto): void {
    this.seleccionado.set(producto);
    this.historial.set([]);
    this.formMovimiento.reset();
    this.mensaje.set('');
    this.vista.set('movimientos');
    this.cargarHistorial(producto.codigo);
  }

  private cargarHistorial(codigo: string): void {
    this.api.movimientos(codigo).subscribe({
      next: lista => {
        // Ignora respuestas de un producto que ya no está en pantalla.
        if (this.seleccionado()?.codigo === codigo) {
          this.historial.set(lista);
        }
      },
      error: (respuesta: HttpErrorResponse) =>
        this.mostrar(this.erroresApi(respuesta), true)
    });
  }

  protected guardarMovimiento(): void {
    const producto = this.seleccionado();
    if (!producto || this.guardando()) return;

    if (this.formMovimiento.invalid) {
      this.formMovimiento.markAllAsTouched();
      this.mostrar('Revisa los datos del movimiento.', true);
      return;
    }

    const valores = this.formMovimiento.getRawValue();
    this.guardando.set(true);

    this.api.registrarMovimiento(producto.codigo, {
      ...valores,
      motivo: valores.motivo.trim()
    }).subscribe({
      next: actualizado => {
        this.guardando.set(false);
        this.seleccionado.set(actualizado);
        this.formMovimiento.reset();
        this.mostrar('Movimiento registrado correctamente.');
        this.cargarHistorial(actualizado.codigo);
        this.cargar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.guardando.set(false);
        this.mostrar(this.erroresApi(respuesta), true);
      }
    });
  }

  // Interpretar errores de Express
  private erroresApi(respuesta: HttpErrorResponse): string {
    const errores = respuesta.error?.errores;

    if (
      Array.isArray(errores) &&
      errores.every(error => typeof error === 'string')
    ) {
      return errores.join(' ');
    }

    return 'No se pudo completar la operación.';
  }
}