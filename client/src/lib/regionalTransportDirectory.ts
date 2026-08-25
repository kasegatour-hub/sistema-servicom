export type RegionalTransportProvider =
  | "cruz-del-sur" | "movil-bus" | "civa-excluciva" | "transportes-linea" | "oltursa" | "z-buss" | "erick-el-rojo" | "america-express" | "turismo-dias" | "itttsa-bus" | "allin-bus" | "ronco-peru" | "inca-atahualpa" | "eurobus"
  | "expreso-lobato" | "molina-union" | "transportes-apocalipsis" | "nacional-fano" | "bahia-plaza" | "transmar" | "turismo-raraz" | "giga-bus-megabus" | "expreso-selva"
  | "grupo-palomino" | "perubus-soyuz" | "flores-hermanos" | "cromotex" | "expreso-ormeno" | "expreso-antezana" | "saky" | "cetur" | "san-cristobal-del-sur" | "turismo-oropesa";

export type RegionalTransportLocation = {
  id: string;
  name: string;
  address: string;
  department?: string;
  province?: string;
  district?: string;
  phone?: string;
  businessHours?: string;
  hoursStatus?: "published" | "confirm";
  reference?: string;
  sourceUrl?: string;
};

export type RegionalTransportEntry = {
  id: RegionalTransportProvider;
  name: string;
  zone: "Norte" | "Centro y Selva Central" | "Sur";
  coverage: string;
  destinations: string[];
  locations?: RegionalTransportLocation[];
  officialDirectoryUrl?: string;
};

export const REGIONAL_TRANSPORT_DIRECTORY: RegionalTransportEntry[] = [
  { id: "cruz-del-sur", name: "Cruz del Sur", zone: "Norte", coverage: "Cobertura total de la costa norte hasta Tumbes.", destinations: ["Tumbes", "Piura", "Chiclayo", "Trujillo"], officialDirectoryUrl: "https://www.cruzdelsur.com.pe/terminal-lima/", locations: [
    { id: "cruz-del-sur-lima-javier-prado", name: "Lima — Terminal Javier Prado", address: "Av. Javier Prado Este N.° 1109, Urb. El Palomar, Lima 13, Perú", department: "Lima", province: "Lima", district: "La Victoria", phone: "(01) 311-5030 anexo 6000", businessHours: "Lunes a domingo, 03:00–23:45", hoursStatus: "published", reference: "Terminal publicado por Cruz del Sur; confirmar la ventanilla de encomiendas antes de entregar.", sourceUrl: "https://www.cruzdelsur.com.pe/terminal-lima/" }
  ] },
  { id: "movil-bus", name: "Movil Bus", zone: "Norte", coverage: "Rutas hacia Huaráz, Trujillo, Chiclayo y Cajamarca.", destinations: ["Huaraz", "Trujillo", "Chiclayo", "Cajamarca"], officialDirectoryUrl: "https://www.movilbus.pe/viajar-bus/lima", locations: [
    { id: "movil-bus-tomas-valle", name: "Lima — Terrapuerto del Norte", address: "Av. Tomás Valle 651, Terrapuerto del Norte, San Martín de Porres, Lima, Perú", department: "Lima", province: "Lima", district: "San Martín de Porres", phone: "(01) 716-8000", businessHours: "Encomiendas: lunes a domingo, 07:00–22:00", hoursStatus: "published", sourceUrl: "https://www.movilbus.pe/viajar-bus/lima" },
    { id: "movil-bus-nicolas-arriola", name: "Lima — Terminal La Victoria", address: "Av. Nicolás Arriola 740, La Victoria, Lima, Perú", department: "Lima", province: "Lima", district: "La Victoria", phone: "(01) 716-8000", businessHours: "Encomiendas: lunes a domingo, 07:00–22:00", hoursStatus: "published", sourceUrl: "https://www.movilbus.pe/viajar-bus/lima" },
    { id: "movil-bus-paseo-republica", name: "Lima — Paseo de la República", address: "Av. Paseo de la República 767, La Victoria, Lima, Perú", department: "Lima", province: "Lima", district: "La Victoria", phone: "(01) 716-8000", businessHours: "Encomiendas: lunes a domingo, 07:00–22:00", hoursStatus: "published", sourceUrl: "https://www.movilbus.pe/viajar-bus/lima" }
  ] },
  { id: "civa-excluciva", name: "Civa / Excluciva", zone: "Norte", coverage: "Fuerte presencia en Piura, Chiclayo, Tumbes y Chachapoyas.", destinations: ["Piura", "Chiclayo", "Tumbes", "Chachapoyas"], officialDirectoryUrl: "https://www.civa.com.pe/contact" },
  { id: "transportes-linea", name: "Transportes Línea", zone: "Norte", coverage: "Especialistas en Trujillo, Chiclayo, Piura y Cajamarca.", destinations: ["Trujillo", "Chiclayo", "Piura", "Cajamarca"], officialDirectoryUrl: "https://www.linea.pe/carga_encomienda.aspx", locations: [
    { id: "linea-lima-paseo-republica", name: "Lima — Paseo de la República", address: "Av. Paseo de la República 979, La Victoria, Lima, Perú", department: "Lima", province: "Lima", district: "La Victoria", phone: "995 730 051 · 980 363 051", businessHours: "Lunes a sábado, 07:00–22:00; domingo, 08:00–20:00", hoursStatus: "published", sourceUrl: "https://www.linea.pe/carga_encomienda.aspx" },
    { id: "linea-lima-isabel-catolica", name: "Lima — Isabel La Católica", address: "Av. Isabel La Católica N.° 660, La Victoria, Lima, Perú", department: "Lima", province: "Lima", district: "La Victoria", phone: "995 730 008", businessHours: "Lunes a sábado, 10:00–19:00", hoursStatus: "published", sourceUrl: "https://www.linea.pe/carga_encomienda.aspx" },
    { id: "linea-chiclayo", name: "Chiclayo — Carga", address: "Carretera Panamericana Sur N.° 770, Urb. La Victoria, Chiclayo, Lambayeque, Perú", department: "Lambayeque", province: "Chiclayo", district: "La Victoria", phone: "979 172 277 · 971 646 555", businessHours: "Lunes a sábado, 07:00–22:00; domingo, 09:00–18:00", hoursStatus: "published", sourceUrl: "https://www.linea.pe/carga_encomienda.aspx" },
    { id: "linea-piura", name: "Piura — Sánchez Cerro", address: "Av. Sánchez Cerro N.° 1213, Piura, Perú", department: "Piura", province: "Piura", district: "Piura", phone: "969 633 359", businessHours: "Lunes a sábado, 07:00–21:00; domingo, 08:00–17:00", hoursStatus: "published", sourceUrl: "https://www.linea.pe/carga_encomienda.aspx" },
    { id: "linea-huaraz", name: "Huaraz — Carga", address: "Jr. Simón Bolívar N.° 450, Huaraz, Áncash, Perú", department: "Áncash", province: "Huaraz", district: "Huaraz", phone: "965 089 415 · 943 670 478", businessHours: "Lunes a domingo, 07:00–21:30", hoursStatus: "published", sourceUrl: "https://www.linea.pe/carga_encomienda.aspx" }
  ] },
  { id: "oltursa", name: "Oltursa", zone: "Norte", coverage: "Destinos principales como Trujillo, Chiclayo y Piura.", destinations: ["Trujillo", "Chiclayo", "Piura"], officialDirectoryUrl: "https://www.oltursa.pe/oficina/lima", locations: [
    { id: "oltursa-surquillo", name: "Lima — Surquillo", address: "Jr. Portocarrero N.° 380, Surquillo, Lima, Perú", department: "Lima", province: "Lima", district: "Surquillo", phone: "989 303 924 · 994 616 492", businessHours: "Lunes a domingo, 07:00–21:30", hoursStatus: "published", sourceUrl: "https://www.oltursa.pe/oficina/lima" },
    { id: "oltursa-independencia", name: "Lima — Independencia", address: "Av. Túpac Amaru cuadra 69, Independencia, Lima, Perú", department: "Lima", province: "Lima", district: "Independencia", phone: "991 964 890", businessHours: "Lunes a domingo, 07:30–22:00", hoursStatus: "published", sourceUrl: "https://www.oltursa.pe/oficina/lima" },
    { id: "oltursa-panam-sur", name: "Lima — Panamericana Sur", address: "Vía Auxiliar Carretera Panamericana Sur km 11.3, counter 37–38, Lima, Perú", department: "Lima", province: "Lima", district: "Lima", phone: "989 125 204", businessHours: "Lunes a domingo, 07:00–21:00", hoursStatus: "published", sourceUrl: "https://www.oltursa.pe/oficina/lima" }
  ] },
  { id: "z-buss", name: "Z-Buss / Z Buss", zone: "Norte", coverage: "Rutas cortas y medianas hacia el Norte Chico y Ancash.", destinations: ["Huaral", "Huacho", "Barranca", "Huaraz"] },
  { id: "erick-el-rojo", name: "Erick El Rojo", zone: "Norte", coverage: "Rutas hacia Trujillo y Chiclayo.", destinations: ["Trujillo", "Chiclayo"] },
  { id: "america-express", name: "America Express", zone: "Norte", coverage: "Viajes frecuentes a Trujillo y Chimbote.", destinations: ["Trujillo", "Chimbote"] },
  { id: "turismo-dias", name: "Turismo Días", zone: "Norte", coverage: "Especialista en la ruta Lima - Cajamarca.", destinations: ["Cajamarca"] },
  { id: "itttsa-bus", name: "ITTSA Bus", zone: "Norte", coverage: "Servicio premium hacia Trujillo, Chiclayo, Piura y Paita.", destinations: ["Trujillo", "Chiclayo", "Piura", "Paita"], officialDirectoryUrl: "https://www.ittsabus.com/agencias.php", locations: [
    { id: "ittsa-lima", name: "Lima — La Victoria", address: "Av. Paseo de la República N.° 809, La Victoria, Lima, Perú", department: "Lima", province: "Lima", district: "La Victoria", phone: "044-284644", businessHours: "Horario no publicado en el listado de agencias; confirmar antes de entregar.", hoursStatus: "confirm", sourceUrl: "https://www.ittsabus.com/agencias.php" },
    { id: "ittsa-plaza-norte", name: "Lima — Plaza Norte", address: "Av. Gerardo Unger 6911, Terminal Terrestre Plaza Norte, stands LB106–LB107, Independencia, Lima, Perú", department: "Lima", province: "Lima", district: "Independencia", phone: "044-284644", businessHours: "07:00–20:30", hoursStatus: "published", sourceUrl: "https://www.ittsabus.com/agencia_detalle.php?age_id=17" },
    { id: "ittsa-chiclayo", name: "Chiclayo", address: "Av. Grau N.° 497, Chiclayo, Lambayeque, Perú", department: "Lambayeque", province: "Chiclayo", district: "Chiclayo", phone: "044-284644", businessHours: "Horario no publicado en el listado de agencias; confirmar antes de entregar.", hoursStatus: "confirm", sourceUrl: "https://www.ittsabus.com/agencias.php" },
    { id: "ittsa-trujillo-terrapuerto", name: "Trujillo — Terrapuerto", address: "Carretera Panamericana Norte km 558, Trujillo, La Libertad, Perú", department: "La Libertad", province: "Trujillo", district: "Trujillo", phone: "044-284644", businessHours: "Horario no publicado en el listado de agencias; confirmar antes de entregar.", hoursStatus: "confirm", sourceUrl: "https://www.ittsabus.com/agencias.php" },
    { id: "ittsa-piura", name: "Piura — Terminal", address: "Av. Avelino Cáceres Mz. 249 Lt. 02, Zona Industrial, Piura, Perú", department: "Piura", province: "Piura", district: "Piura", phone: "044-284644", businessHours: "Horario no publicado en el listado de agencias; confirmar antes de entregar.", hoursStatus: "confirm", sourceUrl: "https://www.ittsabus.com/agencias.php" }
  ] },
  { id: "allin-bus", name: "Allin Bus", zone: "Norte", coverage: "Destinos hacia Chimbote, Trujillo y Chiclayo.", destinations: ["Chimbote", "Trujillo", "Chiclayo"] },
  { id: "ronco-peru", name: "Internacional Ronco Perú", zone: "Norte", coverage: "Conexiones directas a Cajamarca y Piura.", destinations: ["Cajamarca", "Piura"] },
  { id: "inca-atahualpa", name: "Inca Atahualpa", zone: "Norte", coverage: "Salidas consistentes hacia Cajamarca y el norte.", destinations: ["Cajamarca", "Piura", "Chiclayo"] },
  { id: "eurobus", name: "Eurobus", zone: "Norte", coverage: "Buses hacia Cajamarca y zonas aledañas.", destinations: ["Cajamarca", "Celendín", "San Marcos"] },
  { id: "expreso-lobato", name: "Expreso Lobato", zone: "Centro y Selva Central", coverage: "Rutas emblemáticas a la Selva Central.", destinations: ["Tarma", "La Merced", "Oxapampa", "Satipo"], locations: [
    { id: "expreso-lobato-satipo-terminal", name: "Satipo — Terminal Terrestre Municipal", address: "Terminal Terrestre Municipal de Satipo, Satipo, Junín, Perú", department: "Junín", province: "Satipo", district: "Satipo", phone: "994 629 100", reference: "Punto de desembarque para envíos con destino Satipo; confirmar ventanilla al entregar." },
    { id: "expreso-lobato-mazamari", name: "Mazamari", address: "Av. del Pangoa s/n, Mazamari 12301, Junín, Perú", department: "Junín", province: "Satipo", district: "Mazamari", phone: "994 629 101", reference: "Referencia pública MFC9+PF7; la dirección oficial figura como Av. del Pangoa s/n." },
    { id: "expreso-lobato-pangoa-terminal", name: "San Martín de Pangoa — Terminal Terrestre", address: "Calle 7 de Junio y Australia, Terminal Terrestre, stand N.° 9, San Martín de Pangoa, Junín, Perú", department: "Junín", province: "Satipo", district: "San Martín de Pangoa", phone: "994 629 114" },
    { id: "expreso-lobato-pangoa-av-espana", name: "San Martín de Pangoa — Agencia Av. España", address: "Av. España N.° 432, San Martín de Pangoa, Junín, Perú", department: "Junín", province: "Satipo", district: "San Martín de Pangoa", phone: "994 629 106" }
  ] },
  { id: "molina-union", name: "Molina Unión", zone: "Centro y Selva Central", coverage: "Viajes hacia el centro y zonas de Ayacucho.", destinations: ["Huancayo", "Ayacucho", "Huancavelica"] },
  { id: "transportes-apocalipsis", name: "Transportes Apocalipsis", zone: "Centro y Selva Central", coverage: "Destino principal hacia Huancayo, Jauja, Tarma y Huánuco.", destinations: ["Huancayo", "Jauja", "Tarma", "Huánuco"] },
  { id: "nacional-fano", name: "Nacional Fano", zone: "Centro y Selva Central", coverage: "Destinos en Huánuco, Tingo María y Pucallpa.", destinations: ["Huánuco", "Tingo María", "Pucallpa"] },
  { id: "bahia-plaza", name: "Bahía Plaza", zone: "Centro y Selva Central", coverage: "Conexiones hacia Huancayo y el Valle del Mantaro.", destinations: ["Huancayo", "Jauja", "Valle del Mantaro"] },
  { id: "transmar", name: "Transmar", zone: "Centro y Selva Central", coverage: "Gran cobertura hacia la selva.", destinations: ["Pucallpa", "Tingo María", "Tarapoto"] },
  { id: "turismo-raraz", name: "Turismo Raraz", zone: "Centro y Selva Central", coverage: "Rutas hacia el centro del país y Pasco.", destinations: ["Cerro de Pasco", "Huancayo", "Tarma"] },
  { id: "giga-bus-megabus", name: "Giga Bus / Megabus", zone: "Centro y Selva Central", coverage: "Conexiones hacia Huancayo y Huánuco.", destinations: ["Huancayo", "Huánuco"] },
  { id: "expreso-selva", name: "Expreso Selva", zone: "Centro y Selva Central", coverage: "Rutas directas de Lima a Satipo y La Merced.", destinations: ["Satipo", "La Merced"], officialDirectoryUrl: "https://expresoselva.com/agencias/", locations: [
    { id: "expreso-selva-lima", name: "Lima — La Victoria", address: "Av. Luna Pizarro 453, La Victoria, Lima, Perú", department: "Lima", province: "Lima", district: "La Victoria", phone: "+51 990 992 887", businessHours: "Horario no publicado por la empresa; confirmar antes de entregar.", hoursStatus: "confirm", sourceUrl: "https://expresoselva.com/agencias/" },
    { id: "expreso-selva-la-merced", name: "La Merced", address: "Av. Carlos A. Peschiera N.° 521, La Merced, Chanchamayo, Junín, Perú", department: "Junín", province: "Chanchamayo", district: "Chanchamayo", phone: "+51 921 273 762", businessHours: "Horario no publicado por la empresa; confirmar antes de entregar.", hoursStatus: "confirm", sourceUrl: "https://expresoselva.com/agencias/" },
    { id: "expreso-selva-satipo", name: "Satipo — Terminal Municipal", address: "Jr. Augusto B. Leguía, Terminal Municipal, Satipo, Junín, Perú", department: "Junín", province: "Satipo", district: "Satipo", phone: "+51 922 520 324", businessHours: "Horario no publicado por la empresa; confirmar antes de entregar.", hoursStatus: "confirm", sourceUrl: "https://expresoselva.com/agencias/" },
    { id: "expreso-selva-santa-ana", name: "Santa Ana", address: "Av. Marginal Mz. N Lt. 6, Urb. Santa Ana, Junín, Perú", department: "Junín", province: "La Convención", district: "Santa Ana", phone: "+51 922 510 109", businessHours: "Horario no publicado por la empresa; confirmar antes de entregar.", hoursStatus: "confirm", sourceUrl: "https://expresoselva.com/agencias/" }
  ] },
  { id: "grupo-palomino", name: "Grupo Palomino / Wari Palomino", zone: "Sur", coverage: "Red publicada hacia el sur y Apurímac; selecciona el destino y verifica la sede exacta con el directorio oficial si no aparece una dirección confirmada.", destinations: ["Abancay", "Andahuaylas", "Arequipa", "Ayacucho", "Camaná", "Chalhuanca", "Chincheros", "Chuquibambilla", "Coracora", "Cusco", "Ica", "Izcuchaca", "Limatambo", "Marcona", "Nasca", "Pamparichi", "Puerto Maldonado", "Puquio", "San Clemente", "Uripa"], locations: [
    { id: "grupo-palomino-lima-principal", name: "Lima — Agencia principal", address: "Av. Nicolás Arriola 906, La Victoria, Lima, Perú", department: "Lima", province: "Lima", district: "La Victoria", phone: "620-2333 anexo 100 · +51 997 769 702", reference: "Agencia principal publicada por Grupo Palomino. Correo: ventatelefonica@tpalomino.pe." }
  ] },
  { id: "perubus-soyuz", name: "PeruBus / Soyuz", zone: "Sur", coverage: "Salidas frecuentes hacia el sur chico.", destinations: ["Cañete", "Chincha", "Pisco", "Ica"], officialDirectoryUrl: "https://www.perubus.com.pe/contact" },
  { id: "flores-hermanos", name: "Flores Hermanos", zone: "Sur", coverage: "Rutas hacia el sur del país.", destinations: ["Pisco", "Ica", "Nazca", "Arequipa", "Moquegua", "Tacna"], officialDirectoryUrl: "https://floreshnos.pe/index.php/contacto/", locations: [
    { id: "flores-hermanos-lima", name: "Lima — La Victoria", address: "Av. Paseo de la República 627, La Victoria, Lima, Perú", department: "Lima", province: "Lima", district: "La Victoria", phone: "(01) 480-0725", businessHours: "Horario no publicado por la empresa; confirmar antes de entregar.", hoursStatus: "confirm", sourceUrl: "https://floreshnos.pe/index.php/contacto/" }
  ] },
  { id: "cromotex", name: "Cromotex", zone: "Sur", coverage: "Rutas directas y servicios cama hacia Arequipa y Cusco.", destinations: ["Arequipa", "Cusco"] },
  { id: "expreso-ormeno", name: "Expreso Internacional Ormeño", zone: "Sur", coverage: "Tradicional ruta del sur hacia Tacna.", destinations: ["Tacna"] },
  { id: "expreso-antezana", name: "Expreso Antezana", zone: "Sur", coverage: "Conexiones hacia Huancavelica, Ayacucho y Huancayo.", destinations: ["Huancavelica", "Ayacucho", "Huancayo"] },
  { id: "saky", name: "Saky S.A.", zone: "Sur", coverage: "Conexión directa Lima - Pisco e Ica.", destinations: ["Pisco", "Ica"] },
  { id: "cetur", name: "Cetur", zone: "Sur", coverage: "Salidas programadas hacia Arequipa y Tacna.", destinations: ["Arequipa", "Tacna"] },
  { id: "san-cristobal-del-sur", name: "San Cristóbal del Sur", zone: "Sur", coverage: "Rutas hacia Ayacucho y Apurímac.", destinations: ["Ayacucho", "Andahuaylas", "Abancay"] },
  { id: "turismo-oropesa", name: "Turismo Oropesa", zone: "Sur", coverage: "Rutas hacia Abancay y Cusco.", destinations: ["Abancay", "Cusco"] },
];

export const REGIONAL_TRANSPORT_BY_ID = Object.fromEntries(REGIONAL_TRANSPORT_DIRECTORY.map(entry => [entry.id, entry])) as Record<RegionalTransportProvider, RegionalTransportEntry>;
export const REGIONAL_TRANSPORT_IDS = REGIONAL_TRANSPORT_DIRECTORY.map(entry => entry.id) as RegionalTransportProvider[];
