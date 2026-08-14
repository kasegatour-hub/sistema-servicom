# Verificación visual de entrada y autenticación

Se revisaron las rutas `/admin` y `/cuenta` en escritorio (1280×720). Ambas muestran un formulario de inicio de sesión como punto de entrada de sus áreas privadas, con campos vacíos, sin credenciales precargadas y con enlaces de retorno visibles. `/admin` conserva el enlace “Volver al inicio”; `/cuenta` conserva “Volver al rastreo”. La captura confirma que los formularios permanecen centrados y no presentan desbordamientos.

La separación Documentos/Encomiendas se validó mediante prueba de componente, porque la vista administrativa autenticada requiere una sesión de operador real para mostrar el listado.

La suite de validación final alcanzó 34 archivos y 92 pruebas aprobadas; la compilación de producción también terminó correctamente.
