# Fuentes oficiales para el directorio FedEx y DHL

## FedEx

- Localizador global oficial: https://local.fedex.com/en
- Localizador oficial para Perú: https://local.fedex.com/en-pe
- La página oficial muestra búsqueda por ciudad, provincia/estado, código postal o ciudad y país. También publica enlaces por país, incluyendo Perú e Italia, y está orientada a consultar direcciones, horarios, teléfonos y servicios de cada ubicación.

## DHL

- Localizador global oficial DHL: https://locator.dhl.com/?l=en&countryCode=IT
- Buscador oficial DHL eCommerce para Italia: https://www.dhl.com/it-en/home/ecommerce/dhl-ecommerce-servicepoint-finder.html
- Catálogo oficial de API DHL Location Finder: https://developer.dhl.com/api-catalog
- Referencia oficial de API Location Finder Unified: https://developer.dhl.com/api-reference/location-finder-unified?language_content_entity=en
- El localizador de DHL es dinámico y puede requerir JavaScript; la documentación oficial indica que Location Finder Unified sirve para descubrir ubicaciones por dirección o coordenadas.

## Decisión de integración

No se debe copiar una lista mundial estática sin fecha de actualización. El selector debe incorporar FedEx y DHL como proveedores, consultar o enlazar sus localizadores oficiales cuando la fuente dinámica no permita una extracción fiable, conservar la opción de sede manual y mostrar la fuente oficial de cada resultado. Para datos completos y actualizados por país, la vía recomendada es utilizar los localizadores oficiales o sus APIs autorizadas; no se deben inventar horarios, teléfonos o direcciones.
