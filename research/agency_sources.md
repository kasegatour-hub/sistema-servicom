# Fuentes de agencias verificadas

## Revisión inicial — 2026-08-22

| Proveedor | Fuente oficial | Hallazgo operativo |
| --- | --- | --- |
| Shalom | https://agencias.shalom.pe/ y https://shalom.com.pe/agencias | La propia comunicación pública de Shalom identifica `agencias.shalom.pe` como directorio de agencias. La consulta redirigió al sitio principal y no expuso el listado dinámico en esta sesión; no se incorporarán nombres no verificables desde una extracción incompleta. |
| Olva Courier | https://www.olvacourier.com/ubicanos/ | El directorio oficial ofrece búsqueda por distrito o departamento y filtros de Tienda/Agente. Su página carga datos vigentes desde `https://www.olvacourier.com/wp-admin/admin-ajax.php?action=get_olva_stores`, fuente pública detectada durante la sesión. |

La interfaz usará Places de Google para consultar coincidencias vigentes en tiempo real y limitará la selección a nombres que correspondan a Shalom u Olva Courier. Para Olva, el listado normalizado se obtendrá desde su fuente pública oficial. El listado curado solo incluirá registros verificables y tendrá su fuente indicada.
