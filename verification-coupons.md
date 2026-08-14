# Verificación responsive de estado de pago, recibos y cupones

Fecha de verificación: 14 de agosto de 2026.

Las capturas de escritorio y móvil confirmaron que el inicio administrativo conserva el enlace visible «Volver al inicio», que el home mantiene el rastreo público y que `/recibo` mantiene una salida clara «Volver al rastreo» sin mostrar `about:blank`. En 375 px, el encabezado de Admin se ajusta a dos líneas sin desbordar y el formulario de rastreo separa correctamente los campos de orden, código, botón de rastreo y lector QR.

La vista del recibo sin parámetros muestra un aviso legible solicitando orden y código, con branding de Servicom Internacional y sin credenciales precargadas. El contenido completo del recibo, el ticket recortable y el color de cada estado de pago se verificaron adicionalmente mediante las pruebas de HTML de los helpers de recibos.
