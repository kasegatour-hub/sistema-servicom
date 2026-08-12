# Verificación visual de la corrección de roles

La pantalla pública `/` muestra la marca Servicom Internacional, el RUC 20615004708, los campos de orden y código y el acceso a Admin. La pantalla `/admin` muestra el encabezado Admin Servicom Internacional, el formulario de correo y contraseña y no expone datos de cuentas internas antes de iniciar sesión.

La verificación visual no pudo abrir el modal de actualización ni la tabla de Registradores porque ambas vistas requieren una sesión administrativa. La compilación TypeScript y la suite de pruebas sí se ejecutaron sin errores después de los cambios.

## Verificación de ajustes de cuenta y recuperación

La ruta `/cuenta` se renderiza correctamente en escritorio y móvil con la marca Servicom Internacional, el formulario de inicio de sesión y el enlace de recuperación. La interfaz de recuperación ahora se ha simplificado para correo electrónico; la comprobación visual de la pantalla de registro se complementa con la prueba de componente de `PhoneInput`, que confirma el selector de país, el buscador y el valor vacío cuando no se introduce celular.

## Sección Ubícanos

La sección pública se visualizó correctamente en escritorio y móvil. Las tarjetas de Lima y Torino se apilan en pantallas estrechas, conservan contraste corporativo navy/naranja y muestran dirección, referencia, horario, contacto y botones accesibles para abrir Google Maps. El enlace proporcionado por el usuario para Lima se conserva exactamente; el enlace de Torino usa una búsqueda directa de Google Maps para Corso Peschiera 162A, Zona Piazza Sabotino.

La revisión final confirma que la tarjeta de Torino identifica correctamente “WhatsApp general: +51 970 188 447”, sin presentarlo como teléfono local, y conserva su botón de Google Maps.

## Estado de pago y nomenclatura de cliente

La ruta pública conserva el formulario de rastreo y la ruta `/cuenta` muestra correctamente el acceso de cliente con la marca Servicom Internacional. La tarjeta de resultado del rastreo incorpora el bloque “Estado de Pago”; las pruebas de componente simulan una búsqueda con `paymentStatus: "Pagado"` y verifican que el cliente ve “Pagado”. La cuenta autenticada usa el botón “Registrar Nuevo Documento”.

## Actualización de contactos Lima y Torino

La revisión de escritorio confirmó que la tarjeta de Lima muestra la referencia de la galería en el sótano frente a Saga Falabella, el fijo 01 390 7269 y ambos números de WhatsApp. La tarjeta de Torino muestra el teléfono +39 389 766 3723. En móvil, ambas tarjetas se apilan correctamente y los números permanecen legibles; los botones de mapas conservan ancho completo y son accesibles.
