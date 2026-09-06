# Servicom Internacional

Sistema web full-stack para el registro, rastreo y gestión operativa de documentos, encomiendas, transferencias y servicios asociados de Servicom Internacional.

## Arquitectura general

Servicom Internacional utiliza una arquitectura cliente-servidor. El frontend React consume una API tipada mediante tRPC; el backend valida autenticación, permisos, datos personales, rutas, tarifas, servicios, pagos y firmas antes de persistir la información en la base de datos.

El modelo logístico es **Hub and Spoke**. Lima funciona como hub operativo, pero la interfaz utiliza dos campos independientes: **origen** y **destino**. Ambos campos permiten buscar sedes de Shalom, Olva, FedEx, DHL, empresas regionales, oficinas de Lima, sedes de Torino y otras ubicaciones registradas.

```text
Navegador / aplicación móvil web
              │
              ▼
Frontend React + TypeScript + Tailwind CSS
              │
              ▼
Hooks tRPC tipados bajo /api/trpc
              │
              ▼
Express + routers tRPC + validación Zod
              │
              ├── Drizzle ORM ── MySQL/TiDB
              ├── S3 ── documentos, fotos y archivos
              ├── Manus OAuth ── autenticación
              └── Integraciones ── BCRP, notificaciones y mapas
```

## Tecnologías elegidas

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | React 19 + TypeScript | Interfaz web, paneles, formularios y experiencia móvil responsive |
| Estilos | Tailwind CSS 4 | Diseño responsive, colores, espaciado y tokens visuales |
| Componentes | shadcn/ui, Radix UI | Diálogos, tablas, botones, formularios, selectores y accesibilidad |
| Build frontend | Vite | Servidor de desarrollo, HMR y compilación del cliente |
| Backend | Node.js 22 + Express 4 | Servidor HTTP, middleware, OAuth, almacenamiento y archivos estáticos |
| API | tRPC 11 | Contratos tipados entre frontend y backend |
| Validación | Zod | Validación de formularios, procedimientos y datos de entrada |
| ORM | Drizzle ORM | Consultas tipadas y migraciones de base de datos |
| Base de datos | MySQL/TiDB compatible | Persistencia de envíos, clientes, usuarios, pagos, firmas y contabilidad |
| Pruebas | Vitest + Testing Library | Pruebas unitarias, backend, componentes e integración |
| Repositorio | GitHub | Control de versiones, ramas, pull requests y respaldo |
| Integración continua | GitHub Actions | TypeScript, pruebas y build automático |

## Frontend

El frontend se encuentra en `client/src`. Las páginas principales están en `client/src/pages`, mientras que los componentes reutilizables están en `client/src/components`. La carpeta `client/src/components/ui` contiene componentes visuales basados en shadcn/ui y Radix UI.

La interfaz incluye la página pública de rastreo, lectura de QR, formularios administrativos, cuenta del cliente, gestión de envíos, selección independiente de origen y destino, documentos, encomiendas, transferencias, firmas electrónicas, recibos, tickets y contabilidad.

La comunicación con el backend se realiza mediante hooks de tRPC. Esto evita duplicar interfaces entre cliente y servidor y permite que los cambios en los procedimientos se reflejen en los tipos usados por los formularios.

## Backend

El backend se encuentra en `server`. Express expone el servidor HTTP y monta tRPC bajo `/api/trpc`. La entrada principal es `server/_core/index.ts`.

Los routers del backend separan las operaciones de autenticación, cuenta de cliente, administración, rastreo público, firmas, recibos, contabilidad, notificaciones, transferencias y configuración operativa. Los procedimientos verifican autenticación y roles antes de realizar operaciones sensibles.

El backend utiliza actualización parcial segura de envíos: cambiar únicamente el estado o el pago no debe borrar remitente, destinatario, teléfonos, documentos, notas ni datos de ruta existentes.

## Base de datos

La definición del esquema está en `drizzle/schema.ts`. Drizzle ORM proporciona el acceso tipado a una base de datos MySQL/TiDB compatible y las migraciones se gestionan desde la carpeta `drizzle`.

La tabla principal es `shipments`, que conserva la identificación del envío, remitente, destinatario, teléfonos, documentos, origen, destino, agencia, servicios, precios, moneda, pagos, firmas, notas, eventos y auditoría.

El sistema también utiliza tablas para administradores, cuentas de clientes, clientes persistentes, cartas de invitación, firmas, notificaciones, gastos contables y otros datos operativos. Los archivos binarios no se guardan dentro de la base de datos; se almacenan en S3 y la base conserva sus referencias y metadatos.

Las migraciones deben generarse y revisarse primero en desarrollo, aplicarse en testing y ejecutarse en producción únicamente después de validar compatibilidad y respaldo.

## Autenticación, roles y aislamiento

La autenticación de las cuentas integradas utiliza Manus OAuth. El contexto de cada solicitud se crea en el backend y está disponible para los procedimientos protegidos.

Los roles operativos incluyen `superadmin` y `registrador`. El sistema separa las capacidades de administración de usuarios, gestión de envíos, contabilidad y configuración. Los espacios de trabajo permiten mantener aislada la información de Servicom Internacional y de cuentas operativas asociadas como Kasega Tour y Magdalena según sus reglas de acceso.

## Precios y monedas

El sistema distingue las tarifas automáticas de los precios manuales. Para sedes o agencias externas, el administrador puede registrar un importe manual en **EUR, USD o PEN**. La moneda se persiste junto con el envío mediante `manualPriceCurrency`.

La moneda manual se respeta en creación, actualización, vista previa, notas, recibos, tickets, declaraciones juradas y reportes contables. Los ingresos contables se separan por moneda para evitar mezclar importes de EUR, USD y PEN.

Como regla general, los tramos internos de Perú utilizan PEN y las rutas internacionales utilizan EUR, salvo que exista un precio manual explícito. La conversión EUR/PEN utiliza la cotización BCRP configurada y la comisión definida por el negocio.

## Servicios y documentos

Apostilla, traducción y legalización están disponibles para las rutas documentales permitidas. Para sedes externas se utiliza un checklist buscable de servicios solicitados.

Los recibos, tickets y declaraciones juradas se generan a partir del envío vigente. Antes de descargar o imprimir, se recuperan los datos actualizados para reflejar el estado operativo, el estado de pago, las notas y las firmas electrónicas actuales.

## Pruebas y calidad

El proyecto utiliza Vitest y Testing Library para pruebas unitarias, backend, componentes e integración. La cobertura incluye rutas, origen y destino independientes, tarifas, precios multimoneda, roles, pagos, firmas, documentos, recibos, contabilidad, QR y permisos.

Los comandos principales son:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test -- --run
pnpm run build
```

## Entornos de desarrollo, testing y producción

El flujo de trabajo está dividido en tres fases:

| Entorno | Rama | Propósito |
|---|---|---|
| Desarrollo | `develop` | Crear funcionalidades y corregir errores en ramas `feature/*` |
| Testing | `testing` | Validar integración, regresiones, permisos y documentos |
| Producción | `main` | Contener únicamente versiones aprobadas y publicables |

GitHub Actions ejecuta TypeScript, pruebas y build en cada rama y pull request. La rama `main` está protegida y exige pull request, al menos una aprobación, actualización estricta de la rama base y ejecución exitosa del workflow `Tests, TypeScript y build`. Además, no permite force push ni eliminación de la rama.

Cada entorno debe mantener variables de entorno, credenciales y base de datos independientes. Nunca se deben subir archivos `.env`, tokens o contraseñas al repositorio. Las pruebas deben evitar notificaciones reales, mensajes externos y operaciones destructivas sobre producción.

## Repositorio

El código está respaldado en el repositorio público [kasegatour-hub/sistema-servicom](https://github.com/kasegatour-hub/sistema-servicom), con las ramas `develop`, `testing` y `main`.

Manus continúa gestionando la publicación web de la aplicación. GitHub funciona como repositorio, respaldo, control de cambios, revisión y automatización de calidad.

## Estructura principal

```text
client/
  src/
    pages/       páginas de la aplicación
    components/  componentes reutilizables
    lib/         precios, recibos, documentos y utilidades
    hooks/       hooks de frontend
    contexts/    estado y tema compartido
server/
  _core/         Express, OAuth, contexto y servicios base
  db.ts          helpers de persistencia
  routers.ts     routers tRPC principales
drizzle/
  schema.ts      esquema MySQL/TiDB
  migrations/    migraciones generadas
shared/           reglas y tipos compartidos
.github/
  workflows/     validaciones automáticas de GitHub Actions
docs/
  ENVIRONMENTS.md  operación de desarrollo, testing y producción
```

## Estado de referencia

La versión actual corresponde al sistema validado de Servicom Internacional. El último ciclo funcional registrado incluyó separación por entornos, integración con GitHub, protección de `main`, búsqueda independiente de origen y destino, precios manuales multimoneda, documentos actualizados y contabilidad por moneda.
