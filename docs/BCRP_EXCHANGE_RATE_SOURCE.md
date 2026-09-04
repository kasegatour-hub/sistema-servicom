# Fuente oficial del tipo de cambio EUR/PEN

Fuente consultada: https://estadisticas.bcrp.gob.pe/estadisticas/series/ayuda/api

El BCRPData documenta consultas mediante GET con la estructura `https://estadisticas.bcrp.gob.pe/estadisticas/series/api/[códigos de series]/[formato de salida]/[periodo inicial]/[periodo final]/[idioma]` y admite JSON.

La serie oficial usada para este proyecto es `PD04648PD`, identificada como **TC Euro (S/ por Euro) - Venta**. Consulta JSON: https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04648PD/json

La respuesta contiene `periods`, cada período con `name` y `values[0]`. Se selecciona el último valor numérico positivo disponible, ignorando valores `n.d.`. La cotización aplicada por Servicom es el valor BCRP más **S/ 0,15 por EUR** de comisión.

Ejemplo observado en la consulta del 4 de septiembre de 2026: el último dato publicado fue 3,914 para 03.Set.26; la tasa aplicada resultaría 4,064 soles por euro antes de redondear importes.
