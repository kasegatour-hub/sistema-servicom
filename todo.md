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

## Rediseño administrativo solicitado
- [x] Renombrar visualmente el estado de pago pendiente a 'No cancelado' para el cliente y conservar compatibilidad backend con 'Falta cancelar'
- [x] Verificar que solo Master Admin y Registradores puedan cambiar el estado de pago; el cliente no debe recibir controles de pago
- [x] Permitir que el Master Admin cree múltiples cuentas Registrador y que el operador trabaje con las acciones de envíos
- [x] Rediseñar la tabla para priorizar destinatario, estado, fecha de creación y acciones
- [x] Añadir paginación y desplazamiento horizontal responsive en la tabla administrativa
- [x] Añadir pruebas para paginación, permisos y presentación del estado de pago

## Corrección de modal y ticket imprimible
- [x] Añadir una X visible y cierre seguro al modal de actualización administrativa
- [x] Mostrar claramente las opciones de pago 'Pagado' y 'No cancelado' en el modal de actualización
- [x] Evitar que el control de entrega se divida entre páginas al imprimir el recibo
- [x] Añadir pruebas para cierre del modal, estados de pago y paginación del ticket imprimible

## Cobertura integrada pendiente
- [x] Añadir una prueba de UI/componente para verificar el cierre del modal de actualización con X y Cancelar
- [x] Añadir una prueba que verifique las opciones visibles Pagado y No cancelado en el modal
- [x] Añadir una prueba integrada que valide la regla anti-corte dentro del HTML/CSS real del recibo y ticket

## Cobertura real del modal y recibo
- [x] Extraer el modal de actualización a un componente testeable y verificar el cierre real con X y Cancelar
- [x] Verificar en un componente renderizado que el selector real muestra Pagado y No cancelado
- [x] Exponer y probar el HTML/CSS final generado por el recibo de cliente y administración, incluyendo la regla anti-corte

## Cobertura administrativa del recibo
- [x] Extraer a un módulo testeable el CSS y HTML del ticket del recibo administrativo
- [x] Añadir una prueba integrada que confirme `.cut-ticket` y la regla anti-corte en el recibo administrativo

## Corrección de roles estrictos y falsos errores de validación
- [x] Auditar y asegurar la separación de 3 roles: Cliente, Operador Registrador y Master Admin
- [x] Asegurar que solo el Master Admin pueda crear, desactivar y eliminar cuentas de operadores
- [x] Corregir la cuenta yeslyvr1997@gmail.com para que sea Registrador y no admin principal
- [x] Corregir los falsos positivos de errores inline en los campos de nombre y apellido al abrir el modal de actualización
- [x] Añadir pruebas de autorización por rol y de validación de formulario del modal

## Verificación directa del modal de actualización
- [x] Añadir prueba de componente/integración que abra el modal con nombres y apellidos válidos precargados sin errores rojos
- [x] Añadir prueba del modal que simule entrada inválida y confirme que los errores desaparecen después de sanitizar/corregir

## Ajustes solicitados por el usuario
- [x] Ajustar la visualización de pago: 'Pagado' en negro sin color y 'No cancelado' en rojo; verde exclusivamente para 'Pagado en Lima'
- [x] Restaurar el selector de país con búsqueda en el formulario de creación de cuenta del cliente
- [x] Retirar o simplificar el flujo de SMS en recuperación de contraseña manteniendo operativo el envío por correo

## Requerimientos de Encomiendas, Peso y Tarifas Manuales
- [x] Incorporar la categoría de tipo de envío (Documentos vs Encomiendas / Paquetería) exclusivo para operadores y administradores
- [x] Aplicar tarifa base de 13,5 € por kilogramo para envíos de encomiendas
- [x] Permitir la introducción manual de precios y tarifas sin restricciones tanto en documentos como en encomiendas
- [x] Eliminar la sección independiente de 'Condición de Pago' de las interfaces y recibos, conservando únicamente el 'Estado de Pago'

## Sección Ubícanos (Lima y Torino)
- [x] Añadir sección pública 'Ubícanos' en la página principal con las sedes de Lima (Jr. de la Unión 518) y Torino (Corso Peschiera 162A)
- [x] Incorporar enlaces de Google Maps, referencias, teléfonos y horarios de atención (Lunes a Sábado de 10am a 8:30pm para Lima, 9am a 8:30pm para Torino)

## Cierre de datos de contacto por sede
- [x] Añadir y mostrar el teléfono de la sede Torino en la sección pública Ubícanos
- [x] Ampliar las pruebas para verificar mapa, referencia, horario y teléfono de ambas sedes

## Precisión de contacto y prueba visual de Ubícanos
- [x] Etiquetar explícitamente el contacto de Torino como WhatsApp general, ya que no se proporcionó un teléfono local de Torino
- [x] Añadir una prueba de componente que renderice Home y verifique las dos tarjetas de Ubícanos, sus direcciones, horarios, contactos y enlaces de mapas

## Prueba de página pública completa
- [x] Añadir una prueba de componente/integración que renderice Home completo y verifique que Ubícanos aparece con ambas sedes y sus datos visibles
