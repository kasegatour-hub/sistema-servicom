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
3. El cambio se integra en `develop` para pruebas de desarrollo.
4. Una promoción controlada lleva el código a `testing`, donde se ejecutan nuevamente las pruebas y se revisan los flujos críticos: creación y actualización de envíos, rastreo, QR, firmas, recibos, contabilidad y separación de espacios de trabajo.
5. Solo después de aprobar testing se crea un pull request hacia `main`. La publicación de producción debe hacerse mediante un checkpoint aprobado, nunca con cambios manuales directos sobre la base productiva.

## Variables y bases de datos

Cada entorno debe utilizar sus propias variables de entorno. En particular, `DATABASE_URL`, `JWT_SECRET`, credenciales de OAuth, correo, almacenamiento y proveedores externos no deben copiarse entre fases. Los archivos `.env` no se deben subir al repositorio. Las migraciones de Drizzle se revisan primero en desarrollo, se aplican en testing y solo después se ejecutan en producción con respaldo y verificación previa.

La base de testing debe ser independiente de producción. No se deben ejecutar scripts de seed, pruebas destructivas ni migraciones experimentales contra la base productiva. Las pruebas automatizadas deben evitar crear notificaciones reales o mensajes externos.

## Protección de producción

`main` representa producción. Debe requerir revisión de pull request, comprobación de tests, TypeScript y build antes de integrar. Los checkpoints de Manus representan versiones publicables; por ello, antes de guardar uno se debe comprobar que el TODO esté cerrado, que las pruebas pasen y que no existan cambios de base de datos pendientes sin revisar.

## GitHub

El repositorio actual todavía utiliza el remoto interno de Manus y no tiene una sesión autenticada de GitHub disponible. Para conectar un repositorio GitHub real se necesita que el propietario autorice GitHub en la interfaz de Manus o inicie sesión con `gh auth login`; no se deben compartir tokens ni contraseñas por el chat. Una vez autorizada la cuenta, se puede crear o seleccionar un repositorio privado, subir el historial y configurar las ramas `develop`, `testing` y `main` con protección para `main`.

## Checklist de cada promoción

| Control | Desarrollo | Testing | Producción |
|---|---:|---:|---:|
| `pnpm check` | Obligatorio | Obligatorio | Obligatorio antes de promover |
| `pnpm test -- --run` | Obligatorio | Obligatorio | Evidencia del resultado de testing |
| `pnpm run build` | Obligatorio | Obligatorio | Obligatorio antes del checkpoint |
| Base de datos aislada | Sí | Sí | No aplica; es la real |
| Secretos reales | No | No, salvo credenciales de testing | Sí, gestionados por secretos |
| Revisión humana | Recomendable | Obligatoria | Obligatoria |

## Requisito pendiente del propietario

Para completar la conexión con GitHub falta autorizar la cuenta de GitHub que será propietaria del repositorio y confirmar el nombre del repositorio. La opción recomendada es un repositorio privado con un nombre como `servicom-internacional`.
