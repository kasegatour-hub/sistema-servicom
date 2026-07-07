# Kasega Tours - Sistema de Rastreo de Encomiendas - TODO

## Base de Datos
- [x] Crear tabla de encomiendas con campos: id, orderNumber, code, status, events, createdAt, updatedAt
- [x] Actualizar estados a 3: En agencia, En tránsito, En destino
- [x] Agregar tabla de usuarios admin con autenticación
- [x] Crear datos de prueba para Kasega Tours

## Autenticación
- [x] Implementar login de admin con correo (Justina2025)
- [x] Crear sistema de sesión para admin
- [x] Proteger rutas de administración

## Panel de Administración
- [x] Crear página de admin dashboard
- [x] Formulario para crear nuevas encomiendas
- [x] Generación automática de QR al crear encomienda
- [x] Tabla de encomiendas con opción de editar estado
- [x] Actualizar estado: En agencia → En tránsito → En destino
- [x] Ver historial de cambios de estado
- [x] Descargar QR generado

## Branding Kasega Tours
- [x] Actualizar colores a azul y naranja de Kasega Tours
- [ ] Incorporar logo de Kasega Tours
- [ ] Incorporar logo de Servicom Internacional
- [x] Actualizar textos y descripción de la empresa
- [ ] Agregar información de contacto y descripción

## Frontend - Cliente
- [x] Búsqueda de encomiendas por número de orden y código
- [x] Visualización de estado actual
- [x] Enlace a panel de administración en header
- [x] Línea de tiempo con etapas
- [x] Escáner QR integrado
- [x] Generación de QR
- [ ] Actualizar a 3 estados: En agencia, En tránsito, En destino

## Testing
- [ ] Pruebas de autenticación de admin
- [ ] Pruebas de creación de encomiendas
- [ ] Pruebas de actualización de estado
- [ ] Pruebas de generación de QR
- [ ] Pruebas de responsividad
