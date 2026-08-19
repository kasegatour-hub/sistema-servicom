# Notas de validación de la continuación

- La página pública acepta `/?order=3520992723&code=CA06721WB` y muestra el registro de demostración con estado `Entregado`.
- La línea de tiempo pública presenta las cuatro etapas: `En agencia`, `En tránsito`, `En destino` y `Entregado`; el último evento de cada etapa se visualiza correctamente.
- El panel administrativo acepta las credenciales vigentes después de normalizar la contraseña con `trim()` y actualizar la cuenta en la base de datos.
- El formulario de creación muestra Número de Orden, Código, Estado Inicial con `Entregado`, cuatro campos de Remitente, cuatro campos de Destinatario y Notas.
- La tabla administrativa muestra destinatario, estados coloreados, orden descendente, actualización, impresión y eliminación.
- La vista previa de recibo genera un QR y muestra la identificación corporativa; las políticas legales están incluidas en el documento HTML que se abre al imprimir.
- El contenedor de vista previa tiene desplazamiento interno; la tarjeta de vista previa actualmente muestra la información resumida y el QR.
- La suite actualizada pasó: 2 archivos de prueba y 6 pruebas.
- TypeScript pasó sin errores en la ejecución conjunta previa a la suite.
- La vista móvil de **Mi cuenta** muestra «Recordar este dispositivo» con la explicación de una sesión de hasta 30 días sin volver a solicitar la contraseña y cierre revocable.
- La vista móvil de **Admin** presenta la misma explicación de sesión recordada sin desbordes ni texto oculto.
- La plantilla de carta aportada usa una primera página con bandera italiana, dos columnas de títulos en italiano e inglés, tabla con bordes finos y campos bilingües, seguida de bloques de declaración y de privacidad a dos columnas; las próximas modificaciones deben respetar únicamente ese contenido y su estructura.
- La tercera página contiene los avisos de privacidad, lugar y fecha, firma y anexos; el recurso `27098.webp` es la bandera italiana tricolor que debe usarse en la cabecera de la plantilla.
- El encabezado confirma los títulos «DICHIARAZIONE GARANZIA E/O ALLOGGIO» y «PROOF OF SPONSORSHIP AND/OR PRIVATE ACCOMMODATION» en columnas alineadas; el bloque personal usa exactamente las etiquetas italiano/inglés de la tabla de referencia.
- La estructura central incorpora el bloque opcional de sociedades, las casillas de alojamiento y una segunda tabla para la persona invitada; sus rótulos son italiano/inglés y no deben sustituirse por rótulos propios.
- Las declaraciones de la plantilla incluyen casillas para sostenimiento, seguro, garantía bancaria y los avisos normativos de los artículos 7 y 12 del D. Lgs. n. 286/1998, siempre con la traducción inglesa en cursiva a continuación.
- Los avisos de protección de datos ocupan dos cajas paralelas de texto en italiano e inglés, con títulos en negrita y borde negro fino, por lo que la réplica debe conservar estas columnas sin insertar contenido corporativo adicional.
- La referencia del buscador muestra un bloque ancho de fondo azul muy claro, etiqueta bilingüe, campo horizontal y ayuda; se sustituirá por dos buscadores equivalentes, uno para invitante y otro para invitado.
- La ayuda de búsqueda indica pasaporte, carta d’identità, DNI, nombre o apellido y aclara que admite tildes faltantes o errores menores; este texto orientará los dos campos de autocompletado.

## Incidencias observadas

- Los logs conservan un `ReferenceError: longtext is not defined` de una sesión antigua; después del reinicio no reaparece y el servidor inicia correctamente.
- La primera prueba de login falló porque el registro de `admins` no tenía la contraseña vigente; se sincronizó mediante SQL y el login volvió a responder correctamente.

## Próximos pasos

- Completar la revisión final de código y pruebas.
- Marcar tareas completadas en `todo.md`.
- Guardar checkpoint de la versión validada.
- Entregar al usuario el enlace de la versión.
