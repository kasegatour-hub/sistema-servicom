# Verificación visual de la corrección de roles

La pantalla pública `/` muestra la marca Servicom Internacional, el RUC 20615004708, los campos de orden y código y el acceso a Admin. La pantalla `/admin` muestra el encabezado Admin Servicom Internacional, el formulario de correo y contraseña y no expone datos de cuentas internas antes de iniciar sesión.

La verificación visual no pudo abrir el modal de actualización ni la tabla de Registradores porque ambas vistas requieren una sesión administrativa. La compilación TypeScript y la suite de pruebas sí se ejecutaron sin errores después de los cambios.
