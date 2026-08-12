## Verificación visual — validación de identidad

Se verificaron las rutas `/cuenta` y `/admin` después de integrar los filtros de nombres y DNI. Ambas pantallas cargan correctamente sin errores visibles: `/cuenta` muestra el formulario de inicio de sesión de Servicom Internacional y `/admin` muestra el acceso administrativo. La verificación de los campos restringidos requiere entrar al modo de registro o a un panel autenticado; las pruebas unitarias cubren las reglas backend compartidas.

## Verificación visual final — pago y validación

Se volvieron a verificar `/cuenta` y `/admin` después de los últimos cambios. Ambas rutas cargan correctamente en el viewport de escritorio, muestran la identidad de Servicom Internacional y no presentan errores visibles en la pantalla de acceso. La visualización de los campos internos de registro y actualización queda respaldada por la comprobación TypeScript y la suite de pruebas, ya que las rutas requieren sesión para mostrar esos formularios.
