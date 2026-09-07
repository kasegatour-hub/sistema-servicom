# Entornos de Servicom Internacional

## Objetivo

El proyecto se organiza en tres fases separadas: **desarrollo**, **testing** y **producción**. Cada fase tiene un propósito, una fuente de configuración y un criterio de promoción distinto. La producción no debe recibir cambios directos desde el equipo de desarrollo.

| Fase | Propósito | Datos permitidos | Entrada de cambios |
|---|---|---|---|
| Desarrollo | Crear y modificar funcionalidades localmente | Datos ficticios o una base aislada | Ramas `feature/*` y `develop` |
| Testing | Validar integración, permisos, documentos, precios y regresiones | Base de testing separada; nunca datos reales sin autorización | Pull request aprobado hacia `testing` |
| Producción | Operación real de Servicom Internacional | Base de producción y secretos reales | Promoción aprobada desde `testing` hacia `main` |

## Flujo de promoción

1. El trabajo comienza en una rama `feature/<descripcion>` derivada de `develop`.
2. La rama se prueba localmente con `pnpm check`, `pnpm test -- --run` y `pnpm run build`.
3. El cambio se integra primero en `develop`, que es el único destino inicial de cada nueva funcionalidad.
4. Tras superar las validaciones de desarrollo, se abre un pull request exclusivamente de `develop` hacia `testing`. En testing se repiten las pruebas y se revisan los flujos críticos: creación y actualización de envíos, rastreo, QR, firmas, recibos, contabilidad y separación de espacios de trabajo.
5. Solo después de aprobar `testing` se abre un pull request exclusivamente de `testing` hacia `main`. La publicación de producción debe hacerse mediante un checkpoint aprobado, nunca con cambios manuales directos sobre la base productiva.

## Variables y bases de datos

Cada entorno debe utilizar sus propias variables de entorno. En particular, `DATABASE_URL`, `JWT_SECRET`, credenciales de OAuth, correo, almacenamiento y proveedores externos no deben copiarse entre fases. Los archivos `.env` no se deben subir al repositorio. Las migraciones de Drizzle se revisan primero en desarrollo, se aplican en testing y solo después se ejecutan en producción con respaldo y verificación previa.

La base de testing debe ser independiente de producción. No se deben ejecutar scripts de seed, pruebas destructivas ni migraciones experimentales contra la base productiva. Las pruebas automatizadas deben evitar crear notificaciones reales o mensajes externos.

## Protección de producción

`main` representa producción. Debe requerir revisión de pull request, comprobación de tests, TypeScript y build antes de integrar. Los checkpoints de Manus representan versiones publicables; por ello, antes de guardar uno se debe comprobar que el TODO esté cerrado, que las pruebas pasen y que no existan cambios de base de datos pendientes sin revisar.

## GitHub

El proyecto está conectado al repositorio [kasegatour-hub/sistema-servicom](https://github.com/kasegatour-hub/sistema-servicom), con las ramas `develop`, `testing` y `main`. GitHub Actions ejecuta pruebas reproducibles, TypeScript y build en cada rama y pull request. La rama `main` representa producción y debe recibir únicamente pull requests provenientes de `testing`; `testing` debe recibir únicamente pull requests provenientes de `develop`. No se deben compartir tokens ni contraseñas por el chat y los secretos deben mantenerse en la configuración segura de cada entorno.

## Checklist de cada promoción

| Control | Desarrollo | Testing | Producción |
|---|---:|---:|---:|
| `pnpm check` | Obligatorio | Obligatorio | Obligatorio antes de promover |
| `pnpm test -- --run` | Obligatorio | Obligatorio | Evidencia del resultado de testing |
| `pnpm run build` | Obligatorio | Obligatorio | Obligatorio antes del checkpoint |
| Base de datos aislada | Sí | Sí | No aplica; es la real |
| Secretos reales | No | No, salvo credenciales de testing | Sí, gestionados por secretos |
| Revisión humana | Recomendable | Obligatoria | Obligatoria |

## Regla operativa permanente

A partir de esta versión, ningún cambio se publica directamente en producción. El orden obligatorio es `feature/*` → `develop` → `testing` → `main`/producción. Si un cambio falla en desarrollo o testing, debe corregirse en una nueva rama de trabajo y volver a recorrer el flujo completo.
