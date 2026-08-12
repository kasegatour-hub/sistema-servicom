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

## Dominio Personalizado
- [x] Confirmar dominio: servicominternacional.pe
- [x] Vincular el dominio desde Settings → Domains en la interfaz de gestión (dominio confirmado: servicominternacional.pe)
- [x] Configurar los registros DNS (CNAME/A) en el registrador de dominios

## Nuevos Requerimientos
- [x] Corregir el botón Actualizar en el panel de administración
- [x] Selector de país e indicativo telefónico en formularios de registro
- [x] Incluir condición de pago (Pagado en Lima / Pagará en Italia)
- [x] Incluir código completo y celular de la destinataria en el ticket de Torino del recibo

## Etiquetas de ordenamiento
- [x] Cambiar Ascendente/Descendente por Recientes (descendentes) y Antiguos (ascendente) en el panel admin

## Estado Inicial y Colores de Pago
- [x] Forzar estado 'En agencia' para registros de cliente
- [x] Mostrar condición de pago en verde (Pagado en Lima) y rojo (Pagará en Torino) en cliente, admin y recibos

## Límites de Hojas y Validación
- [x] Aplicar límite máximo de 8 hojas para documentos simples y 10 para apostillados
- [x] Mostrar mensaje 'Debe crear otra encomienda' al exceder el límite

## Nuevos Requerimientos de Roles y Direcciones
- [x] Distinguir Master Admin (gestión de usuarios y envíos) y Usuario Registrador (gestión de envíos sin crear usuarios)
- [x] Permitir al cliente elegir únicamente 'Pagará en Torino' o 'En agencia' (requisito anterior; posteriormente reemplazado por pago automático pendiente)
- [x] Permitir a Master y Usuario editar el estado de pago (Pagado / Falta cancelar)
- [x] Añadir selector de ruta predeterminada (Lima - Torino / Torino - Lima) y direcciones con búsqueda de Google Maps o manual

## Estado Inicial "Por entregar en agencia"
- [x] Actualizar base de datos, backend y frontend para usar 'Por entregar en agencia' en lugar de 'En agencia' como estado inicial de cliente

## Ajuste de pago automático para clientes
- [x] Eliminar del formulario del cliente la selección de pago y crear envíos automáticamente con estado de pago 'Falta cancelar'
- [x] Permitir que solo Master Admin/Registrador cambien el estado de pago a 'Pagado' o 'Falta cancelar'
- [x] Mostrar al cliente el estado 'Falta cancelar' en rojo y 'Pagado' en verde en sus envíos y recibos
- [x] Añadir pruebas para validar el pago automático del cliente y la visualización por color

## Validación de datos personales
- [x] Validar en backend que nombres y apellidos solo contengan letras y espacios, y que los DNI solo contengan números
- [x] Aplicar filtros de entrada y mensajes claros en los formularios de cliente y administración
- [x] Añadir pruebas para rechazar nombres con números y DNI con letras

## Mensajes visibles de validación
- [x] Añadir textos de ayuda visibles en formularios de cliente y administración para nombres, apellidos y DNI
- [x] Mostrar errores inline específicos cuando los datos personales no cumplan el formato permitido

## Cobertura adicional requerida antes del checkpoint
- [x] Añadir prueba backend del procedimiento account.createMyShipment para verificar que siempre fuerza paymentStatus 'Falta cancelar' y no acepta selección de pago
- [x] Añadir pruebas de presentación rojo/verde para cliente y recibo
- [x] Hacer que los errores inline de nombres y DNI se activen ante un intento inválido, sin depender únicamente del filtrado silencioso
- [x] Añadir errores inline específicos al formulario de registro de cuenta del cliente

## Verificación final del flujo real de pago
- [x] Ejecutar una prueba del procedimiento account.createMyShipment y verificar que la persistencia usa paymentStatus 'Falta cancelar'
- [x] Añadir una utilidad compartida para la presentación de pago en AccountPage y probar sus clases rojo/verde
