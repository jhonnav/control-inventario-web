# Stock Pilot - Control de inventario

Aplicación web local para controlar productos, entradas, salidas y stock bajo.

**Tecnologías:** Angular, Express y SQLite (`node:sqlite`).

## Requisitos

- Node.js 22.22.3 o superior de la línea 22, o una versión compatible con Angular 22
  (ver https://angular.dev/reference/versions)
- npm y Git

## 1. API

```bash
cd api
npm ci
cp .env.example .env
npm start
```

En CMD de Windows usa `copy .env.example .env`.
La API queda en http://localhost:3000/api/productos.
La base de datos y las tablas se crean al iniciar mediante las migraciones de `api/migrations`.

## 2. Frontend (en otra terminal)

```bash
cd web
npm ci
npm start
```

Abre http://localhost:4200.

## Configuración

| Variable (`api/.env`) | Uso                                       | Valor por defecto       |
| --------------------- | ----------------------------------------- | ----------------------- |
| `HOST`                | Interfaz de red                           | `127.0.0.1`             |
| `PORT`                | Puerto de la API                          | `3000`                  |
| `DB_ARCHIVO`          | Archivo SQLite, relativo a `api`          | `inventario.db`         |
| `CORS_ORIGIN`         | Orígenes autorizados, separados por comas | `http://localhost:4200` |

La dirección de la API para el frontend está en `web/public/config.js`.

## Restricciones

- El código es único (letras sin tilde, números, `-` y `_`).
- El stock cambia solo mediante entradas y salidas, y nunca es negativo ni mayor que 999999.
- Cada cambio de stock queda en el historial, incluido el saldo inicial.
- Cada producto tiene un stock mínimo. Estados: Agotado (0), Stock bajo (hasta el mínimo) y Disponible.
- Solo se elimina un producto sin stock. Es una baja lógica: el historial se conserva y el código no se reutiliza.

## API

| Método | Ruta                                 | Función                    |
| ------ | ------------------------------------ | -------------------------- |
| GET    | `/api/categorias`                    | Listar categorías          |
| GET    | `/api/productos`                     | Listar productos           |
| GET    | `/api/productos/:codigo`             | Consultar un producto      |
| POST   | `/api/productos`                     | Registrar                  |
| PUT    | `/api/productos/:codigo`             | Editar (sin cantidad)      |
| DELETE | `/api/productos/:codigo`             | Dar de baja                |
| GET    | `/api/productos/:codigo/movimientos` | Historial                  |
| POST   | `/api/productos/:codigo/movimientos` | Registrar entrada o salida |

## Pruebas

```bash
cd api && npm test
cd web && npm test -- --watch=false
```

## Datos de una versión anterior

Para conservar un `inventario.db` antiguo, haz primero una copia de respaldo y colócalo en `api/`.
La migración lo convierte al nuevo modelo al iniciar.
