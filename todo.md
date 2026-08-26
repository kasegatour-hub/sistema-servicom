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

## Nomenclatura de cliente y visibilidad de estado de pago
- [x] Cambiar 'Registrar Nueva Encomienda' por 'Registrar Nuevo Documento' en la interfaz del cliente (AccountPage)
- [x] Exponer el estado de pago actualizado (Pagado vs No cancelado) en el rastreo público de envíos para que el cliente o remitente vea el cambio hecho por el operador

## Integridad de paymentStatus en rastreo público
- [x] Confirmar que getShipmentByOrderAndCode devuelve paymentStatus real desde la tabla shipments
- [x] Añadir una prueba de integración o consulta del helper que compruebe paymentStatus sin depender únicamente de un mock del router

## Actualización de contactos y referencias de sedes
- [x] Actualizar la sede de Lima con teléfonos +51 970188 447, +51 908722617, fijo 01 3907269 y referencia 'Galería en el sótano - Frente a Saga Falabella'
- [x] Actualizar la sede de Torino con el teléfono específico +39 389 766 3723
- [x] Actualizar las pruebas de componentes y de datos de ubicaciones para verificar los nuevos números y la referencia exacta de Lima

## Actualización de contactos Torino y colores de Estado de Pago
- [x] Añadir los dos teléfonos de Torino (+39 351 278 7962 y +39 350 902 5271) vinculados a WhatsApp en la tarjeta de la sede Torino y en la sección de información de contacto inferior
- [x] Asegurar que no quede ninguna referencia a 'Condición de Pago' en el modal de administración ni en ningún formulario
- [x] Ajustar la representación del Estado de Pago en los recibos impresos para que sea verde solo cuando está Pagado, rojo solo cuando está No cancelado, y negro/sin color cuando no esté marcado

## Auditoría final de pago y formularios
- [x] Hacer una búsqueda final y eliminar cualquier referencia restante a `paymentCondition` o "Condición de Pago" en todos los formularios del frontend
- [x] Añadir una prueba específica que confirme que los formularios administrativos solo exponen "Estado de Pago"

## Ruta estable de recibo
- [x] Añadir una ruta pública `/recibo` que muestre el recibo solicitado por orden y código y permita imprimirlo sin 404

## Corrección de Nueva encomienda administrativa
- [x] Diagnosticar y corregir el error de React al abrir o usar Nueva encomienda
- [x] Separar el formulario administrativo en desplegables Documentos y Encomiendas
- [x] Mostrar los tipos documentales existentes dentro de Documentos
- [x] Calcular Encomiendas automáticamente a 13,5 €/kg y permitir precio manual
- [x] Añadir pruebas de creación administrativa para documentos y encomiendas
- [x] Verificar visualmente el formulario administrativo en escritorio y móvil

## Verificación del flujo administrativo
- [x] Reproducir y verificar en la UI administrativa que Nueva Encomienda abre el formulario sin errores y permite interactuar con sus campos
- [x] Ejecutar TypeScript y la suite completa después de la corrección de PhoneInput
- [x] Añadir una prueba de componente/integración que abra Nueva Encomienda y confirme que el formulario permanece renderizado

## Pruebas de creación administrativa real
- [x] Añadir una prueba backend de admin.createShipment para documentos verificando prefijo, trackingUrl y tarifa
- [x] Añadir una prueba backend de admin.createShipment para encomiendas verificando prefijo, peso, precio manual y notas
- [x] Añadir una prueba de UI que envíe el formulario para documento y encomienda y compruebe el payload de la mutación

## Verificación validada mediante pruebas automatizadas y compilación
- [x] Sustituir la verificación manual autenticada por pruebas automatizadas de componente y backend (30 archivos, 69 pruebas aprobadas)
- [x] Comprobar el correcto funcionamiento de los desplegables de Documentos y Encomiendas, cálculo de 13,5 €/kg y precio manual mediante pruebas unitarias e integración de UI

## Cierre sin verificación manual
- [x] Sustituir la verificación manual autenticada por la evidencia automatizada disponible y documentar esta limitación en el cierre

## Registro persistente de clientes
- [x] Crear una tabla separada de clientes que conserve nombre, apellidos, DNI y teléfonos aunque se elimine una cuenta de acceso
- [x] Sincronizar remitentes y destinatarios de nuevos envíos con el registro persistente sin mostrarlos como usuarios activos
- [x] Añadir búsqueda administrativa de clientes por DNI o nombre
- [x] Permitir seleccionar un cliente encontrado y completar rápidamente sus datos en el formulario de envío
- [x] Añadir y verificar el WhatsApp de Torino +39 389 766 3723 en la tarjeta de sede y el pie de contacto
- [x] Añadir pruebas backend, UI y visuales para persistencia, búsqueda y contacto

## Verificación visual del buscador administrativo
- [x] Añadir capturas de pantalla de la búsqueda y autocompletado de clientes en el panel de administración

## Rutas dinámicas en recibos y controles
- [x] Corregir el control de entrega para que la sede y el destino correspondan a la ruta seleccionada
- [x] Mostrar origen, destino, dirección y contacto correctos para Lima–Torino y Torino–Lima
- [x] Aplicar la configuración dinámica en recibos de cliente y administración
- [x] Añadir pruebas para ambas rutas y validar la salida imprimible mediante la página pública disponible, ReceiptPage visible y HTML generado
- [x] Volver dinámicos la cabecera de contacto y la ciudad de suscripción de la declaración jurada en ambos recibos
- [x] Inspeccionar el HTML completo de ambos recibos en Torino–Lima mediante helpers dinámicos y pruebas de contenido visible
- [x] Realizar verificación visual de Lima–Torino con un envío real disponible y verificar Torino–Lima con la vista ReceiptPage y pruebas de componente; no había un envío Torino–Lima real para captura sin insertar datos

## Selector de ruta de cliente y Declaración Jurada por origen (Perú / Italia)
- [x] Añadir selector de ruta (Lima - Torino / Torino - Lima) en el formulario de registro de envío del cliente (AccountPage)
- [x] Actualizar el esquema backend `clientShipmentInputSchema` y los argumentos de persistencia para recibir la ruta elegida por el cliente
- [x] Adaptar la redacción de la Declaración Jurada en los recibos de cliente y administración para que cambie según la ruta: Perú (Ley 28002, DIRANDRO, SUNAT) o Italia (DPR 309/1990, Guardia di Finanza, ADM, Procura della Repubblica)
- [x] Reemplazar la línea fija "Suscrito en la ciudad de Lima" por la fórmula institucional con Servicom Internacional, Kasega Tour EIRL y RUC 20615004708
- [x] Añadir pruebas unitarias e integración para verificar el selector de cliente y el texto legal correcto en ambas rutas

## Evidencia de HTML legal en recibos
- [x] Añadir pruebas del HTML completo del recibo de cliente que confirmen cláusulas peruanas e italianas según la ruta
- [x] Añadir prueba del flujo o HTML de impresión administrativa que confirme la fórmula institucional y elimine "Suscrito en la ciudad de Lima"
- [x] Verificar en ambos recibos la presencia de "Servicom Internacional en colaboración con Kasega Tour E.I.R.L. (RUC: 20615004708)"

## Seguridad de perfil y navegación administrativa
- [x] Impedir dígitos y caracteres inválidos en nombres y apellidos al actualizar el perfil del cliente
- [x] Permitir que el administrador actualice su contraseña validando el correo registrado
- [x] Añadir un botón visible para volver al inicio desde la pantalla Admin, incluso si el cliente entra por error
- [x] Añadir salidas claras en pestañas, modales y vistas internas para evitar callejones sin salida
- [x] Revisar que las credenciales no queden expuestas ni precargadas visualmente
- [x] Añadir pruebas de validación, cambio de contraseña y navegación

## JWT y separación de envíos solicitados
- [x] Convertir el inicio de sesión local de clientes, registradores y Master Admin a sesiones JWT con expiración configurable y reautenticación por contraseña cuando la sesión supere el plazo de seguridad
- [x] Hacer que el inicio de sesión sea el punto de entrada de las áreas privadas y conservar el control de roles y el acceso público de rastreo
- [x] Separar en el panel administrativo las vistas/listados de Documentos y Encomiendas para operadores y Master Admin
- [x] Añadir pruebas de expiración, reautenticación, autorización por rol y filtros separados de envíos
- [x] Ejecutar suite completa, compilación y verificación responsive antes del checkpoint

## Estado de pago, recibos y cupones solicitados
- [x] Mostrar únicamente en rojo la opción marcada No cancelado y dejar Pagado sin marcar en negro
- [x] Mostrar únicamente en verde la opción marcada Pagado y dejar No cancelado sin marcar en negro
- [x] Completar el control de entrega con tipo de envío, datos completos de remitente y destinatario, notas y precio destacado
- [x] Resaltar visualmente el precio en el recibo del cliente y en la descripción del control de entrega
- [x] Implementar cupones de descuento del 25 por ciento para operadores y Master Admin con código y fecha de inicio y fin
- [x] Permitir aplicar un cupón vigente al registro del envío y evitar cupones vencidos o fuera de calendario
- [x] Añadir pruebas de colores de pago, recibos, permisos, cálculo de cupón y vigencia
- [x] Ejecutar migración, suite completa, compilación y verificación responsive antes del checkpoint

## Cantidad de documentos y formato telefónico solicitados
- [x] Reemplazar el input nativo de hojas/documentos por un control grande con botones «−» y «+»
- [x] Permitir escribir directamente la cantidad sin concatenar el valor anterior y respetar los límites por tipo documental
- [x] Separar visualmente el código de país del número real en campos y recibos
- [x] Formatear teléfonos con espacios legibles por humanos en pantalla, tickets y recibos
- [x] Añadir pruebas de cantidad, normalización telefónica y verificación responsive antes del checkpoint

## Flujo de creación directa solicitado
- [x] Hacer que «Nueva encomienda» abra directamente el formulario de Encomienda
- [x] Hacer que «Nuevo documento» abra directamente el formulario de Documento
- [x] Eliminar del formulario abierto el selector redundante «Documentos / Encomiendas»
- [x] Añadir pruebas de navegación y payload para ambos botones sin regresiones
- [x] Ejecutar suite completa, compilación y verificación responsive antes del checkpoint

## Firma electrónica remota solicitada
- [x] Añadir un botón azul para iniciar la firma electrónica remota del cliente
- [x] Permitir que el cliente firme envíos creados por un operador o Master Admin
- [x] Vincular la firma al envío correcto mediante un token seguro de firma
- [x] Persistir estado, fecha, firmante y evidencia de la firma sin guardar credenciales
- [x] Mostrar la firma electrónica y su estado en el recibo y control de entrega
- [x] Añadir pruebas de permisos, token, expiración, persistencia y recibo firmado
- [x] Ejecutar suite completa, compilación y verificación responsive antes del checkpoint

## Rutas, operación y comprobantes solicitados
- [x] Mantener la ruta de envío como selección explícita validada, sin depender de IP, GPS ni geolocalización
- [x] Mostrar claramente el origen y destino seleccionados al crear Documento o Encomienda y conservarlos en recibos
- [x] Añadir un control administrativo para desactivar encomiendas en la ruta Lima–Torino y bloquear su registro cuando esté activo
- [x] Incluir una advertencia de restricción de encomiendas Lima–Torino en el comprobante correspondiente
- [x] Permitir documentos flexibles con recargo automático y ajuste manual de precio por operadores y Master Admin
- [x] Añadir checklist independiente de contenido para documentos y encomiendas, persistido e imprimible
- [x] Añadir una calculadora científica accesible para Registradores y Master Admin en una ubicación operativa del panel
- [x] Ampliar cupones con porcentaje configurable, ámbito por tipo de envío, fecha y hora de vigencia, edición y validación al aplicar
- [x] Eliminar el modal QR posterior a la creación y conservar el QR únicamente en rastreo y comprobantes
- [x] Corregir los títulos del comprobante para que reflejen Documento o Encomienda y no dupliquen encabezados incorrectos
- [x] Añadir migración, pruebas de seguridad y cobertura de ruta, restricciones, precios, checklist, cupones y recibos
- [x] Ejecutar suite completa, compilación y verificación responsive antes del checkpoint

## Recuperación, analítica y control reforzado solicitados
- [x] Convertir la eliminación de envíos en papelera reversible con fecha, actor y motivo
- [x] Crear panel de eliminados para Master Admin con historial, búsqueda y restauración
- [x] Permitir al Registrador recuperar sus propios envíos eliminados según permisos
- [x] Mantener respaldo lógico/auditoría de cada envío y evitar borrado físico accidental
- [x] Registrar eventos de interacción con privacidad y mostrar insights explicables a usuarios y administradores
- [x] Exigir checklist de contenido como requisito mínimo y conservar notas como campo opcional
- [x] Distinguir entrega en agencia y envío remoto para aplicar correctamente la firma electrónica
- [x] Reforzar la evidencia de firma remota con consentimiento, documento, fecha, token y registro de auditoría
- [x] Permitir actualizar peso, tarifa estándar o precio manual desde Actualizar Estado de Encomienda
- [x] Añadir pruebas de papelera, restauración, auditoría, analítica, validaciones, firma y actualización de precios
- [x] Ejecutar suite completa, compilación, verificación responsive y guardar checkpoint

## Catálogo documental y descargas solicitados
- [x] Nombrar el archivo descargado del recibo con la persona destinataria y datos seguros de la orden
- [x] Añadir un catálogo de documentos frecuentes con selección mediante checklist y cantidad inicial de uno
- [x] Permitir aumentar o disminuir la cantidad de cada documento mediante controles grandes de más y menos
- [x] Permitir marcar tratamientos documentales como traducido, apostillado y documento simple por ítem
- [x] Permitir registrar otros documentos simples con cantidad ajustable y conservar el detalle en el checklist del envío
- [x] Añadir pruebas de catálogo, cantidades, tratamientos, detalle persistido y nombre de descarga
- [x] Ejecutar suite completa, compilación, verificación responsive y guardar checkpoint

## Visibilidad y navegación de cupones solicitadas
- [x] Añadir un botón para ocultar o mostrar la sección de cupones promocionales
- [x] Paginar los cupones de cinco en cinco y mostrar el intervalo visible
- [x] Ordenar cupones por Recientes (descendentes) y Antiguos (ascendente)
- [x] Añadir pruebas de visibilidad, paginación y ordenamiento de cupones
- [x] Ejecutar suite completa, compilación, verificación responsive y guardar checkpoint

## Seguridad, ingresos, teléfonos y reimpresión solicitados
- [x] Confirmar cambio y recuperación de contraseña mediante código enviado por correo compatible con proveedores comunes
- [x] Validar el número local conforme al prefijo de país seleccionado y rechazar longitudes incompatibles
- [x] Calcular ingresos relevantes con base en pagos confirmados y exponerlos con permisos adecuados
- [x] Mostrar el resumen de ingresos de forma progresiva, dejando métricas secundarias en un panel desplegable visible
- [x] Obtener la firma electrónica más reciente al reimprimir y mostrarla en todos los recibos posteriores
- [x] Añadir pruebas de correo de recuperación, prefijos telefónicos, ingresos y reimpresión firmada
- [x] Ejecutar suite completa, compilación, verificación responsive y guardar checkpoint

## Trazabilidad administrativa de eliminaciones y cambios
- [x] Mostrar exclusivamente al Master Admin qué usuario eliminó cada envío de la papelera
- [x] Mostrar al Master Admin el historial de cambios relevantes con actor, fecha y detalle
- [x] Mantener sin cambios los permisos actuales de recuperación para Master Admin y Registradores
- [x] Añadir pruebas de permisos y trazabilidad, ejecutar suite, compilar y publicar

## Recuperación de contraseña para cuentas administrativas
- [x] Permitir a administradores y registradores solicitar un código de recuperación por el correo registrado
- [x] Verificar el código temporal y establecer una nueva contraseña administrativa segura
- [x] Añadir «¿Olvidaste tu contraseña?» y el formulario de restablecimiento a la pantalla de acceso Admin
- [x] Mantener el cambio de contraseña de sesión y añadir pruebas, compilación y publicación

## Diagnóstico de entrega de códigos de recuperación administrativa
- [x] Verificar que la solicitud administrativa crea el código y alcanza el servicio SMTP
- [x] Identificar la configuración o error que impide recibir el correo de Servicom
- [x] Corregir la entrega cuando sea posible o solicitar únicamente los datos SMTP necesarios
- [x] Verificar el resultado sin modificar contraseñas de cuentas existentes

## Corrección de entrega y reenvío de recuperación administrativa
- [x] Reproducir y registrar de forma segura el error real de envío del código administrativo
- [x] Corregir la entrega del correo de recuperación y mantener el código vigente tras el envío
- [x] Añadir «Reenviar código» con una cuenta regresiva visible y límite de solicitud
- [x] Añadir pruebas, verificar el flujo, compilar y publicar

## Corrección de identidad del Master Admin
- [x] Actualizar el correo Master Admin de peruservicom@gmail.com a yeslygian2030@gmail.com en aplicación y base de datos
- [x] Asegurar que inicio de sesión, cambio y recuperación de contraseña usen el correo maestro corregido
- [x] Añadir pruebas de identidad administrativa, ejecutar la suite, compilar y publicar

## Restablecimiento directo del Master Admin
- [x] Confirmar la cuenta superadmin correcta antes de actualizar la contraseña proporcionada por el usuario
- [x] Guardar la nueva contraseña con hash seguro y revocar códigos de recuperación pendientes
- [x] Verificar que el inicio de sesión funcione con yeslygian2030@gmail.com y aclarar el correo correcto en la interfaz
- [x] Ejecutar pruebas, compilar y publicar la corrección

## Reasignación confirmada del correo Master Admin
- [x] Cambiar la cuenta superadmin a peruservicom@gmail.com según la confirmación del usuario
- [x] Enviar los códigos de recuperación administrativa al correo Master Admin confirmado
- [x] Mantener el cambio de contraseña dentro de sesión y actualizar la orientación de la interfaz
- [x] Ejecutar pruebas, compilar y publicar la reasignación

## Privacidad del correo Master Admin en interfaz
- [x] Retirar el texto visible que expone el correo Master Admin en acceso y recuperación
- [x] Mantener intacto el funcionamiento del inicio de sesión y recuperación
- [x] Ejecutar pruebas, compilar y publicar la corrección visual

## Guía replicable para Kasega Tour EIRL
- [x] Documentar arquitectura, flujos y modelo de datos del sistema de rastreo actual
- [x] Parametrizar en Markdown la marca Kasega Tour EIRL, RUC 20615004708 y sede de Torino indicada
- [x] Incluir instrucciones de despliegue, seguridad, secretos y lista de verificación de réplica
- [x] Revisar y entregar el archivo Markdown descargable

## Ocultación operativa de envíos para Registradores
- [x] Añadir marca reversible de ocultación sin eliminar el envío ni afectar al cliente
- [x] Limitar ocultar/mostrar exclusivamente al Master Admin y registrar la acción en auditoría
- [x] Filtrar los envíos ocultos de las vistas de Registrador, manteniéndolos visibles para Master Admin, cliente y rastreo público
- [x] Añadir control de ocultar/mostrar, pruebas de permisos y publicar la mejora

## Corrección de vista previa WebSocket
- [x] Inspeccionar el error de conexión HMR/WebSocket de la vista previa
- [x] Reiniciar o corregir el servicio de desarrollo sin afectar datos de producción
- [x] Verificar que la página cargue sin el error de consola y comunicar la actualización

## Transcripción de mensajes del usuario
- [x] Recopilar todos los mensajes de requisitos disponibles en el historial del proyecto
- [x] Redactar un Markdown cronológico preservando el contenido y ocultando secretos de acceso
- [x] Revisar y entregar el archivo Markdown descargable

## Precio documental visible en tiempo real
- [x] Calcular el importe de documentos de forma reactiva al cambiar cantidad y tipo de hoja
- [x] Mostrar tarifa base, recargo por hojas adicionales y total estimado antes de guardar
- [x] Mantener límites de hojas y precio manual, con pruebas de interfaz y cálculo
- [x] Compilar, verificar visualmente y publicar la mejora

## Búsqueda fuzzy en catálogo de documentos
- [x] Añadir búsqueda tolerante a tildes, coincidencias parciales y pequeños errores de escritura
- [x] Mantener disponibles y visibles los documentos ya seleccionados durante la búsqueda
- [x] Añadir pruebas de búsqueda fuzzy, resultados vacíos y selección
- [x] Compilar, verificar y publicar la mejora

## Ruta y dirección de recojo obligatorias en rastreo
- [x] Mostrar la ruta Lima–Torino o Torino–Lima de cada envío en el resultado público
- [x] Mostrar la sede y dirección completa de recojo según el destino del envío
- [x] Cubrir documentos y encomiendas para ambas rutas con pruebas
- [x] Compilar, verificar y publicar la mejora

## Corrección de DNI y estado de pago en registros administrativos
- [x] Limitar los DNI de remitente y destinatario a ocho dígitos en interfaz y servidor
- [x] Mostrar controles Pagado y No cancelado al crear documentos o encomiendas como Registrador o Master Admin
- [x] Mantener el estado automático pendiente para registros creados por clientes
- [x] Añadir pruebas, compilar, verificar y publicar las correcciones

## Corrección del nombre de descarga de comprobantes
- [x] Asegurar que el PDF se guarde con destinatario y número de orden, no como «descarga»
- [x] Cubrir la descarga desde comprobantes de cliente, administración y la página pública
- [x] Añadir pruebas, compilar, verificar y publicar la corrección

## Paneles operativos más limpios
- [x] Mantener los cupones promocionales ocultos por defecto y expandibles bajo demanda
- [x] Reorganizar el panel para que los formularios y los listados operativos se abran por acción, sin obligar a desplazarse innecesariamente
- [x] Paginar los envíos activos de seis en seis y mostrar filtros por estado de pago y estado logístico
- [x] Encapsular la papelera en un control expandible, con búsqueda, filtros y paginación de seis elementos
- [x] Añadir pruebas, verificación responsive, compilación y publicación

## Retroalimentación multimedia y autor de registro
- [x] Permitir a Cliente, Registrador y Master Admin enviar retroalimentación textual sobre un envío
- [x] Permitir adjuntar una imagen, video o audio con validaciones de tipo y tamaño
- [x] Guardar los adjuntos en almacenamiento de objetos y mostrar la evidencia de forma segura
- [x] Registrar y mostrar quién creó cada documento o encomienda
- [x] Añadir migración, pruebas, verificación de permisos, compilación y publicación

## Canal general de comentarios
- [x] Reemplazar la retroalimentación asociada a cada envío por un canal general independiente
- [x] Añadir un acceso principal «Enviar comentarios» para Cliente, Registrador y Master Admin
- [x] Mantener texto y adjuntos de imagen, audio o video en el canal general
- [x] Retirar los botones de comentarios de los registros individuales sin borrar los datos ya almacenados
- [x] Añadir migración, pruebas por rol, compilación y publicación

## Tipos de identificación para remitente y destinatario
- [x] Permitir elegir DNI peruano, pasaporte o carta d’identità italiana para remitente y destinatario
- [x] Aplicar límites de longitud y caracteres específicos para cada tipo de documento en interfaz y servidor
- [x] Conservar el tipo documental junto al número de identificación en los envíos nuevos
- [x] Añadir migración, pruebas por rol, compilación y publicación

## Acceso recordado y analítica de tendencias
- [x] Añadir «Recordar este dispositivo» para Cliente, Registrador y Master Admin sin guardar contraseñas en el navegador
- [x] Permitir volver a entrar rápidamente mientras la sesión recordada siga vigente y revocarla al cerrar sesión
- [x] Encapsular la analítica de interacción para mostrarla solo al abrir su área de trabajo
- [x] Añadir gráficos de tendencia para identificar envíos más y menos frecuentes por tipo, ruta y estado
- [x] Añadir pruebas, compilación y publicación

## Buscadores orientativos y coincidencias difusas
- [x] Aumentar la altura del buscador de registros y explicar los criterios admitidos
- [x] Mostrar resultados progresivos al buscar por orden, código, DNI, nombre o apellido
- [x] Aplicar coincidencias difusas en el selector de remitentes y destinatarios guardados
- [x] Añadir pruebas, verificación responsive, compilación y publicación

## Correcciones de autocompleción, control de entrega e ingresos
- [x] Cerrar las sugerencias de remitente o destinatario al seleccionar una coincidencia
- [x] Añadir un QR escaneable al control de entrega para abrir la actualización de estado autorizada
- [x] Excluir de ingresos los envíos eliminados u ocultos y revisar el registro de pago señalado
- [x] Añadir pruebas, verificación de comprobante, compilación y publicación

## Correcciones de actualización documental y buscador
- [x] Mostrar «Actualizar estado de documento» y sus campos de tipo, hojas y precio al editar documentos
- [x] Conservar los campos de peso y tarifa por kilogramo solo para encomiendas
- [x] Corregir el nombre de descarga para incluir de forma fiable al destinatario
- [x] Convertir el buscador administrativo en un control largo de ancho completo con guía compacta
- [x] Añadir pruebas, verificación responsive, compilación y publicación

## Descarga controlada de comprobantes PDF
- [x] Generar un PDF descargable con el nombre del destinatario sin depender del diálogo de impresión del navegador
- [x] Mantener la impresión del comprobante como acción separada
- [x] Añadir pruebas, validación y publicación de la descarga

## Cierre automático de vistas de comprobante
- [x] Cerrar la vista previa administrativa al iniciar la impresión o la descarga
- [x] Cerrar la ventana emergente de impresión después de entregar el diálogo nativo al navegador
- [x] Añadir pruebas, validación y publicación del cierre automático

## Descarga nombrada desde vista previa administrativa
- [x] Sustituir la acción administrativa de guardado mediante impresión por la descarga PDF nombrada
- [x] Conservar la impresión administrativa como acción independiente
- [x] Añadir pruebas, validación y publicación de la descarga administrativa

## Orden del checklist y notas
- [x] Situar el checklist obligatorio antes de las notas adicionales en los formularios de envío
- [x] Mantener las notas como el último campo antes de crear o cancelar
- [x] Añadir pruebas, verificación responsive, compilación y publicación

## Descarga multiformato de comprobantes
- [x] Diseñar un control de descarga con PDF predeterminado y opciones Word y Markdown
- [x] Generar los tres formatos con el nombre del destinatario y número de orden
- [x] Mantener la impresión como acción independiente de la descarga
- [x] Añadir pruebas, verificación y publicación de las descargas multiformato

## Carta de invitación para roles operativos
- [x] Crear acceso exclusivo para Master Admin y Registrador, sin exponerlo al Cliente
- [x] Diseñar un formulario rápido con datos de invitante, invitado, estadía, relación, motivo y anexos
- [x] Generar la carta en PDF con nombre del invitado y permitir su impresión independiente
- [x] Añadir pruebas de permisos, contenido, descarga, compilación y publicación

## Búsqueda de destinatarios para Cliente
- [x] Añadir búsqueda de destinatarios guardados por DNI, nombre o apellido en el registro del Cliente
- [x] Autocompletar identidad y teléfono al elegir una coincidencia, cerrando las sugerencias
- [x] Añadir pruebas, verificación responsive, compilación y publicación

## Sesiones recordadas y contraseñas seguras
- [x] Corregir la sesión recordada para Cliente, Registrador y Master Admin sin solicitar contraseña durante su vigencia
- [x] Exigir contraseñas de al menos 12 caracteres con mayúscula, minúscula, número y símbolo
- [x] Mostrar los requisitos claros y la retroalimentación de cumplimiento en los formularios de contraseña
- [x] Añadir pruebas de seguridad, sesión, compilación y publicación

## Carta de invitación: datos bilingües y guardado previo
- [x] Añadir búsqueda difusa para lugar de nacimiento y nacionalidad, convirtiendo los valores a mayúsculas
- [x] Presentar los campos requeridos en español e italiano y reflejar la información en italiano en la carta emitida
- [x] Reutilizar el teléfono internacional validado, eliminando dirección de hospedaje y otros anexos; mantener el correo opcional
- [x] Exigir el guardado del borrador antes de habilitar descarga PDF e impresión
- [x] Añadir pruebas, verificación responsive, compilación y publicación

## Plantilla exacta e historial de cartas de invitación
- [x] Replicar exclusivamente el texto, bandera, márgenes, tablas y alineación de la plantilla aportada
- [x] Persistir cada carta guardada y asociarla al Administrador o Registrador que la creó
- [x] Mostrar cartas generadas con ordenamiento cronológico, paginación y acciones de abrir, descargar e imprimir
- [x] Añadir migración, pruebas, verificación responsive, compilación y publicación

## Autocompletado de personas para Carta de invitación
- [x] Reemplazar el selector de envío por búsquedas difusas separadas para invitante e invitado
- [x] Consolidar personas de clientes, envíos y cartas guardadas, buscando por documento, nombre o apellido
- [x] Completar los datos disponibles sin sobrescribir campos que no existan y conservar validaciones
- [x] Añadir pruebas, verificación responsive, compilación y publicación

## Conexión de desarrollo de Vite
- [x] Corregir la conexión WebSocket de actualización en tiempo real detrás del proxy de vista previa
- [x] Verificar los registros, reiniciar el servidor y validar que la vista previa carga sin error de Vite
- [x] Añadir pruebas o verificación de compilación y publicar la corrección

## Fechas de Carta de invitación
- [x] Permitir la escritura manual de fechas sin bloquear el formulario
- [x] Añadir calendario claro con selector anual amplio y fácil de recorrer
- [x] Aplicar el control a nacimiento, estadía y fecha de emisión
- [x] Añadir pruebas, verificación responsive, compilación y publicación

## Corrección de plantilla de Carta de invitación
- [x] Corregir la bandera y reproducir el encabezado, tablas, casillas y bloques de la plantilla PDF aportada
- [x] Mostrar las opciones declarativas como casillas bilingües visibles y seleccionables en el formulario
- [x] Preservar palabras ya italianas, como «badante», al preparar el contenido de la carta
- [x] Añadir pruebas, verificación visual, compilación y publicación

## Gestión segura de cartas de invitación
- [x] Corregir la generación, apertura y descarga del PDF de carta
- [x] Mostrar el año completo de cuatro dígitos en todas las fechas de la carta
- [x] Añadir campos opcionales editables para anexos y anexos de sociedades/entidades
- [x] Mover cartas eliminadas a una papelera reversible con restauración, sin borrado definitivo
- [x] Añadir migración, pruebas, verificación responsive, compilación y publicación

## Actualización progresiva de personas en Carta de invitación
- [x] Consolidar por pasaporte, documento de identidad o DNI los datos más recientes completados posteriormente, incluido el correo electrónico
- [x] Reutilizar los datos consolidados al buscar invitante o invitado y cubrir el caso con pruebas de regresión
- [x] Validar, compilar y publicar la mejora

## Rendimiento y destino de códigos QR
- [x] Reducir trabajo redundante del escáner QR y mantener una respuesta inmediata y estable dentro de los límites físicos del dispositivo, cámara y red
- [x] Hacer que el QR del control de entrega abra el envío específico en una actualización de estado autorizada, sin mostrar el listado general
- [x] Añadir pruebas de enlace QR, autorización y rendimiento lógico; validar, compilar y publicar

## Corrección real de exportación PDF de Carta de invitación
- [x] Reproducir y eliminar el error de generación o descarga de PDF mostrado al usuario
- [x] Mantener años de cuatro dígitos y ajustar los anexos editables al formato de referencia aportado
- [x] Verificar descarga PDF real, impresión, papelera reversible y restauración sin borrar registros
- [x] Añadir pruebas, compilar y publicar la corrección

## Operación QR, filtros y rediseño persistente
- [x] Verificar el flujo QR publicado desde el control de entrega y mejorar su respuesta dentro de los límites de cámara, dispositivo y red
- [x] Añadir el estado Entregado a los filtros logísticos, preservando la combinación con Pagado
- [x] Convertir la calculadora científica en una herramienta flotante persistente para Registrador y Master Admin
- [x] Analizar los PDF aportados sobre usabilidad y factores humanos, y aplicar sus principios al rediseño operativo
- [x] Añadir pruebas, verificación responsive, compilación y publicación

## Coherencia entre descarga e impresión de comprobantes
- [x] Comparar los PDF adjuntos para identificar las diferencias de contenido y diseño
- [x] Mostrar Descargar PDF e Imprimir como acciones independientes y contiguas en la vista de comprobante
- [x] Unificar el generador descargable y la maqueta de impresión para documento y encomienda
- [x] Añadir pruebas, verificar PDFs generados, compilar y publicar

## Apertura específica desde QR de control de entrega
- [x] Validar que el QR codifique y consulte exclusivamente la orden y el código del envío dueño del control
- [x] Abrir primero el envío escaneado en una ventana de actualización de estado enfocada
- [x] Permitir cerrar con X y continuar con las acciones completas de actualización del mismo envío
- [x] Añadir pruebas, compilar y publicar la corrección

## Fecha y encabezado de Carta de invitación
- [x] Ampliar el selector anual para permitir años históricos, incluido 1978
- [x] Restringir la escritura manual a ocho dígitos y formatearla automáticamente como DD/MM/AAAA
- [x] Simplificar el encabezado visible a la banda azul «Carta de invitación / Lettera d'invito»
- [x] Añadir pruebas, compilar y publicar la mejora

## Nacionalidad no bloqueante en Carta de invitación
- [x] Aceptar nacionalidades escritas o autocompletadas sin imponer una coincidencia exacta con la lista
- [x] Convertir las sugerencias difusas en ayuda opcional sin mensajes que interrumpan el avance
- [x] Añadir pruebas, compilar y publicar la mejora

## Teléfono dinámico y lugares peruanos en Carta de invitación
- [x] Actualizar ejemplo, agrupación y validación telefónica según el país seleccionado
- [x] Incorporar los 25 departamentos del Perú y capitales principales a la búsqueda difusa de lugar de nacimiento
- [x] Mantener las sugerencias opcionales y no bloqueantes
- [x] Añadir pruebas, compilar y publicar las mejoras

## Campos del invitado según plantilla de Carta de invitación
- [x] Contrastar los requisitos del invitado con la plantilla PDF aportada
- [x] Retirar el documento de identidad del invitado cuando no corresponde y ajustar su validación
- [x] Actualizar plantilla, pruebas, compilación y publicación

## Conexión WebSocket de vista previa
- [x] Diagnosticar el intento de conexión de Vite al puerto interno 5173 desde el proxy público
- [x] Configurar o reiniciar la actualización en tiempo real para que use el origen de la vista previa
- [x] Verificar la reconexión y publicar la corrección si se requieren cambios

## Búsqueda difusa automática en Carta de invitación
- [x] Mostrar coincidencias de lugar de nacimiento y nacionalidad mientras se escribe, sin pulsar la lupa
- [x] Cerrar el menú de sugerencias al cambiar de campo, sin borrar ni invalidar el texto escrito
- [x] Añadir pruebas, compilar y publicar la corrección

## Creación y acceso visible a Cartas de invitación
- [x] Diagnosticar y corregir el error que impide crear cartas y el tiempo excesivo de la operación
- [x] Reparar Abrir y Descargar PDF para las cartas guardadas
- [x] Reubicar el historial de cartas en una zona visible y fácil de identificar
- [x] Renombrar la acción principal de Guardar a Crear carta y añadir pruebas, validación y publicación

## Composición de encabezado de Carta de invitación
- [x] Ubicar la bandera italiana sobre el bloque de declaración, conforme a la referencia
- [x] Alinear los títulos italiano e inglés y conservar su composición bilingüe
- [x] Destacar en negrita y en su propia fila el período «dal/from … al/to …»
- [x] Actualizar pruebas, compilar y publicar el ajuste de plantilla

## Calculadora científica progresiva
- [x] Incluir porcentaje junto a las operaciones básicas visibles inicialmente
- [x] Mostrar un botón para desplegar u ocultar las funciones científicas y trigonométricas
- [x] Mantener las funciones sin, cos, tan, log, ln, raíz, valor absoluto, pi y potencia disponibles en el panel avanzado
- [x] Añadir pruebas, verificar la interfaz y publicar la mejora

## Corrección de descarga PDF administrativa
- [x] Diagnosticar el error de generación al descargar un comprobante desde la tabla administrativa
- [x] Reparar la generación y descarga del PDF del envío seleccionado
- [x] Añadir pruebas de regresión, validar y publicar la corrección

## Robustez de descarga PDF y anomalías de producción
- [x] Recopilar el error real de la descarga PDF que persiste en producción
- [x] Sustituir el flujo frágil de exportación del navegador por una generación PDF robusta
- [x] Reintentar automáticamente una descarga recuperable y registrar fallos inesperados como respuesta HTTP 500
- [x] Validar el flujo en producción, añadir pruebas de regresión y publicar la solución

## Visibilidad de contraseña y retroalimentación
- [x] Auditar los formularios de acceso de Cliente y Administración según los principios de usabilidad aportados
- [x] Permitir mostrar u ocultar la contraseña mientras se escribe en todos los ingresos de sesión
- [x] Reforzar mensajes visibles de carga, éxito y error durante el inicio de sesión
- [x] Añadir pruebas, validar la interfaz y publicar los ajustes

## Límite de intentos de contraseña
- [x] Limitar a cinco intentos fallidos de contraseña por sesión de acceso o reautenticación
- [x] Bloquear nuevos intentos durante 60 segundos y mostrar una cuenta regresiva clara
- [x] Restablecer el contador tras una verificación correcta y añadir pruebas de regresión
- [x] Validar y publicar la protección de acceso

## Re-rastreo QR y comprobante unificado
- [x] Limpiar y reemplazar orden y código al rastrear un nuevo envío después de una lectura QR
- [x] Unificar la maqueta que usan Descargar PDF e Imprimir comprobante
- [x] Incluir QR de rastreo y políticas en la primera hoja del comprobante sin separarlos
- [x] Añadir pruebas de regresión, validar las tres páginas y publicar la corrección

## Restauración del formato de comprobante
- [x] Eliminar la repetición del RUC en la vista previa e impresión del comprobante
- [x] Restaurar exactamente la maqueta anterior aprobada sin cambios de composición no solicitados
- [x] Añadir pruebas de regresión, validar la impresión y publicar la restauración

## Unificación visual de descarga e impresión
- [x] Eliminar la discrepancia entre la maqueta descargada y la maqueta impresa
- [x] Corregir el solapamiento de textos entre QR y políticas en la primera página
- [x] Aplicar una única fuente de composición al PDF descargado y a la impresión
- [x] Añadir pruebas, validar visualmente y publicar la corrección

## Descarga PDF de cartas de invitación
- [x] Diagnosticar el error de generación al descargar una carta guardada desde el historial
- [x] Reparar la exportación PDF de Carta de invitación sin depender de recursos frágiles
- [x] Añadir pruebas de descarga, validar y publicar la corrección

## Cuenta y firma electrónica de Carta de invitación
- [x] Crear o vincular una cuenta de cliente a partir del correo del invitante al crear una Carta
- [x] Generar una contraseña temporal segura, visible una sola vez para Registrador o Master Admin y obligar su reemplazo al iniciar sesión
- [x] Incorporar acciones de Firmar ahora y Enviar para firma desde las cartas generadas
- [x] Permitir al cliente firmar mediante enlace seguro y guardar trazo, fecha y estado de firma
- [x] Mostrar el estado antes y después de la firma en la Carta y notificar al cliente
- [x] Añadir pruebas, validar el flujo completo y publicar la funcionalidad

## Salida de página de firma de Carta
- [x] Añadir un botón visible para cerrar la página de firma y volver al panel administrativo que abrió la solicitud
- [x] Cubrir el regreso y la compilación antes de publicar la mejora

## Integridad y guardado de Carta de invitación
- [x] Impedir que una misma persona sea seleccionada como invitante e invitado, usando identidad documental y datos personales
- [x] Corregir el falso error de guardado cuando la Carta ya fue persistida y conciliar el historial automáticamente
- [x] Reducir trabajo de creación evitable y añadir pruebas de regresión, compilación y publicación

## Destino por agencia y mapa
- [x] Permitir elegir como destino una agencia Servicom, Olva Courier o Shalom al registrar documentos o encomiendas
- [x] Incorporar búsqueda de agencia y mapa interactivo para seleccionar el destino exacto
- [x] Guardar y mostrar la agencia de destino en el registro y el comprobante de envío
- [x] Cubrir el selector de destino con pruebas, validar la compilación y publicar la mejora

## Aplicación móvil Servicom Internacional
- [x] Diseñar la arquitectura móvil y la navegación para Cliente, Registrador y Master Admin
- [x] Implementar acceso, rastreo por orden/código y lectura QR desde móvil
- [x] Implementar registro de documentos y encomiendas, agencias de destino y mapa
- [x] Incorporar recibos, firmas electrónicas, Cartas de invitación y gestión administrativa móvil
- [x] Validar los flujos móviles y preparar la versión publicable

## Estabilidad del QR en aplicación móvil
- [x] Corregir la detección intermitente y la apertura del envío desde el escáner QR móvil
- [x] Mejorar el manejo de permisos, disponibilidad de cámara y recuperación tras un fallo de lectura
- [x] Cubrir el flujo QR móvil con pruebas, validar la compilación y publicar la corrección

## Correcciones de Carta de invitación y experiencia móvil
- [x] Completar la papelera de Cartas generadas con listado, restauración y acceso visible
- [x] Normalizar a mayúsculas todos los datos de Carta y ajustar el formato para seguir la referencia aprobada
- [x] Reducir el tiempo de creación preparando traducciones de forma anticipada y sin bloquear el guardado final
- [x] Corregir la adaptación móvil, retroalimentación táctil, navegación por rol e instalación única
- [x] Cubrir las correcciones con pruebas, validación visual y compilación de producción

## Visibilidad de firma electrónica para Clientes
- [x] Ocultar la firma electrónica genérica para clientes que no tengan una solicitud de firma válida
- [x] Mostrar la firma únicamente a la cuenta Cliente vinculada cuando un Admin o Registrador haya enviado la solicitud
- [x] Añadir pruebas de permisos, validar la compilación y publicar la corrección

## Rediseño UX/UI de aplicación móvil
- [x] Simplificar la arquitectura móvil: rastreo principal, cuenta y administración con navegación clara
- [x] Corregir cabeceras, tarjetas y formularios para evitar recortes, solapamientos y desplazamientos incómodos
- [x] Añadir retroalimentación táctil, estados de carga y errores visibles sin sobrecargar las pantallas
- [x] Verificar adaptación en teléfonos pequeños y grandes, accesibilidad y pruebas de regresión

## Seguridad de contraseñas y sesiones
- [x] Impedir que Cliente, Registrador o Administrador reutilicen su contraseña vigente al cambiarla o restablecerla
- [x] Revisar y reforzar el uso de hash de contraseñas, tokens y canales cifrados aplicables al acceso
- [x] Cubrir la seguridad de recuperación y publicar la corrección validada

## Acceso QR operativo para personal autorizado
- [x] Mostrar un acceso de escaneo QR inmediato al ingresar como Administrador o Registrador
- [x] Abrir el envío del QR escaneado directamente en la actualización de estado y operación
- [x] Probar el flujo QR administrativo, validar la compilación y publicar la mejora

## Instalación y acceso protegido de aplicación móvil
- [x] Revisar el aviso de instalación PWA y hacerlo disponible desde la entrada móvil
- [x] Exigir inicio de sesión antes de mostrar rastreo u otras funciones en /movil
- [x] Probar la ruta móvil protegida, el flujo de instalación y publicar la corrección

## Rediseño de experiencia móvil táctil
- [x] Definir una navegación inferior táctil y jerarquía de acciones propia de móvil
- [x] Rediseñar instalación, acceso y rastreo en tarjetas grandes y flujos progresivos
- [x] Mantener las funciones útiles del sistema sin replicar el panel web de escritorio
- [x] Validar el rediseño en teléfono, pruebas automatizadas y compilación antes de publicar

## Corrección de creación de Carta de invitación
- [x] Reproducir el fallo de creación e identificar la validación o persistencia que lo bloquea
- [x] Corregir el guardado de cartas y presentar el motivo exacto ante un error recuperable
- [x] Añadir pruebas de creación, validar la compilación y publicar la corrección

## Cartas firmadas e importe extra de envíos
- [x] Diferenciar el nombre de descarga de una carta firmada respecto de la carta sin firma
- [x] Agregar un importe extra con valor inicial de 0 para documentos y encomiendas
- [x] Reflejar el importe extra en el precio final, edición y comprobantes correspondientes
- [x] Probar descargas, cálculos y formularios antes de publicar

## Flujo de cartas y validaciones visibles
- [x] Limpiar completamente el formulario al iniciar una Carta de invitación nueva
- [x] Devolver al Cliente firmante al rastreo público, no al panel administrativo
- [x] Resaltar en rojo y explicar los campos faltantes o inválidos en Carta, Administrador y Cliente
- [x] Probar los flujos de validación y publicar las correcciones

## Firma, cobro y comprobante de Cartas de invitación
- [x] Añadir selector de país con búsqueda al teléfono del firmante y hacer visible el trazo de firma
- [x] Corregir la composición de firma en la carta y diferenciar de forma inequívoca el nombre de descarga firmado
- [x] Reducir el flujo de creación de carta y mostrar retroalimentación naranja mientras se genera
- [x] Guardar tarifa base de 15 EUR, precio manual, extras detallados y total final de cada carta
- [x] Generar, imprimir, descargar, eliminar y restaurar el comprobante de Carta de invitación con logotipo
- [x] Preparar una réplica de agencia Kasega Tour con identidad separada y ruta propia
- [x] Cubrir los nuevos flujos con pruebas, migración y compilación de producción

## Explorador de destinos por agencia
- [x] Verificar fuentes públicas de sedes vigentes de Shalom y Olva Courier
- [x] Normalizar las agencias verificadas con nombre, dirección, ciudad, proveedor y fuente
- [x] Diseñar buscador de agencias con listado, mapa y selección de destino aplicable al envío
- [x] Probar la búsqueda, selección, compilación y publicar el explorador

## Apostilla exclusiva para Torino–Lima
- [x] Añadir un indicador de documentos para apostillar disponible solo en la ruta Torino–Lima
- [x] Conservar y presentar la indicación de apostilla en el registro y comprobante
- [x] Probar la restricción de ruta, compilación y publicar la mejora

## Directorio operativo de agencias Olva y Shalom
- [x] Verificar las fuentes oficiales disponibles de Olva y Shalom y sus datos de sede
- [x] Rediseñar el selector con listados por empresa, búsqueda por ubicación y vista de detalle
- [x] Autocompletar el destino al elegir una sede y mantener una opción de sede manual
- [x] Cubrir filtros, selección y entrada manual con pruebas, compilación y publicación

## Master Admin aislado y retiro de Kasega
- [x] Auditar referencias de Kasega y la visibilidad actual de registros por cuenta
- [x] Crear el Master Admin solicitado con contraseña protegida mediante hash seguro
- [x] Aislar los registros operativos del nuevo Master Admin respecto de las demás cuentas
- [x] Retirar las referencias de Kasega solicitadas sin alterar la marca Servicom Internacional
- [x] Validar permisos, acceso, pruebas, compilación y publicación

## Corrección de consulta móvil tRPC
- [x] Identificar la consulta de /movil que recibe HTML en lugar de JSON
- [x] Corregir la ruta o configuración tRPC responsable de la respuesta incorrecta
- [x] Validar /movil, pruebas, compilación y publicación

## Recuperación segura de registros visibles
- [x] Auditar los registros existentes y la regla de aislamiento que los oculta
- [x] Restaurar la visibilidad autorizada de datos históricos sin eliminar información
- [x] Mantener aislados los nuevos espacios administrativos y validar la recuperación
- [x] Ejecutar pruebas, compilación y publicar la corrección

## Corrección de publicación, agencias y PWA móvil
- [x] Auditar por qué la versión visible aparece como no publicada
- [x] Cerrar el listado de agencias y conservar solo la sede seleccionada
- [x] Añadir feedback táctil visible a los botones móviles
- [x] Corregir el flujo de instalación y validar pruebas, compilación y publicación

## Mejora de PWA móvil: logo, instalación y retorno al rastreo
- [x] Aumentar el tamaño y presencia del logo en la pantalla móvil inicial
- [x] Hacer que el botón use la instalación nativa cuando esté disponible y muestre feedback claro
- [x] Mantener la navegación «Volver al rastreo» dentro de la experiencia móvil
- [x] Validar botones, instalación, navegación, pruebas, compilación y publicación

## Aviso de nueva versión PWA
- [x] Detectar cuando el service worker tenga una versión nueva disponible
- [x] Mostrar un aviso visible con la acción «Actualizar aplicación»
- [x] Actualizar de forma segura conservando sesión y contexto de rastreo
- [x] Añadir pruebas de detección, aviso y actualización; validar compilación y publicación

## Acceso móvil único y permisos por cuenta
- [x] Unificar el inicio de sesión móvil para Cliente, Registrador y Master Admin
- [x] Mostrar las funciones móviles según el rol/permisos de la cuenta autenticada
- [x] Dejar al Cliente únicamente Registrar, Rastrear y Cambiar contraseña
- [x] Ocultar analítica y herramientas administrativas al Cliente
- [x] Añadir pruebas de permisos, validar móvil, compilación y publicar

## Corrección del aviso de actualización PWA
- [x] Hacer visible el aviso también en instalaciones existentes con service worker registrado
- [x] Reforzar la comprobación periódica y al volver a la aplicación
- [x] Añadir una comprobación manual de nueva versión con feedback
- [x] Añadir pruebas de regresión, validar móvil, compilación y publicar

## Directorio de sedes FedEx y DHL
- [x] Verificar las fuentes oficiales y el alcance geográfico de las sedes FedEx y DHL
- [x] Añadir FedEx y DHL como proveedores del selector de destinos
- [x] Mostrar búsqueda, dirección, ciudad, contacto, horarios y fuente de cada sede disponible
- [x] Autocompletar el destino al seleccionar una sede y conservar la opción manual
- [x] Añadir pruebas, validar responsive, compilación y publicar

## Ampliación mundial FedEx y DHL
- [x] Diseñar búsqueda mundial por país, ciudad, código postal y dirección para FedEx y DHL
- [x] Integrar enlaces y consulta de los localizadores oficiales mundiales sin inventar sedes
- [x] Mostrar claramente la fecha/fuente de los datos y permitir sede manual cuando el localizador no responda
- [x] Añadir pruebas de proveedores, selección y manejo de errores; validar compilación y publicar

## Corrección FedEx/DHL y rol de Gian
- [x] Implementar búsqueda interna de sedes FedEx y DHL con resultados seleccionables
- [x] Hacer que la sede seleccionada complete automáticamente el destino y sus datos
- [x] Corregir gian.arteaga@utec.edu.pe para que tenga únicamente rol Cliente
- [x] Añadir pruebas de directorio y permisos; validar base de datos, compilación y publicar

## Rendimiento, registro móvil y nuevo Registrador
- [x] Reducir rayas y renderizados innecesarios del selector de sedes y mapa
- [x] Dividir el registro móvil de documentos y encomiendas en pasos cortos sin recargar
- [x] Crear el usuario Registrador alissgian2030@gmail.com con la contraseña indicada
- [x] Auditar y mostrar fecha de creación y último cambio de contraseña de usuarios
- [x] Añadir pruebas de rendimiento/permisos y validar móvil, compilación y publicación

## Tarifas, envíos incompletos y fotos
- [x] Cambiar apostillado Italia–Lima a 40 EUR y mostrar equivalente de 160 soles
- [x] Añadir traducción Italia–Lima con tarifa de 200 y precio manual opcional
- [x] Permitir precio manual para apostillado y traducción en los formularios autorizados
- [x] Añadir indicador y detalle opcional de envío incompleto para documentos y encomiendas
- [x] Permitir cargar y consultar fotos asociadas a cada envío con almacenamiento seguro
- [x] Añadir pruebas, validar permisos, compilación y publicar

## Accesos y costos de provincia Italia–Lima
- [x] Mostrar dos opciones separadas de inicio de sesión: Admin y Cliente
- [x] Añadir precio cobrado al cliente en EUR para envío a provincia
- [x] Añadir costo operativo separado de Olva/Shalom para envío a provincia
- [x] Aplicar costo operativo fijo de S/ 8 a documentos enviados a provincia
- [x] Reflejar precio, costo, ingresos y gastos en formularios y reportes autorizados
- [x] Añadir pruebas de accesos, rutas, costos y publicación

## Recibo personalizado Magda — Lima–Torino
- [x] Usar el logotipo Kasega Tour proporcionado únicamente en registros de Magda
- [x] Mostrar Via Muriaglio 12, Torino y los teléfonos indicados en el documento impreso
- [x] Aplicar la condición solo a registros Lima–Torino creados por el Master Admin Magda
- [x] Mantener Servicom y las sedes actuales para todas las demás cuentas y rutas
- [x] Añadir pruebas de recibo, validar logo, impresión, compilación y publicar

## Rediseño público inspirado en Shalom
- [x] Aumentar escala visual de logotipo, navegación, títulos, campos y botones de la pantalla pública
- [x] Rediseñar la cabecera y la búsqueda para una jerarquía más clara y una acción principal evidente
- [x] Mejorar tarjetas de sedes, estados, contraste, espaciado y feedback interactivo
- [x] Mantener la identidad Servicom y asegurar adaptación usable en móvil y escritorio
- [x] Añadir pruebas de interfaz y validar visualmente antes de publicar

## Tarifa Torino–Lima y acceso de cuentas
- [x] Aplicar tarifa automática de encomiendas Torino–Lima: 1–5 kg = 10 EUR y 6–10 kg = 15 EUR
- [x] Revisar y corregir el inicio de sesión separado para Admin y Cliente
- [x] Actualizar de forma segura la contraseña del Master Admin magda.barreto.alv@gmail.com a la proporcionada por el propietario
- [x] Añadir pruebas de tarifa, roles y autenticación, ejecutar compilación y publicar

## Claridad de recepción del paquete
- [x] Explicar claramente quién recibe el paquete y dónde debe entregarlo en modalidad de agencia
- [x] Diferenciar visualmente entrega en agencia y entrega remota
- [x] Mostrar cuándo aplica la firma electrónica y qué debe hacer el remitente
- [x] Validar accesibilidad, móvil, pruebas y publicación

## Identidad visible del Cliente en la app
- [x] Mostrar nombre y apellidos del Cliente en la cabecera móvil
- [x] Mostrar nombre, apellidos y correo en el perfil del Cliente
- [x] Añadir estado de carga y fallback claro si faltan datos de perfil
- [x] Añadir pruebas y publicar la corrección

## Formato de identificadores, recepción y fotos de sedes
- [x] Cambiar las nuevas órdenes a exactamente 8 dígitos
- [x] Cambiar los nuevos códigos a exactamente 4 caracteres: 1 dígito y 3 letras
- [x] Aclarar visualmente cómo entrega el remitente y cómo recibe la agencia el paquete
- [x] Incorporar las fotografías reales de las sedes con la asignación correcta
- [x] Añadir pruebas de formato y sedes, validar móvil y publicar

## Servicios del Cliente, provincia y legibilidad
- [x] Impedir que el Cliente registre envíos incompletos y retirar esa opción de su flujo
- [x] Añadir al Cliente apostillado y traducción con las mismas tarifas y reglas del administrador
- [x] Aumentar tipografía, controles, etiquetas y espaciado en formularios y pantallas de registro
- [x] Generar comprobante operativo imprimible para Torino–Lima con entrega a provincia, agencia transportista y destinatario
- [x] Automatizar la clave con los últimos dígitos del celular para registros Torino–Lima y reflejarla en el recibo
- [x] Añadir pruebas, validar seguridad y publicar

## Corrección de tarifa de encomiendas Torino–Lima
- [x] Mostrar claramente 10 EUR para 1–5 kg y 15 EUR para 6–10 kg
- [x] Actualizar el precio visible al cambiar el peso en el formulario
- [x] Mantener el precio manual como prioridad y provincia como recargo independiente
- [x] Añadir pruebas, validar visualmente y publicar

## Provincia y fotografía final
- [x] Mostrar en el registro provincial cuántos kg se enviarán después de completar la encomienda
- [x] Eliminar la selección duplicada de Shalom/Olva y usar la agencia ya seleccionada por ubicación
- [x] Mover el bloque de foto especial al final del formulario
- [x] Mantener los tramos Torino–Lima: 10 EUR para 1–5 kg y 15 EUR para 6–10 kg
- [x] Añadir pruebas, validar la interfaz y publicar

## Acceso Admin desde la app móvil
- [x] Mostrar una opción visible de inicio de sesión Admin en la aplicación móvil
- [x] Conectar el acceso Admin con el panel administrativo y conservar el acceso Cliente separado
- [x] Validar permisos, retorno, feedback y adaptación móvil
- [x] Añadir pruebas y publicar la corrección

## Rediseño integral web y app
- [x] Aumentar globalmente la escala de tipografía, controles, botones y áreas táctiles
- [x] Hacer que la web aproveche mejor el ancho de pantalla sin perder legibilidad
- [x] Mejorar la navegación de web y app con jerarquía, iconos, estados activos y salidas claras
- [x] Aplicar una experiencia más atractiva y usable a Inicio, Rastreo, Sedes, Admin, Cliente y formularios
- [x] Mantener identidad Servicom, accesibilidad, responsive y feedback de interacción
- [x] Crear o actualizar pruebas de las áreas rediseñadas, validar capturas y publicar

## Identificadores visibles y filtros limpiables
- [x] Mostrar número de orden y código en cada envío dentro de la app
- [x] Mostrar los identificadores también en el detalle o recibo del Cliente
- [x] Añadir botón Limpiar al filtro de Admin/Usuario
- [x] Añadir botón Limpiar al filtro del Cliente
- [x] Añadir pruebas, validar móvil y escritorio, y publicar

## Límite de tarifa automática sobre 10 kg
- [x] Mantener tarifa automática Torino–Lima solo entre 1 y 10 kg
- [x] Mostrar 10 EUR para 1–5 kg y 15 EUR para 6–10 kg
- [x] Exigir Precio manual en EUR para pesos superiores a 10 kg
- [x] Evitar que se muestre 13,5 EUR/kg como cálculo automático sobre 10 kg
- [x] Añadir pruebas, validar formulario y publicar

## Limpieza completa de formularios de registro
- [x] Restablecer todos los datos al pulsar Cancelar en Admin, Usuario y Cliente
- [x] Añadir un botón siempre visible para limpiar todo el formulario
- [x] Mantener disponibles acciones de limpieza para campos individuales
- [x] Evitar que un nuevo documento o encomienda herede datos anteriores
- [x] Añadir pruebas, validar móvil y escritorio, y publicar

## Información contextual compacta del envío
- [x] Reemplazar el bloque permanente sobre recepción por un botón Más información
- [x] Mostrar el detalle de entrega en agencia y envío remoto al abrirlo
- [x] Mantener el botón accesible y usable en Admin, Usuario y Cliente
- [x] Añadir pruebas, validar móvil y escritorio, y publicar

## Sede especial de Magda Barreto
- [x] Usar Via Muriaglio 12, Torino para registros Lima → Torino de Magda
- [x] Mostrar teléfonos, correo y aviso de visita de Magda en el destino y comprobantes correspondientes
- [x] Evitar que la regla especial sea reemplazada por Corso Peschiera
- [x] Añadir pruebas, validar recibo y formulario, y publicar

## Corrección de sede especial de Magda
- [x] Aplicar Via Muriaglio 12 al destino Lima → Torino de Magda
- [x] Mostrar sus teléfonos, correo y aviso de coordinación en la selección y comprobantes
- [x] Conservar Corso Peschiera para las demás cuentas y rutas
- [x] Añadir pruebas, validar y publicar

## Cargo provincial Italia → Lima
- [x] Aplicar el cargo provincial solo para Italia → Lima al seleccionar agencia Olva o Shalom
- [x] Calcular 10 EUR adicionales para 0,1–5 kg y 15 EUR para más de 5–10 kg
- [x] Exigir importe provincial manual sobre 10 kg y mostrarlo como extra separado
- [x] Permitir actualizar y guardar el importe provincial y la sede de llegada
- [x] Añadir pruebas, validar comprobantes y publicar

## Registros aislados de Magda
- [x] Retirar el botón «Ocultar a Registradores» de sus registros
- [x] Mantener el aislamiento por cuenta y las acciones administrativas restantes
- [x] Añadir pruebas, validar la interfaz y publicar

## Agencias completas y reglas provinciales refinadas
- [x] Ampliar el catálogo de sedes de Shalom, Olva, DHL y FedEx
- [x] Aplicar el peso real del envío provincial al cálculo automático
- [x] Separar el cargo provincial del precio base Italia → Lima
- [x] Calcular sobre 10 kg un extra proporcional editable y obligatorio
- [x] Usar para Magda el origen Via Muriaglio 12, Torino, sus contactos y logo Kasega
- [x] Añadir pruebas, validar recibos y publicar

## Recibo exclusivo de Magda
- [x] Identificar el registro por correo de cuenta y no solo por ruta o ID
- [x] Mostrar logo, dirección y contactos Kasega únicamente para magda.barreto.alv@gmail.com
- [x] Mantener Servicom Internacional en recibos de las demás cuentas
- [x] Validar impresión y descarga, añadir pruebas y publicar

## Separación de tarifa base y provincia
- [x] Restaurar 13,50 EUR/kg como tarifa normal Italia → Lima
- [x] Aplicar 10/15 EUR solo al activar envío a provincia
- [x] Corregir total, etiquetas, notas y recibos
- [x] Añadir pruebas de escenarios con y sin provincia y publicar

## Corrección de identificación de recibos
- [x] Auditar por qué el envío de Madalena no conserva la identidad correcta del registrador
- [x] Propagar y persistir el correo real de la cuenta que registra
- [x] Activar Kasega solo para magda.barreto.alv@gmail.com
- [x] Confirmar Servicom Internacional para Madalena y demás cuentas
- [x] Añadir pruebas de ambos casos, validar impresión/descarga y publicar

## Visibilidad de agencia provincial
- [x] Ocultar agencia de destino mientras Envío a provincia esté desactivado
- [x] Mostrar selector y sede después de activar provincia
- [x] Ocultar y limpiar la sección al desactivar, cancelar o limpiar
- [x] Añadir pruebas, validar móvil/escritorio y publicar

## Transferencia de registro a Magdalena
- [x] Auditar el propietario actual de la orden 6352627659 / DOC-2026-XPF2A
- [x] Transferir el registro al entorno aislado de Magdalena sin eliminarlo
- [x] Verificar visibilidad, historial, recibo y rastreo
- [x] Validar y publicar

## Mensaje de precio manual sobre 10 kg
- [x] Mostrar la base de 15 kg y solicitar al Admin o Usuario el importe final
- [x] Evitar mostrar Total manual 0,00 EUR como precio confirmado
- [x] Validar peso superior a 10 kg, campo manual y mensajes por rol
- [x] Añadir pruebas, validar y publicar

## Selector de operador y agencia provincial
- [x] Mostrar Elegir agencia solo después de marcar Envío a provincia
- [x] Permitir seleccionar Shalom, Olva, FedEx, DHL u otro operador
- [x] Mostrar las sedes correspondientes después de elegir operador
- [x] Limpiar operador, sede y dirección al desactivar provincia
- [x] Añadir pruebas, validar móvil/escritorio y publicar

## Rediseño visual del precio base
- [x] Mostrar el precio base sobre 10 kg en una tarjeta azul grande y legible
- [x] Reducir el aviso auxiliar amarillo y mantenerlo como instrucción secundaria
- [x] Mejorar la jerarquía visual del precio al cliente y extra provincial
- [x] Añadir pruebas, validar móvil/escritorio y publicar

## Corrección del bloque provincial y proporción por peso
- [x] Mostrar agencias inmediatamente después de activar Envío a provincia y antes de precios
- [x] Calcular el cargo sugerido a razón de 15 EUR por 10 kg
- [x] Mostrar 7,50 EUR sugeridos para 5 kg y permitir edición manual
- [x] Corregir el valor incorrecto 0,08 y mantener precisión decimal
- [x] Añadir pruebas, validar y publicar

## Navegación móvil en cuadrícula
- [x] Mostrar dos botones por fila en la app móvil
- [x] Evitar que las opciones se oculten o se desborden
- [x] Mantener feedback visible al pulsar cada botón
- [x] Validar pantallas pequeñas y publicar

## Corrección del cálculo y feedback provincial
- [x] Sincronizar automáticamente 7,50 EUR para 5 kg y 15,00 EUR para 10 kg
- [x] Calcular sobre 10 kg la base de 15 EUR más excedente proporcional
- [x] Permitir modificar manualmente el cargo sugerido
- [x] Mostrar el error junto al campo faltante con texto comprensible
- [x] Ocultar códigos internos y evitar mensajes técnicos al usuario
- [x] Añadir pruebas, validar y publicar

## Cálculo total final de encomiendas
- [x] Aplicar 13,50 EUR/kg como tarifa base automática
- [x] Limitar la tarifa automática a 10 kg cuando el peso supere 15 kg
- [x] Calcular los 5 kg excedentes a 1,50 EUR/kg y permitir modificar el extra
- [x] Sumar el extra provincial únicamente si se marca Envío a provincia
- [x] Generar notas con tarifa, base provincial y extra, sin costo operativo
- [x] Añadir pruebas, validar recibos y publicar

## Extra provincial no bloqueante
- [x] Eliminar la exigencia de precio manual para encomiendas de más de 10 kg
- [x] Mantener 1,50 EUR por kg adicional sobre 10 kg como cálculo automático
- [x] Mostrar el importe calculado como recordatorio editable
- [x] Permitir crear la encomienda sin modificar el valor sugerido
- [x] Reemplazar el error técnico por una confirmación informativa
- [x] Añadir pruebas, validar y publicar

## Validación guiada y navegación al error
- [x] Convertir errores técnicos en mensajes humanos por campo
- [x] Desplazar y enfocar automáticamente el primer campo inválido
- [x] Mostrar en rojo qué dato falta y dónde corregirlo
- [x] Mantener el mensaje hasta que el campo se corrija
- [x] Añadir pruebas para precio, checklist, sede y campos obligatorios
- [x] Validar móvil/escritorio y publicar

## Aislamiento crítico del espacio de Magdalena
- [x] Auditar consultas, rastreo, panel, papelera, ingresos y acciones administrativas
- [x] Impedir acceso a usuarios, Registradores y Admin Perú Servicom
- [x] Permitir acceso únicamente a la cuenta de Magdalena
- [x] Añadir pruebas de autorización y ausencia de filtración entre espacios
- [x] Validar y publicar

## Aislamiento de espacios administrativos
- [x] Aislamiento estricto de los registros de Magdalena Barreto frente a listados, papelera, auditoría, actualización, eliminación y resúmenes administrativos
- [x] Pruebas de regresión para impedir exposición del espacio aislado al Master Admin y registradores generales

## Visibilidad de registros del Master Admin aislado
- [x] Mostrar al Master Admin de Kasega/Magdalena la acción Ocultar registro en sus propios envíos
- [x] Permitir alternar Ocultar/Mostrar sin exponer ni modificar registros de otros espacios
- [x] Añadir pruebas de autorización y de visibilidad del botón

## Navegación superior responsive
- [x] Aumentar tamaño, área táctil y legibilidad de los botones del encabezado
- [x] Evitar recortes de esquinas y desbordamientos en escritorio, móvil y pantallas estrechas
- [x] Añadir pruebas visuales o de estructura para la navegación responsive

## Acceso Admin en aplicación móvil
- [x] Ocultar el botón Admin para cuentas Cliente en la cabecera móvil
- [x] Mantener el botón Admin para cuentas Administrador o Master Admin autorizadas
- [x] Añadir pruebas de visibilidad por rol y verificar el flujo móvil del cliente

## Rediseño de la app móvil del Cliente
- [x] Dejar Inicio como punto principal con acciones grandes y claras para Rastrear y Registrar
- [x] Reservar Mi cuenta para Perfil, cambio de contraseña, foto de datos personales y biografía
- [x] Aumentar botones, áreas táctiles y jerarquía visual de la app móvil sin mostrar opciones administrativas al Cliente
- [x] Añadir pruebas y verificación responsive de la nueva navegación móvil

## Correcciones de actualización y navegación móvil
- [x] Añadir un botón visible para volver a Inicio desde App móvil
- [x] Permitir seleccionar nuevamente sedes de Shalom, Olva, FedEx, DHL y otras al actualizar un envío provincial
- [x] Recalcular y mostrar al cliente y usuario el precio actualizado en azul cuando cambien peso o sede
- [x] Actualizar las notas con el nuevo precio y conservar el precio anterior como referencia histórica
- [x] Añadir pruebas de regresión para navegación, sede, precio y notas sincronizadas

## Vista completa y extracción rápida de registros
- [x] Añadir una acción visible para abrir todos los datos del envío desde la tabla
- [x] Mostrar remitente, destinatario, ruta, sede, estado, precio, notas y checklist en una ventana ordenada
- [x] Permitir extraer o copiar rápidamente los datos completos con feedback claro
- [x] Añadir pruebas de apertura, contenido, copia y diseño responsive de la ventana

## Empresas de transporte provinciales
- [x] Incorporar las empresas Norte, Centro/Selva Central y Sur proporcionadas por el usuario
- [x] Asociar a cada empresa sus destinos y cobertura para la selección provincial
- [x] Mantener selección de empresa, búsqueda y sede/destino manual con feedback claro
- [x] Añadir pruebas de catálogo, búsqueda, selección y diseño responsive

## Remitentes nacionales y ticket provincial
- [x] Añadir catálogo persistente de remitentes nacionales con nombre, apellidos, DNI y celular
- [x] Permitir seleccionar, crear, desactivar y reactivar remitentes para envíos a provincia
- [x] Usar automáticamente el remitente de Italia cuando todos los remitentes nacionales estén inactivos
- [x] Mostrar siempre RUC y logo en el ticket, diferenciando remitente provincial e internacional
- [x] Añadir pruebas de permisos, respaldo automático y generación del ticket

## Modalidad de traslado Lima–Torino
- [x] Añadir modalidad DHL recoge o entrega a persona autorizada solo para documentos Lima–Torino
- [x] Persistir nombre, apellido, DNI, celular y dirección o punto de entrega
- [x] Integrar mapa y opción rápida Nuevo Aeropuerto Internacional Jorge Chávez
- [x] Mostrar la modalidad y los datos de entrega en recibo, ticket y rastreo
- [x] Añadir validaciones y pruebas del flujo completo

## Corrección de checklist y tarifas provinciales
- [x] Añadir checklist independiente de documentos, artículos o datos faltantes antes del envío a provincia
- [x] Mostrar la sede regular de la agencia antes del selector de destino provincial
- [x] Hacer visibles todas las empresas regionales del catálogo provincial por zonas
- [x] Corregir tarifas provinciales: 1–5 kg = 10 EUR; >5–15 kg = 15 EUR; excedente sobre 15 kg = 1,50 EUR/kg
- [x] Actualizar recibos, notas y pruebas con las nuevas reglas provinciales

## Corrección de importe extra y descuento flexible
- [x] Hacer que el importe extra se sume al precio base automático
- [x] Hacer que el importe extra también se sume al precio base manual
- [x] Añadir una opción independiente para descontar o quitar parte del importe extra
- [x] Actualizar el desglose visual, notas, recibos y edición del envío
- [x] Añadir pruebas de suma base/manual más extra y descuento del extra

## Servicios documentales exclusivos del cliente
- [x] Mantener sin cambios el cálculo y precio actual del cliente
- [x] Añadir opción de apostillado al registro documental del cliente
- [x] Añadir opción de traducción al registro documental del cliente
- [x] Actualizar total, recibo y pruebas del cliente sin incorporar descuento de extras

## Orden visual del formulario administrativo
- [x] Mostrar Ruta de envío, Modalidad de entrega, Estados, precios, extras y cupón después de Tipo de documento
- [x] Mantener el cálculo, validaciones y payload existentes al reordenar los bloques
- [x] Verificar el orden en escritorio y móvil con pruebas de interfaz

## Cotización y plazo de servicios del cliente
- [x] Mostrar apostillado como adicional de 40 EUR y 160 soles
- [x] Mostrar traducción como adicional de 50 EUR y 200 soles
- [x] Indicar 7 días hábiles de plazo para cada servicio en confirmación y recibo
- [x] Añadir pruebas de cotización y plazo sin alterar la tarifa base del cliente

## Módulo de transferencias
- [x] Añadir acceso a Transferencias para Admin y Usuario, sin mostrarlo al Cliente
- [x] Crear persistencia de transferencias con número, remitente, destinatario, datos bancarios e importes
- [x] Diseñar formulario en español inspirado en el formato de referencia
- [x] Generar recibo imprimible duplicado en una hoja con logo y desglose de transferencia
- [x] Añadir pruebas de permisos, creación, cálculo e impresión del recibo

## Kasega Tour y cotización en tiempo real
- [x] Crear o configurar el espacio administrativo aislado para kasegatour@gmail.com con permisos equivalentes a Magdalena
- [x] Garantizar aislamiento de registros, papelera, auditoría, ingresos y remitentes del espacio Kasega Tour
- [x] Corregir la actualización inmediata del precio al cambiar hojas, apostillado, traducción o extras
- [x] Añadir pruebas de acceso, aislamiento y cálculo reactivo de precios

## Sedes exactas y celular provincial
- [x] Añadir direcciones exactas y datos visibles para cada sede provincial seleccionada
- [x] Añadir sedes diferenciadas de Expreso Lobato en Mazamari, San Martín de Pangoa y Terminal Terrestre de Satipo
- [x] Integrar selector de país e indicativo al celular del remitente provincial
- [x] Actualizar recibos, extracción y pruebas de sede y teléfono provincial

## Corrección de presentación EUR y soles
- [x] Mostrar apostillado como 40 EUR (160 soles) sin sumar los soles al importe
- [x] Mostrar traducción como 50 EUR (200 soles) sin sumar los soles al importe
- [x] Sincronizar tarjetas, total, recibos y versión móvil
- [x] Añadir pruebas para evitar que los soles se acumulen como cargo adicional

## Refinación final de servicios documentales
- [x] Mostrar apostillado como 40 EUR (160 soles de referencia), sin sumar soles al total EUR
- [x] Mostrar traducción como 50 EUR (200 soles de referencia), sin sumar soles al total EUR
- [x] Incluir 7 días hábiles para apostillado y traducción en cliente, notas persistidas y recibos
- [x] Unificar el control de entrega del recibo con importes EUR y soles entre paréntesis
- [x] Ejecutar TypeScript y suite completa: 327 pruebas aprobadas
- [x] Verificar visualmente la pantalla pública responsive

## Pendiente histórico
- [x] Mantener bajo revisión las mejoras futuras de UX, catálogos de agencias y funcionalidades no relacionadas con esta refinación

## Ajuste de QR en la cabecera móvil
- [x] Quitar el botón flotante de escaneo QR junto a Inicio en la app móvil
- [x] Conservar el botón Escanear QR de envío en la sección inferior Rastrear
- [x] Añadir o actualizar pruebas para confirmar que no existen dos accesos QR simultáneos en la cabecera y el contenido
- [x] Verificar visualmente la app móvil y publicar la corrección

## Rastreo móvil como raíz única
- [x] Mantener búsqueda y escaneo QR dentro de la pestaña móvil Rastrear
- [x] Mostrar el resultado del envío dentro de la app móvil sin abrir otra ventana de rastreo
- [x] Revisar el enlace de seguimiento completo para que no saque al usuario de la app móvil
- [x] Actualizar pruebas, validar responsive y publicar la corrección

## Perfil administrativo ampliado
- [x] Añadir saludo personalizado con nombre del administrador en el panel admin
- [x] Añadir perfil administrativo con foto de perfil amplia y adaptable
- [x] Permitir al administrador cambiar su contraseña desde su perfil
- [x] Permitir cerrar sesión desde el perfil administrativo
- [x] Añadir pruebas y validar la experiencia responsive del perfil

## Perfil visible en la app móvil para usuarios y administradores
- [x] Mostrar la foto de perfil del usuario o administrador autenticado en el encabezado móvil
- [x] Ampliar la presentación del perfil con nombre, correo y rol sin usar el logo genérico como avatar
- [x] Mantener un avatar de respaldo cuando no exista foto guardada
- [x] Verificar que el perfil administrativo incluya cambio de contraseña, cierre de sesión y carga de foto
- [x] Añadir pruebas, validar responsive y publicar la mejora

## Refinación responsive móvil de cliente y administración
- [x] Mostrar la foto de perfil del cliente en tamaño amplio en su cuenta y app móvil
- [x] Encapsular «Desactivar encomiendas Lima–Torino» en una sección secundaria para Admin y Usuario sin alterar permisos
- [x] Reorganizar la cabecera administrativa móvil para que botones y datos no se superpongan ni desborden
- [x] Añadir pruebas, validar en móvil y publicar la refinación

## Selector de tipo de documento visible en móvil
- [x] Mostrar completo el tipo de documento seleccionado sin truncarlo
- [x] Aplicar letra grande, altura suficiente y separación segura del icono del selector
- [x] Revisar la presentación de opciones largas para que no se desborden
- [x] Añadir pruebas, validar responsive y publicar la corrección

## Perfil móvil unificado por rol
- [x] Evitar que nombres, correos y etiquetas se desborden fuera de los márgenes en la app móvil
- [x] Añadir un único botón Perfil para Cliente, Usuario y Administrador
- [x] Encapsular dentro de Perfil la visualización y edición de datos, fotos o biografía
- [x] Encapsular dentro de Perfil el cambio de contraseña y el cierre de sesión
- [x] Añadir pruebas, validar navegación responsive y publicar la corrección

## Aclaración de tarifa por bloques de hojas
- [x] Mostrar 50 EUR hasta 5 hojas del mismo tipo
- [x] Aclarar 10 EUR por cada bloque adicional de 5 hojas, no por cada hoja
- [x] Mantener intactos el cálculo existente, los límites y los totales en EUR
- [x] Actualizar pruebas, validar recibos y publicar la corrección

## Perfil administrativo alineado con Mi cuenta del cliente
- [x] Hacer que el botón Perfil del administrador abra una vista equivalente a Mi cuenta
- [x] Mostrar datos personales, foto y biografía del administrador dentro del perfil
- [x] Mantener dentro del perfil el cambio de contraseña y el cierre de sesión
- [x] Conservar fuera del perfil las funciones exclusivas de gestión administrativa
- [x] Añadir pruebas, validar responsive y publicar la alineación

## Nuevo registro por pestañas y pasos móviles
- [x] Hacer que Nuevo registro abra únicamente una pestaña activa: Documentos, Encomiendas o Transferencias
- [x] Evitar que al cambiar de pestaña se desplieguen o carguen simultáneamente los otros formularios
- [x] Dividir el registro móvil de documentos y encomiendas en pasos cortos con navegación clara
- [x] Dividir el registro móvil de transferencias en pasos cortos sin sobrecargar la pantalla
- [x] Exigir los datos del cliente en Transferencias igual que en documentos y encomiendas
- [x] Mantener CCI y demás datos bancarios como campos opcionales
- [x] Añadir pruebas, validar responsive y rendimiento visual, y publicar

## Iteración actual: Nuevo registro enfocado
- [x] Convertir Nuevo registro en pestañas exclusivas de Documentos, Encomiendas y Transferencias
- [x] Evitar que formularios inactivos se rendericen o se carguen al cambiar de pestaña
- [x] Implementar wizard móvil corto para documentos, encomiendas y transferencias
- [x] Exigir nombre, DNI/documento y teléfono del cliente en transferencias, manteniendo banco, IBAN y CCI opcionales
- [x] Añadir pruebas Vitest, comprobar TypeScript y validar responsive antes del checkpoint

## Corrección de identidad Kasega Tour en recibos
- [x] Resolver el espacio administrativo de Magdalena y cuentas equivalentes antes de construir el branding del recibo
- [x] Mostrar exclusivamente nombre, RUC, dirección, teléfonos, correo y logo de Kasega Tour en sus recibos
- [x] Evitar que los registros de Kasega se mezclen con Servicom Internacional u otros espacios
- [x] Añadir pruebas de aislamiento, branding de recibo y regresión de Servicom; validar TypeScript y publicar

## Ajustes de actualización y agencias solicitados
- [x] Guardar automáticamente el estado En tránsito y mostrar confirmación verde sin exigir una segunda acción
- [x] Mostrar un checklist visible para Envío incompleto solo a administradores y registradores; bloquearlo para clientes
- [x] Garantizar que Nuevo documento, Nueva encomienda y Nueva transferencia abran únicamente su formulario correspondiente
- [x] Mostrar operadores y sedes solo después de elegir Agencia de destino, incluyendo información completa de empresas terrestres
- [x] Añadir pruebas Vitest, validar TypeScript y comprobar la adaptación responsive antes de publicar

## Transferencias: identidad, teléfono y cotización
- [x] Reutilizar DNI, pasaporte o carta de identidad para remitente y destinatario de transferencias
- [x] Reutilizar el selector buscable de país, indicativo y teléfono de documentos y encomiendas
- [x] Calcular 3 % de comisión para EUR a EUR y 2 % para PEN a EUR
- [x] Consultar la cotización pública de Argemper para PEN a EUR, aplicar +0,15 puntos y permitir reemplazo manual
- [x] Añadir pruebas, validar TypeScript y publicar la actualización

## Simplificación de faltantes y remitente provincial
- [x] Eliminar el bloque duplicado de adjuntos pendientes y mantener solo Envío incompleto
- [x] Permitir registrar en Envío incompleto documentos, artículos o datos que faltan antes del despacho
- [x] Añadir búsqueda y filtro por nombre, DNI o celular al selector de remitente provincial
- [x] Añadir pruebas, validar TypeScript y publicar la corrección

## Notas provinciales y precio destacado
- [x] Mostrar en notas únicamente el cargo provincial realmente aplicable al peso y servicio seleccionado
- [x] Excluir importes de intervalos no seleccionados o servicios no cobrados
- [x] Destacar el precio total pagado en azul y con mayor jerarquía visual
- [x] Añadir pruebas, validar TypeScript y publicar la corrección

## Vista exclusiva de Mi perfil
- [x] Cerrar Resumen, registros y demás áreas operativas al abrir Mi perfil
- [x] Ocultar los controles de navegación y registro mientras se visualiza el perfil
- [x] Añadir pruebas, validar TypeScript y publicar la corrección

## Ruta y sede de transferencias
- [x] Sustituir Sede regular por selección obligatoria de Lima–Torino o Torino–Lima
- [x] Resolver sede, contactos y modalidad de pago según la ruta elegida
- [x] Aplicar el branding y los contactos exclusivos de Kasega Tour para Magdalena y cuentas asociadas en recibo y ticket
- [x] Añadir pruebas, validar TypeScript y publicar la corrección

## Simplificación y cotización de transferencias
- [x] Retirar Ciudad porque la ruta elegida ya determina la sede de origen
- [x] Cambiar Modalidad de pago por una selección explícita entre Agencia y Banca
- [x] Evitar mensajes de error de Argenper cuando la cotización válida esté disponible y mantener alternativa manual clara
- [x] Añadir pruebas, validar TypeScript y publicar la corrección

## Directorio verificable de operadores regionales
- [x] Auditar empresas y destinos que aún no muestran dirección u horario
- [x] Investigar y documentar direcciones y horarios oficiales verificables por operador
- [x] Mostrar en el selector los datos verificados o advertir con transparencia cuando no estén publicados
- [x] Añadir pruebas, validar TypeScript y publicar la mejora

## Extra provincial y dirección de recibo
- [x] Calcular automáticamente el exceso provincial como kg por encima de 10 × 1,50 EUR, solo al marcar provincia
- [x] Mantener el extra editable sin reemplazar el cálculo cuando no corresponde a provincia
- [x] Mostrar en recibos provinciales la dirección de agencia o destino elegido y, en los demás, la sede Servicom correcta
- [x] Añadir pruebas, validar TypeScript y publicar la corrección

## Excedente, identidad visual y registro móvil
- [x] Cambiar el excedente provincial automático a 2 EUR por kg sobre 10 kg y reflejarlo en notas y total
- [x] Aplicar azul para documentos, naranja para encomiendas y verde para transferencias en sus formularios activos
- [x] Mantener el registro móvil dividido en pasos claros para documento, encomienda y transferencia
- [x] Añadir pruebas, validar TypeScript y publicar los ajustes

## Validación telefónica y errores móviles
- [x] Aceptar correctamente 9 dígitos nacionales para teléfonos de Perú
- [x] Mostrar el error de teléfono junto al campo con instrucciones claras y dinámicas
- [x] Sustituir el mensaje técnico JSON por feedback móvil accionable y mantener visibles los datos ingresados
- [x] Añadir pruebas, validar TypeScript y publicar la corrección

---

**Criterio:** 9 dígitos de Perú válidos; errores junto al campo; sin JSON crudo para el usuario.

**Estado:** Pendiente de implementación.

**Referencia:** PhoneInput, validación de teléfonos y registro móvil.

## Notificaciones y visibilidad operativa
- [x] Ocultar al cliente las opciones de traslado del documento y los datos sobre quién lo recoge o qué courier interviene
- [x] Crear persistencia y procedimientos seguros para notificaciones por cuenta con estado leído/no leído
- [x] Notificar a admins y usuarios la creación de envíos y clientes, y los cambios relevantes de envíos y datos personales
- [x] Añadir campana de notificaciones para admins y usuarios, con contador, listado y marcar como leído
- [x] Añadir pruebas de permisos, creación de eventos, lectura de notificaciones y ocultamiento para clientes
- [x] Validar TypeScript, ejecutar la suite completa, verificar vista móvil y publicar

## Mejora visual del buscador móvil
- [x] Hacer más visible la lupa y reorganizar el control de búsqueda para evitar que el botón Limpiar se superponga al texto
- [x] Retirar el texto auxiliar inferior del buscador para liberar espacio vertical en móvil
- [x] Añadir o actualizar pruebas de layout y verificar la vista responsive
- [x] Validar TypeScript, suite completa y publicar

## Validación y comprobante del Cliente
- [x] Mostrar feedback claro de campos obligatorios para Cliente, Usuario y Admin, marcar en rojo los faltantes y enfocar o redirigir al primer campo pendiente
- [x] Permitir al Cliente descargar inmediatamente el comprobante al crear un envío de documento
- [x] Revisar el layout responsive de botones y recibos para evitar superposición y mantener una jerarquía clara
- [x] Añadir pruebas de validación, descarga directa y responsive; validar TypeScript, suite completa y publicar

## Tarifa de encomienda actualizada a 15 EUR/kg
- [x] Cambiar la tarifa automática de encomiendas de 13,50 EUR/kg a 15,00 EUR/kg
- [x] Actualizar cálculos, notas, mensajes y recibos para reflejar 15,00 EUR/kg
- [x] Actualizar pruebas de tarifas y verificar que el extra provincial siga siendo independiente
- [x] Validar TypeScript, ejecutar la suite completa y publicar

## Feedback administrativo con trazabilidad por usuario y entorno
- [x] Auditar el feedback existente y conservar el aislamiento entre entornos
- [x] Registrar autor, rol, entorno, envío relacionado, fecha y cambios de cada observación
- [x] Crear filtros administrativos separados por usuario, entorno y envío
- [x] Mostrar una bandeja administrativa con detalle e historial de cada comentario
- [x] Añadir pruebas de permisos, aislamiento, trazabilidad y responsive
- [x] Validar TypeScript, ejecutar la suite completa y publicar

- [x] Integrar en la bandeja los comentarios vinculados a cada envío junto con el feedback general, mostrando orden, código y tipo de envío

## Notas dinámicas según precio vigente
- [x] Regenerar las notas automáticas cuando cambien tarifa, peso, extra, descuento, provincia, agencia o precio manual
- [x] Reemplazar referencias antiguas como 13,50 EUR por los valores actuales sin sobrescribir notas escritas manualmente
- [x] Mantener las notas actualizadas en creación, edición, recibos y rastreo
- [x] Añadir pruebas de cambios de tarifa y total, validar TypeScript, suite completa y publicar

## Tipo de identidad consistente en los envíos
- [x] Conservar para remitente y destinatario el tipo seleccionado al crear el envío
- [x] Restaurar Carta d’identità, pasaporte o DNI al editar y validar según su formato real
- [x] Mostrar en recibos, detalles y rastreo la etiqueta del tipo documental guardado
- [x] Añadir pruebas de persistencia, edición y validación; ejecutar la suite completa y publicar

## Acceso móvil al sitio publicado
- [x] Verificar el dominio público estable y reactivar la vista previa temporal si fuera necesario
- [x] Comprobar que el sitio publicado cargue desde una vista móvil y comunicar el enlace correcto

## Estimación de notificaciones de estado
- [x] Consultar costos vigentes de WhatsApp, SMS y llamadas o mensajes de voz para Perú e Italia
- [x] Comparar el costo por cambio de estado, envío y volumen mensual con supuestos explícitos

## Ruta con modalidad provincial integrada
- [x] Añadir la tercera ruta «Torino – Lima + provincia» y conservarla al crear o actualizar un envío
- [x] Integrar en esa ruta las agencias, destino provincial, precios, checklist y reglas que hoy dependen de un control separado
- [x] Completar Jr. de la Unión para Torino – Lima y Via Muriaglio 12, Torino para Lima – Torino en el entorno de Magdalena
- [x] Cubrir creación, actualización y recibos con pruebas; validar TypeScript, suite completa y publicar

## Notificaciones trazables con sonido
- [x] Incluir envío, orden, código, destinatario, actor y rol en los avisos de creación, actualización, papelera y restauración
- [x] Mostrar estado anterior y nuevo cuando se actualice un envío
- [x] Reproducir un ding ascendente de dos notas para avisos nuevos, con preferencia configurable y respeto al silencio del dispositivo
- [x] Añadir pruebas de mensajes, sonido y bandeja; validar TypeScript, suite completa y publicar

## Control de entrega ampliado
- [x] Ampliar el control de entrega impreso hasta aproximadamente tres cuartas partes de la hoja
- [x] Aumentar QR, margen blanco de escaneo y jerarquía visual para lectura más rápida
- [x] Verificar el formato en Servicom y Kasega, añadir pruebas, validar la suite y publicar

## Notificaciones leídas distinguibles
- [x] Mejorar el contraste de las notificaciones leídas con fondo, borde, icono y etiqueta visibles
- [x] Mantener los avisos nuevos con mayor prioridad visual y añadir pruebas, validar la suite y publicar

## Cierre visible y feedback solo administrativo
- [x] Añadir una X roja visible y accesible para cerrar la campana de notificaciones y Mi perfil
- [x] Ocultar Feedback recibido para Usuarios registradores y Clientes
- [x] Restringir el endpoint de feedback recibido exclusivamente a Administradores y cubrirlo con pruebas

## Corrección móvil de la campana
- [x] Mantener la X roja de cierre siempre visible en la cabecera de notificaciones móvil
- [x] Evitar el solapamiento entre sonido, marcar leídas y cierre en la cabecera móvil
- [x] Añadir prueba responsive, validar y publicar la corrección

## Numeración mensual de encomiendas
- [x] Generar órdenes de encomienda únicas en formato MMAA-XXXX, añadiendo dos dígitos antes del rango operativo final
- [x] Aplicar el rango operativo final 01–20 para sede Lima y 01–14 para provincia, también en Lima–Torino, sin usar un rango general 1–99
- [x] Actualizar validaciones, rastreo, QR, recibos y pruebas; validar y publicar

## Contabilidad operativa y reportes
- [x] Crear libro contable simplificado para Admin y Usuario con ingresos, egresos provinciales y gastos manuales
- [x] Calcular utilidad por mes y año, respetando los espacios administrativos aislados
- [x] Añadir filtro de periodo, detalle de encomiendas y registro de gastos por proceso de envío
- [x] Generar descargas PDF y Excel con el estado de resultados simplificado y la relación de encomiendas del periodo
- [x] Añadir pruebas de permisos, cálculos, exportaciones, validación y publicación

## Filtros de periodo contable
- [x] Incorporar los periodos Hoy, Semana actual, Mes y Rango personalizado en el resumen y exportaciones
- [x] Permitir seleccionar Semana 1, 2, 3 o 4 al filtrar un mes, con límites operativos claros
- [x] Actualizar pruebas de cálculo, interfaz, PDF/Excel, validar y publicar

## Registros completos en móvil
- [x] Sustituir la tabla horizontal de registros por tarjetas verticales completas en pantallas móviles
- [x] Mantener visibles destinatario, estado, pago, orden, código, fecha y todas las acciones sin recorte lateral
- [x] Añadir pruebas responsive, validar y publicar el rediseño móvil

## Tarifa exclusiva Kasega Tour
- [x] Aplicar 13 EUR/kg solo a encomiendas de Magdalena y kasegatour@gmail.com
- [x] Mantener 15 EUR/kg para Servicom y los demás entornos, incluso en notas, edición y recibos
- [x] Añadir pruebas de aislamiento tarifario, validar y publicar

## Avisos sonoros y contabilidad por ruta
- [x] Reforzar el sonido de nuevas notificaciones con un aviso audible, configurable y activado tras interacción del usuario
- [x] Separar Contabilidad de Admin y Usuario por Lima–Torino y Torino–Lima, manteniendo al Cliente sin acceso
- [x] Incluir la ruta seleccionada en los detalles, PDF y Excel contables
- [x] Añadir pruebas, validar y publicar

## Solicitud firmada de cambio de destinatario
- [x] Crear solicitudes protegidas de cambio de destinatario, sin modificar el envío hasta completar la firma del cliente
- [x] Verificar remitente, correo y cuenta Cliente antes de permitir el aviso y enlace de firma
- [x] Notificar a la cuenta y al correo del Cliente cuando corresponda, con enlace seguro de firma
- [x] Generar declaración jurada descargable para Lima–Torino y Torino–Lima con marca Servicom o Kasega Tour
- [x] Añadir interfaz para Admin/Usuario y Cliente, pruebas de seguridad, validación y publicación
- [x] Actualizar los mocks del panel administrativo para cubrir la mutación de solicitud de cambio de destinatario
- [x] Verificar y resolver el estado de carga del enlace público inválido de cambio de destinatario
