# Principios aplicados al rediseño operativo

Este rediseño toma como referencia los materiales aportados sobre Diseño Centrado en el Usuario, usabilidad y factores humanos. Las decisiones operativas se orientan a que Registradores y Master Admin reconozcan el estado del sistema de un vistazo, puedan completar tareas frecuentes con pocos pasos y recuperarse de errores sin perder contexto.

| Principio | Aplicación en el panel de Servicom |
|---|---|
| Visibilidad del estado del sistema | Los filtros incluyen todos los estados logísticos, incluido **Entregado**, y conservan la combinación con el estado de pago. |
| Reconocimiento antes que memoria | Los controles usan etiquetas explícitas como «Entregado», «Pagados» y «Actualizar» en lugar de exigir recordar criterios. |
| Flexibilidad y eficiencia | La calculadora científica permanece disponible como herramienta flotante, sin obligar a cambiar de espacio de trabajo. |
| Prevención y recuperación de errores | El QR de control consulta orden y código directamente y solo abre el envío autorizado cuando los datos estén disponibles. |
| Diseño estético y minimalista | La calculadora se reduce a un acceso compacto, se expande solo cuando se necesita y evita ocupar el flujo de registro. |
| Gestalt: proximidad, similitud y continuidad | Los filtros se agrupan como una barra operativa coherente y las acciones primarias se mantienen visualmente consistentes. |

La respuesta total de un escaneo no puede garantizarse en 0,005 segundos porque depende de cámara, dispositivo y red. El sistema reduce el trabajo local de lectura mediante cuadros limitados, procesamiento sincronizado y consulta directa por orden y código.
