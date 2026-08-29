# Entornos y respaldo de Servicom Internacional

## Objetivo

El proyecto debe operar con tres entornos independientes: **development**, **testing** y **production**. La separación evita que una corrección urgente o una migración de esquema se pruebe directamente sobre los datos reales de clientes.

## Flujo de ramas

| Entorno | Rama recomendada | Propósito | Base de datos |
|---|---|---|---|
| Development | `develop` | Trabajo diario, cambios de interfaz y desarrollo de funcionalidades | Base de desarrollo, con datos sintéticos o anonimizados |
| Testing | `staging` | Pruebas de integración, regresión, aceptación y migraciones | Base de testing separada |
| Production | `main` | Versión pública estable | Base de producción actual, nunca compartida con testing |

Los cambios deben entrar a `develop` mediante revisión cuando sea posible. Cuando las pruebas automáticas sean correctas, se promocionan a `staging`. Solo una versión validada en `staging` debe llegar a `main` mediante un Pull Request aprobado. Las migraciones de base de datos se revisan primero, se prueban en testing y se aplican a producción en un paso controlado.

## Variables y secretos

Cada entorno debe tener sus propios secretos fuera del repositorio. El repositorio puede contener únicamente un archivo `.env.example` sin valores reales. Nunca deben subirse `DATABASE_URL`, `JWT_SECRET`, credenciales OAuth, claves de correo, Twilio, almacenamiento, analítica, tokens de GitHub ni contraseñas de usuarios.

| Entorno | Secretos mínimos independientes |
|---|---|
| Development | `DATABASE_URL`, `JWT_SECRET`, OAuth de desarrollo y credenciales de servicios de desarrollo |
| Testing | `DATABASE_URL`, `JWT_SECRET`, OAuth de testing y credenciales de servicios de prueba |
| Production | `DATABASE_URL`, `JWT_SECRET`, OAuth y credenciales reales de producción |

Las cuentas de GitHub Actions deben recibir solamente los secretos del entorno que ejecutan. La base de testing no debe ser una copia directa de producción; si se necesita información representativa, debe anonimizarse antes de exportarla.

## Respaldo recomendado

El respaldo tiene dos partes independientes. GitHub respalda el **código, las migraciones y la documentación**. La base de datos y los archivos de clientes necesitan una copia independiente, cifrada y con retención. Para producción se recomienda conservar copias diarias, una copia semanal y una copia mensual, además de comprobar periódicamente que una restauración sea posible. No se debe guardar un volcado de producción dentro del repositorio GitHub.

El remoto actual del proyecto es el repositorio interno de Manus. Para usar GitHub se debe crear o seleccionar un repositorio privado de Kasega Tour, autorizar la conexión y sustituir el remoto solamente después de verificar que el repositorio esté vacío o que su contenido sea el correcto. No se debe sobrescribir un repositorio existente sin confirmación.

## Incidente de hoy

El incidente investigado fue un rechazo de inserción al crear un envío. El formulario sí entregaba el teléfono peruano válido y la tarifa automática, pero una restricción global de unicidad sobre `orderNumber` chocó con una orden usada en otro entorno. La corrección cambió la unicidad a la pareja `orderNumber + code`, manteniendo los datos existentes. La suite actual quedó validada con 459 pruebas, TypeScript y build correctos.

## Lista de preparación antes de conectar GitHub

1. Confirmar el nombre de usuario u organización que será propietaria del repositorio.
2. Crear el repositorio como **privado** y activar protección de la rama `main`.
3. Autorizar GitHub mediante OAuth; no compartir contraseña ni token por el chat.
4. Configurar los tres entornos de GitHub Actions y sus secretos independientes.
5. Hacer el primer push después de revisar que `.env`, bases de datos, fotos, PDFs privados y archivos temporales estén excluidos.
6. Probar un Pull Request desde `develop` hasta `staging` y luego una promoción controlada a `main`.
