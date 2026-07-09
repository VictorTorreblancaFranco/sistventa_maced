# Bar D'maced POS

Sistema web separado en:

- `backend`: Java Spring Boot + PostgreSQL Neon.
- `frontend`: Angular 20 + SweetAlert2 + Lucide icons + exportacion de imagen/PDF.

Para este alcance se usa un monolito modular. Es suficiente porque productos, ventas, promociones,
pagos e historial pertenecen al mismo flujo operativo y comparten una sola base de datos.

## Acceso

- Usuario: `admin`
- Password: `Admin123@`

## Ejecutar

Backend:

```bash
cd backend
export JDBC_DATABASE_URL="jdbc:postgresql://host/db?sslmode=require&channel_binding=require"
export DATABASE_USERNAME="usuario"
export DATABASE_PASSWORD="password"
mvn spring-boot:run
```

Frontend:

```bash
cd frontend
npm start
```

Abrir:

```text
http://localhost:4200
```

## Base de datos

El backend usa Neon PostgreSQL por variables de entorno:

```bash
export JDBC_DATABASE_URL="jdbc:postgresql://host/db?sslmode=require"
export DATABASE_USERNAME="usuario"
export DATABASE_PASSWORD="password"
```

No se suben credenciales de Neon al repositorio.

## Despliegue

### Backend en Render

El backend esta preparado con `backend/Dockerfile` y `render.yaml`.

En Render crea un Web Service desde este repositorio. Puedes usar el Blueprint
(`render.yaml`) o crear el servicio manualmente con:

- Root directory: `backend`
- Environment: `Docker`
- Dockerfile path: `backend/Dockerfile`

Variables en Render:

```text
JDBC_DATABASE_URL=jdbc:postgresql://.../neondb?sslmode=require&channel_binding=require
DATABASE_USERNAME=neondb_owner
DATABASE_PASSWORD=...
ADMIN_USER=admin
ADMIN_PASSWORD=Admin123@
TOKEN_SECRET=un-texto-largo-seguro
CORS_ALLOWED_ORIGIN=https://tu-frontend.vercel.app
```

Render asigna `PORT` automaticamente y el backend lo lee.

### Frontend en Vercel

En Vercel importa el mismo repositorio y configura:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist/frontend/browser`

Variable en Vercel:

```text
API_URL=https://tu-backend.onrender.com/api
```

El build genera `public/env.js` con esa URL. En local, si no defines `API_URL`,
usa `http://localhost:8080/api`.

## Reglas implementadas

- Moneda en soles.
- Productos creados manualmente desde la pantalla Productos.
- Taper fijo: S/ 2.00.
- Vaso fijo: S/ 1.00.
- Al agregar taper o vaso, el pedido se marca para llevar.
- Promo 3x2 por toda la carta elegible o por seccion.
- En cada grupo de 3 productos elegibles se cobra `2 x precio del mas caro`.
- Combos y poncheras no entran a promocion.
- Pagos multiples con efectivo, Yape y Visa.
- Pagos parciales sobre una cuenta ya guardada.
- Historial diario, dashboard semanal/mensual y saldo pendiente.
- Descarga de imagen por venta y PDF con comprobantes del dia.
