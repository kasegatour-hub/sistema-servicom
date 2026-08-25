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
  reference?: string;
};

export type RegionalTransportEntry = {
  id: RegionalTransportProvider;
  name: string;
  zone: "Norte" | "Centro y Selva Central" | "Sur";
  coverage: string;
  destinations: string[];
  locations?: RegionalTransportLocation[];
};

export const REGIONAL_TRANSPORT_DIRECTORY: RegionalTransportEntry[] = [
  { id: "cruz-del-sur", name: "Cruz del Sur", zone: "Norte", coverage: "Cobertura total de la costa norte hasta Tumbes.", destinations: ["Tumbes", "Piura", "Chiclayo", "Trujillo"] },
  { id: "movil-bus", name: "Movil Bus", zone: "Norte", coverage: "Rutas hacia Huaráz, Trujillo, Chiclayo y Cajamarca.", destinations: ["Huaraz", "Trujillo", "Chiclayo", "Cajamarca"] },
  { id: "civa-excluciva", name: "Civa / Excluciva", zone: "Norte", coverage: "Fuerte presencia en Piura, Chiclayo, Tumbes y Chachapoyas.", destinations: ["Piura", "Chiclayo", "Tumbes", "Chachapoyas"] },
  { id: "transportes-linea", name: "Transportes Línea", zone: "Norte", coverage: "Especialistas en Trujillo, Chiclayo, Piura y Cajamarca.", destinations: ["Trujillo", "Chiclayo", "Piura", "Cajamarca"] },
  { id: "oltursa", name: "Oltursa", zone: "Norte", coverage: "Destinos principales como Trujillo, Chiclayo y Piura.", destinations: ["Trujillo", "Chiclayo", "Piura"] },
  { id: "z-buss", name: "Z-Buss / Z Buss", zone: "Norte", coverage: "Rutas cortas y medianas hacia el Norte Chico y Ancash.", destinations: ["Huaral", "Huacho", "Barranca", "Huaraz"] },
  { id: "erick-el-rojo", name: "Erick El Rojo", zone: "Norte", coverage: "Rutas hacia Trujillo y Chiclayo.", destinations: ["Trujillo", "Chiclayo"] },
  { id: "america-express", name: "America Express", zone: "Norte", coverage: "Viajes frecuentes a Trujillo y Chimbote.", destinations: ["Trujillo", "Chimbote"] },
  { id: "turismo-dias", name: "Turismo Días", zone: "Norte", coverage: "Especialista en la ruta Lima - Cajamarca.", destinations: ["Cajamarca"] },
  { id: "itttsa-bus", name: "ITTSA Bus", zone: "Norte", coverage: "Servicio premium hacia Trujillo, Chiclayo, Piura y Paita.", destinations: ["Trujillo", "Chiclayo", "Piura", "Paita"] },
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
  { id: "expreso-selva", name: "Expreso Selva", zone: "Centro y Selva Central", coverage: "Rutas directas de Lima a Satipo y La Merced.", destinations: ["Satipo", "La Merced"] },
  { id: "grupo-palomino", name: "Grupo Palomino / Wari Palomino", zone: "Sur", coverage: "Rutas hacia Ayacucho, Abancay, Cusco y Andahuaylas.", destinations: ["Ayacucho", "Abancay", "Cusco", "Andahuaylas"] },
  { id: "perubus-soyuz", name: "PeruBus / Soyuz", zone: "Sur", coverage: "Salidas frecuentes hacia el sur chico.", destinations: ["Cañete", "Chincha", "Pisco", "Ica"] },
  { id: "flores-hermanos", name: "Flores Hermanos", zone: "Sur", coverage: "Rutas hacia el sur del país.", destinations: ["Pisco", "Ica", "Nazca", "Arequipa", "Moquegua", "Tacna"] },
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
