# Shalom Tracking Clone - TODO

## Base de Datos
- [x] Crear tabla de envíos (shipments) con campos: id, orderNumber, code, status, events, createdAt, updatedAt
- [x] Insertar datos de prueba para 352 099 2723 / CA06721WB con historial completo

## Backend (tRPC)
- [x] Crear procedimiento para buscar envío por número de orden y código
- [x] Crear procedimiento para generar QR dinámico por envío (implementado en frontend)
- [x] Crear procedimiento para obtener historial de eventos del envío

## Frontend - Componentes
- [x] Crear página Home con formulario de búsqueda
- [x] Crear componente de línea de tiempo (Timeline) con 5 etapas
- [x] Crear componente de escáner QR con acceso a cámara
- [x] Crear componente de visualización de QR generado
- [x] Crear página de resultado de rastreo

## Diseño y Estilos
- [x] Configurar colores corporativos (rojo Shalom #E31E24, blanco)
- [x] Implementar tipografía profesional y limpia (Google Fonts - Inter)
- [x] Agregar logo de Shalom (icono de paquete)
- [x] Optimizar diseño para móvil (mobile-first)
- [x] Asegurar responsividad en desktop

## Funcionalidades
- [x] Búsqueda de envíos por número de orden y código
- [x] Visualización de estado actual del envío
- [x] Línea de tiempo con etapas: Registrado → En origen → En tránsito → En destino → Entregado
- [x] Escáner QR funcional en web, Android e iOS (con jsQR)
- [x] Generación automática de QR por envío (con qrcode library)
- [x] Enlace directo desde QR a página de rastreo

## Testing
- [x] Pruebas del procedimiento de búsqueda (6 tests pasando)
- [x] Validación de campos requeridos
- [x] Verificación de estructura de datos
- [x] Pruebas de responsividad en móvil (verificado en viewport 375x812)
- [ ] Pruebas de escaneo QR en navegador (manual)
- [ ] Pruebas en dispositivos Android e iOS (manual)
