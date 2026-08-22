# Verificación de directorios oficiales de agencias

Fecha de consulta: 22 de agosto de 2026.

| Empresa | Fuente oficial | Hallazgo útil para el producto |
|---|---|---|
| Olva Courier | https://www.olvacourier.com/ubicanos/ | El directorio oficial muestra un buscador «Busca un distrito o departamento», filtros Todo/Tienda/Agente y un mapa Leaflet/OpenStreetMap. La interfaz carga agencias dinámicamente, por lo que se debe consumir solo su fuente pública verificable y conservar los datos que entrega (nombre, dirección, tipo y coordenadas). |
| Shalom | https://shalom.com.pe/agencias | La aplicación oficial carga un mapa y controles de Agencias/Puntos PRO. El análisis pasivo de sus recursos detectó el endpoint público `https://serviceswebapi.shalomcontrol.com/api/v1/web/agencias/version`; se investigará su estructura antes de integrarlo. |

Al consultar el endpoint detectado el 22 de agosto de 2026, el servicio devolvió HTTP 503 sin contenido utilizable. La integración deberá manejar esta indisponibilidad con un estado claro y no sustituir datos verificados por nombres o direcciones inventados.

La interfaz oficial de Shalom sí muestra un mapa con numerosos marcadores y un cuadro de búsqueda por departamento, provincia o distrito, además de las pestañas Agencias y Puntos PRO. Esto confirma que un listado de detalle por sede es el patrón correcto para el selector interno, siempre que los datos procedan de la fuente oficial disponible en tiempo de consulta.

El paquete público de Shalom declara una consulta `POST /api/v1/web/agencias/listar` y normaliza, entre otros, estos campos: identificador, nombre, lugar, zona, provincia, departamento, estado, dirección, teléfono, horarios, coordenadas y capacidades operativas. Durante esta consulta de desarrollo, su host respondió 503; el selector debe presentar esa indisponibilidad sin ocultar la alternativa de sede manual.

La aplicación oficial de Shalom mantenía un caché ya cargado por su propio directorio. Se obtuvo una instantánea verificable de **546 agencias** desde esa fuente oficial y se conservó para la integración en `research/shalom-official-agencies-snapshot-2026-08-22.json`. El registro contiene nombre, ubicación administrativa, dirección, teléfono, horarios y coordenadas.

La captura aportada por el usuario muestra la experiencia esperada: búsqueda por ubicación, listado de agencias con nombre y dirección, detalle de sede y selección para completar el destino. La implementación debe distinguir el directorio propio de cada empresa de resultados genéricos de Places.
