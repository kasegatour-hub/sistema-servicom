# Verificación visual de seguridad y navegación administrativa

Se revisó la ruta `/admin` en escritorio (1280×720) y móvil (375×812). En ambos tamaños aparece el enlace visible **“Volver al inicio”** antes del formulario de acceso. El formulario muestra campos vacíos con placeholders, sin credenciales precargadas por la aplicación. En móvil, el título se adapta a dos líneas y los campos y el botón de inicio permanecen dentro del contenedor sin desbordamiento.

La vista autenticada y el formulario de cambio de contraseña están cubiertos por la prueba de componente `AdminDashboard.test.tsx`; la suite completa alcanzó 33 archivos y 87 pruebas aprobadas, y la compilación de producción terminó correctamente.

Nota: la verificación manual con una sesión administrativa real no fue necesaria para esta iteración; se validó el flujo mediante pruebas automatizadas y la vista pública de acceso.
