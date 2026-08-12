# Servicom Internacional - TODO

- [x] Actualizar branding corporativo a Servicom Internacional y RUC 20615004708
- [x] Implementar generación automática de órdenes (10 dígitos) y códigos de envío
- [x] Sistema de cálculo de tarifas (50 € base + 10 € adicionales)
- [x] Declaración Jurada completa y formato exacto LaTeX en el recibo impreso
- [x] Ticket de control para Torino, Italia
- [x] Explicar al usuario el cambio de hostname desde Settings → Domains

## Corrección del recibo imprimible
- [x] Cargar el logo de Servicom Internacional de forma segura dentro de la ventana del recibo
- [x] Evitar que about:blank aparezca en la vista o en la impresión del recibo
- [x] Validar la vista de impresión y el funcionamiento del botón Ver recibo

## Endurecimiento del flujo de impresión
- [x] Navegar a una ruta real /recibo antes de abrir el diálogo de impresión
- [x] Embebido del logo como Data URL con URL absoluta de respaldo
- [x] Esperar la carga de imágenes antes de imprimir
- [x] Añadir pruebas unitarias para URL de recibo y resolución del logo
