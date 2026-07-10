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

Backend local con Docker:

```bash
cp .env.example .env
# Edita .env y coloca tu password real de Neon.
docker compose up --build
```

Frontend local:

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

## Despliegue actual

### Backend local en Docker

El backend se ejecuta en tu computadora como imagen Docker y queda disponible en:

```text
http://localhost:8080/api
```

Comandos:

```bash
cp .env.example .env
# Edita .env y coloca DATABASE_PASSWORD.
docker compose up --build
```

El repositorio no guarda credenciales reales. El archivo `.env` queda solo en tu maquina.

### Frontend en Vercel

En Vercel importa el mismo repositorio y configura:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist/frontend/browser`

Si no defines `API_URL`, el build usa:

```text
http://localhost:8080/api
```

Para usar el frontend de Vercel, primero levanta Docker localmente y luego abre la web
desde esa misma computadora.

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
- Fecha manual de venta para registrar cuentas de dias anteriores.
- Descarga de imagen por venta y PDF con comprobantes del dia.
