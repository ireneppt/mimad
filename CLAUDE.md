# MiMad — contexto del proyecto

MiMad es una app web (PWA, instalable en el móvil) de planes y actividades para **combatir la soledad y crear comunidad en la Comunidad de Madrid**. Se presenta al datathon **DataMad 2026** (portal de datos abiertos de la Comunidad de Madrid). **Prototipo funcional: 20 de octubre de 2026.**

Requisitos del reto que guían todas las decisiones:
- Los **datos abiertos** tienen que ser protagonistas: cada pantalla debe mostrar de dónde viene la información.
- El jurado valora el **código abierto**: el repo es público (licencia MIT) y debe poder reproducirse siguiendo el README.

Idioma: toda la interfaz, los textos y los comentarios para el equipo van en **español**. El código (nombres de variables, funciones) en inglés.

El equipo no es experto en programación: **explica brevemente qué haces y por qué** antes de cambios grandes, propone un plan antes de construir funcionalidades nuevas y trabaja en pasos pequeños que se puedan probar.

---

## Perfiles de usuario

1. **Por defecto (jóvenes y adultos)** — Lucía en los ejemplos. Busca planes, se inscribe, ve el mapa, tiene agenda, puede activar "Acompañamiento" para vincularse con un familiar mayor.
2. **Versión simplificada (mayores, dependientes, personas con discapacidad)** — Carmen en los ejemplos. Botones grandes, un solo paso por pantalla, textos cortos, siempre visible "¿Necesitas ayuda?" (sin opción de llamar). Se activa con un interruptor en el login/inicio y queda guardada en el perfil (`mm_perfiles`). Recibe recomendaciones de sus familiares vinculados y también por un bot de WhatsApp con botones, sin texto libre (entra en el prototipo).
3. **Entidades/organizaciones** — publican eventos. Se verifican cruzando su **NIF** con el Registro de centros de atención social (`entidad_nif`).
4. **Personas extranjeras** — actividades de los CEPI (centros de integración de inmigrantes), filtros por idioma; la agenda turística existe en 7 idiomas.

Los ejemplos y datos de demo deben ser coherentes: Carmen y Lucía viven en Madrid capital, y sus planes están cerca de donde viven.

## Documentación de referencia (consultar solo cuando haga falta)

- `privado/propuesta.md`: la propuesta completa del datathon, con el detalle funcional de cada pantalla (qué campos tiene, qué botones, cómo se comporta en cada versión). **No la leas en cada tarea**: consúltala solo cuando vayas a construir o cambiar una pantalla o funcionalidad concreta y necesites su detalle. Si contradice a este archivo, manda este archivo.
- La carpeta `privado/` está en `.gitignore` y **nunca debe subirse al repositorio** (es público). No copies su contenido literal en archivos que sí se suben (README, comentarios, etc.).

## Pantallas (hay diseños en `disenos/`)

Login (por defecto y simplificada) · Crear cuenta (persona, entidad, simplificada en pasos) · Pantalla de carga · Inicio (lista + interruptor de versión simplificada) · Mapa · Planes (simplificada) · Detalle de evento (ambas versiones) · Agenda (ambas) · Perfil (ambas; arriba, personas vinculadas) · Asistente/recomendaciones (chat IA) y "Pedir consejo" (simplificada) · Crear evento (entidades) · Acompañamiento (gestión de personas vinculadas) · Notificaciones.

## Sistema de diseño

- Fuente: **Outfit** (Google Fonts).
- Colores: degradado coral `#FF5A6E` → ámbar `#FFB86C`; texto principal (tinta) `#1B2333`.
- Iconos: **Lucide** (`lucide-react`).
- Mobile first: se diseña para 430 px de ancho; en escritorio, centrado.
- Versión simplificada: tamaño de letra y botones mucho mayores, alto contraste, una acción principal por pantalla.
- Accesibilidad en todo: contraste AA, etiquetas en botones, navegación con teclado.

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind CSS, como **PWA**.
- **Supabase** (PostgreSQL + Auth) en región Europa.
- **Leaflet** + OpenStreetMap para el mapa (sin claves).
- **Vercel** para publicar (se despliega solo al hacer push a `main`).
- **GitHub Actions** para la carga programada de datos.
- Chat de IA: ruta de servidor que llama a la API de Claude (clave en variables de entorno, nunca en el cliente).

## Reglas de seguridad (importante)

- El proyecto de Supabase tiene **RLS automático activado** y **"Automatically expose new tables" desactivado**. Por tanto, **cada tabla nueva necesita, en su misma migración**:
  1. `grant` explícito de los permisos necesarios a los roles `anon` / `authenticated` (solo los necesarios).
  2. Políticas RLS que digan quién puede leer/escribir cada fila.
  Si no, la app dará "permission denied".
- Las tablas de datos abiertos (`da_*`) son de **solo lectura** para `anon` y `authenticated`; solo el script de carga (con la service role key) escribe en ellas.
- Datos personales (usuarios, vínculos familiares, inscripciones): cada persona solo ve lo suyo; un familiar vinculado solo ve a su persona vinculada y solo si el vínculo está aceptado.
- Secretos en `.env.local` (nunca se sube) y en la configuración de Vercel / GitHub Actions. Mantén un `.env.example` sin valores.
- Las migraciones SQL van en `supabase/migrations/` para que todo sea reproducible.

## Datos abiertos

Carga con un script en `scripts/ingest/` (Node/TypeScript) que descarga cada fuente, la normaliza y hace upsert/reemplazo en su tabla `da_*` de Supabase. Lo ejecuta GitHub Actions con la frecuencia indicada (horas en UTC). Cada tabla guarda también `fuente` y `fecha_carga`.

**Prioridad para el prototipo:** primero las fuentes marcadas ⭐ (núcleo del reto y de la demo); el resto, si da tiempo. Si una fuente falla, el script registra el error y sigue con las demás.

### Comunidad de Madrid (núcleo del reto: cubren toda la región)

| Tabla | Dataset | URL | Formato y notas | Frecuencia |
|---|---|---|---|---|
| ⭐ `da_centros_atencion_social` | Registro de centros de atención social | `https://datos.comunidad.madrid/catalogo/dataset/b8cdb7f7-3185-4938-800a-fefda72333f5/resource/fb98d116-eb79-4100-8cd4-d5ce2e2c439b/download/atencion_social_registro_centros.json` | JSON. Campos: tipo, subtipo, sector, denominacion, tipo_gestion, entidad_nif, entidad_denominacion, entidad_naturaleza, numero_registro, direccion_via_tipo/nombre/portal, direccion_codigo_postal, municipio_nombre/codigo, direccion_distrito, direccion_coor_x/y (**probablemente UTM ETRS89 zona 30N, EPSG:25830 → convertir a lat/lon con proj4**; comprobar con los valores), contacto_telefono, contacto_correo, plazas_autorizadas_numero, fechas de acreditación. Ver reglas de uso abajo | Semanal domingo 03:00 |
| ⭐ `da_cepi_actividades` | Actividades de los CEPI (año en curso) | `https://datos.comunidad.madrid/dataset/bc5a430c-1819-4478-87fc-09c771e0455f/resource/168d78fb-c202-4d80-9a41-0c8d338d73d1/download/cepi_actividades.json` | JSON, filas en `data`. Campos: ambito, subambito, tipo_actividad, centro, codigo (**texto**), denominacion, mes_ano, numero_horas. **Sin dirección, fecha concreta ni idioma**: direcciones de los CEPI en `mm_cepi_centros` (a mano); en la app, "Actividad de <mes> en el CEPI X"; idioma deducido del texto. Actualizado oct. 2026 | Semanal lunes 03:30 |
| ⭐ `da_talleres_envejecimiento` | Talleres de envejecimiento activo | `https://datos.comunidad.madrid/dataset/a4ae43dd-6f22-4498-b5e8-2ba6308ffa36/resource/b09e9531-e3c8-4bc6-a6f4-a71773af20a0/download/talleres_envejecimiento_activo.json` | JSON (probablemente filas en `data`; verificar). Última actualización mayo 2025 | Mensual día 1, 03:00 |
| ⭐ `da_puntos_interes` | Puntos de interés municipales (ficha en el catálogo de la Comunidad: `https://datos.comunidad.madrid/catalogos/#/dataset/a7357488-d9f0-11ed-b370-34298f78123d`; los datos son del Ayto. de Madrid) | `https://sigma.madrid.es/hosted/rest/services/GEOPORTAL/POIs_PUNTOS_DE_INTERES/MapServer/5/query?where=1%3D1&outFields=PK,NOMBRE,TIPO,CATEGORIA,SUBCATEGOR,DESCRIPCION,HORARIO,EMAIL,TELEFONO,CONTENT_URL,ACCESIBILIDAD,CLASE_VIAL,NOMBRE_VIA,NUM,CODIGO_POSTAL,BARRIO,DISTRITO,LOCALIDAD,LATITUD,LONGITUD&returnGeometry=false&f=json` | ArcGIS (ver nota), ~5.981 filas → **paginar**. NUM es **texto** (contiene "s/n"); LATITUD/LONGITUD vienen como texto → convertir a número. Capa 68 del mismo servicio = POIs accesibles para movilidad reducida (opcional) | Semanal lunes 01:30 |

### Ayuntamiento de Madrid

| Tabla | Dataset | URL | Formato y notas | Frecuencia |
|---|---|---|---|---|
| ⭐ `da_agenda_madrid` | Agenda de actividades y eventos | `https://datos.madrid.es/dataset/300107-0-agenda-actividades-eventos/resource/300107-5-agenda-actividades-eventos-json/download/300107-5-agenda-actividades-eventos-json.json` | JSON, array en `@graph`. Campos: id, title, description, dtstart, dtend, time, free, price, audience, link, event-location, excluded-days, recurrence (days, frequency, interval), address.area (locality, postal-code, street-address), address.district, location (latitude, longitude), organization (organization-name, accesibility = códigos, ver ficha del dataset). Sin imágenes ni idioma | Diaria 04:00 |
| `da_agenda_cultural_100` | Actividades culturales y de ocio (próximos 100 días) | `https://datos.madrid.es/dataset/206974-0-agenda-eventos-culturales-100/resource/206974-0-agenda-eventos-culturales-100-json/download/206974-0-agenda-eventos-culturales-100-json.json` | Mismo formato que la agenda (`@graph`). **Deduplicar** con `da_agenda_madrid` por id/título+fecha | Diaria 04:10 |
| ⭐ `da_agenda_turismo` (+ `_en`) | Agenda turística (esmadrid.com) | ES: `https://datos.madrid.es/dataset/300028-0-agenda-turismo/resource/300028-2-agenda-turismo/download/300028-2-agenda-turismo.xml` · EN: cambiar `300028-2` por `300028-1` (dos veces) | **XML** ~4,5 MB, ~1.126 eventos. Fila = `/serviceList/service` (atributos `id`, `fechaActualizacion` = fecha de edición, NO del evento). Hijos: `basicData/{title,body (HTML en CDATA → limpiar),web,phone,email}`, `geoData/{address,zipcode,latitude,longitude}`, `multimedia/media/url` (**imágenes**), `extradata/fechas/rango/{inicio,fin}`, `extradata/categorias/...` (verificar nombres). 7 idiomas (también fr `-0-`, it `-3-`, ru `-4-`, pt `-5-`, de `-7-`) | Diaria 04:30 |
| `da_agenda_bibliotecas` | Actividades gratuitas en bibliotecas municipales (60 días) | `https://datos.madrid.es/dataset/206717-0-agenda-eventos-bibliotecas/resource/206717-1-agenda-eventos-bibliotecas-json/download/206717-1-agenda-eventos-bibliotecas-json.json` | Formato `@graph`. Deduplicar con la agenda general | Diaria 04:15 |
| `da_agenda_deportes` | Agenda de actividades deportivas | `https://datos.madrid.es/dataset/212504-0-agenda-actividades-deportes/resource/212504-2-agenda-actividades-deportes-json/download/212504-2-agenda-actividades-deportes-json.json` | Formato `@graph` | Diaria 04:20 |
| `da_carreras` | Próximas carreras urbanas | `https://datos.madrid.es/dataset/300261-0-agenda-proximas-carreras/resource/300261-2-agenda-proximas-carreras-json/download/300261-2-agenda-proximas-carreras-json.json` | Formato `@graph` | Semanal |
| ⭐ `da_centros_mayores` | Centros municipales de mayores | `https://datos.madrid.es/dataset/200337-0-centros-mayores/resource/200337-1-centros-mayores-json/download/200337-1-centros-mayores-json.json` | JSON `@graph` (lugares: title, address, location, organization…). Lugares del perfil de mayores en la capital | Semanal |
| `da_centros_dia` | Centros de día (capital) | `https://datos.madrid.es/dataset/200342-0-centros-dia/resource/200342-1-centros-dia-json/download/200342-1-centros-dia-json.json` | JSON `@graph`. Apoyo al registro de la Comunidad | Semanal |
| ⭐ `da_juntos_contra_soledad` | Programa "Juntos contra la soledad" (Dir. Gral. de Mayores) — **encontrado después de la propuesta; muy alineado con el objetivo de MiMad** | `https://sigma.madrid.es/hosted/rest/services/GEOPORTAL/JUNTOS_CONTRA_LA_SOLEDAD/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=json` | ArcGIS, ~21 talleres **con geometría** (`features[].geometry.x/y` = lon/lat). Campos: CENTRO, DIRECCION, DISTRITO, BARRIO, TIPO_TALLER, DIA, HORARIO, TRANSPORTE, DESCRIPCION, MAS_INFORMACION, EMAIL. Talleres recurrentes semanales | Semanal |
| `da_centros_culturales` | Centros culturales municipales | `https://sigma.madrid.es/hosted/rest/services/CULTURA/CENTROS_CULTURALES/MapServer/1/query?where=1%3D1&outFields=*&f=json` | ArcGIS, 108 filas: CLASE (CENTRO CULTURAL / SOCIOCULTURAL), DENOMINA, DIRECCION, DISTRITO, URL. **Sin geometría** (`geometry: null`): coordenadas cruzando por nombre con `da_puntos_interes` o geocodificando la dirección | Semanal lunes 02:00 |

Otros servicios ArcGIS del Ayto. potencialmente útiles (no en la propuesta, explorar si sobra tiempo): `GEOPORTAL/AREAS_ACTIVIDADES_PARA_MAYORES`, `GEOPORTAL/EJERCICIOS_MAYORES`.

### Ayuntamiento de Alcobendas

| Tabla | Dataset | URL | Notas | Frecuencia |
|---|---|---|---|---|
| `da_agenda_alcobendas` | Agenda de actividades | Ficha: `https://datos.alcobendas.org/dataset/agenda-de-activiades` | **Pendiente:** sacar de la ficha la URL directa del recurso (JSON/CSV) | Diaria |

### Consorcio Regional de Transportes (CRTM) — "Cómo llegar" (baja prioridad)

Son ítems de ArcGIS Hub (`datos.crtm.es`). **Pendiente:** sacar la URL de descarga desde el botón "Download" de cada ficha (para capas suele haber GeoJSON/CSV; para ficheros, `https://www.arcgis.com/sharing/rest/content/items/<id>/data`). Para el prototipo basta con las paradas/estaciones cercanas al evento (no rutas completas).

| Tabla | Dataset | Ficha |
|---|---|---|
| `da_gtfs_interurbanos` | GTFS red de autobuses interurbanos | `https://datos.crtm.es/datasets/885399f83408473c8d815e40c5e702b7/about` |
| `da_gtfs_urbanos` | Autobuses urbanos | `https://datos.crtm.es/datasets/357e63c2904f43aeb5d8a267a64346d8/about` |
| `da_paradas_emt` | Elementos red de autobuses urbanos de Madrid (EMT) | `https://datos.crtm.es/maps/8ef563f232c244ca9b3a5d2d6a3dc19b/about` |
| `da_estaciones_metro` | Elementos red de Metro | `https://datos.crtm.es/maps/0a6c45e7bdd94679b67a2ae662c8838b/about` |
| `da_paradas_interurbanos` | Elementos red de autobuses interurbanos | `https://datos.crtm.es/maps/19884a02ac044270b91fa478d80f7858/about` |
| `da_estaciones_cercanias` | Elementos red de Cercanías | `https://datos.crtm.es/maps/9e353bbf4c5d4bea87f01d6d579d06ab/about` |

Notas técnicas:
- **ArcGIS (sigma.madrid.es)**: filas en `features[].attributes` (y `features[].geometry` si la capa la publica); máximo 2.000 registros por petición → paginar con `resultOffset`/`resultRecordCount` mientras `exceededTransferLimit` sea true. Pedir solo los campos necesarios; `returnGeometry=false` cuando las coordenadas vengan en atributos; `outSR=4326` para obtener lon/lat.
- Agendas de datos.madrid.es (`@graph`): formato JSON-LD común; reutilizar el mismo parser para todas.
- El JSON de "centros culturales" de datos.madrid.es está **mal formado**: no usarlo (por eso se usa ArcGIS).
- Tratar como **texto** cualquier número de calle, código, teléfono o código postal.
- "Puntos de interés" y "Centros culturales" son solo de **Madrid capital** aunque estén en el catálogo de la Comunidad; el alcance regional lo dan los datasets de la Comunidad (atención social, CEPI, talleres). Diseñar el modelo para añadir más municipios (siguiente: Alcobendas).

### Reglas de uso de `da_centros_atencion_social`

- **Se muestran en la app** solo estos subtipos: `HOGARES Y CLUBES` (protagonista: lugares de reunión de mayores), `CENTROS DE DÍA: OTROS` (apoyo, sobre todo en Acompañamiento) y `TALLERES`.
- **No se muestran NUNCA**: `CENTROS DE MUJERES MALTRATADAS`, `CENTROS DE ACOGIDA DE MENORES`, albergues y demás centros de acogida (su ubicación protege a personas en riesgo), ni residencias, pisos tutelados o centros de rehabilitación (no son lugares de actividad). Aplicar el filtro en la vista/consulta, nunca en el cliente.
- La tabla completa se usa para **verificar el NIF** de las entidades que se registran.

### Modelo unificado

Crear vistas `v_lugares` y `v_eventos` que unifiquen todas las fuentes con columnas comunes (id, fuente, título/nombre, descripción, categoría, fecha_inicio, fecha_fin, dirección, municipio, lat, lon, url, gratuito, accesibilidad, público objetivo, idioma), para que la app consulte un solo sitio.

## Tablas propias de la app (prefijo `mm_`)

perfiles de usuario (tipo: por defecto / simplificada / entidad; intereses; municipio), intereses, inscripciones a eventos, vínculos de acompañamiento (familiar ↔ persona, con estado pendiente/aceptado), recomendaciones (de un familiar a su persona vinculada), notificaciones, entidades (con NIF verificado), eventos creados por entidades (con moderación), valoraciones, `mm_cepi_centros`.

## Forma de trabajar

- Rama por funcionalidad (`git checkout -b mapa`), commits pequeños con mensajes claros en español, merge a `main` cuando funcione.
- Antes de dar algo por terminado: `npm run build` sin errores y probarlo en el navegador a 430 px de ancho.
- Mantén el README al día: qué es MiMad, qué datasets usa (con enlaces), cómo ejecutarlo en local y cómo se actualizan los datos.
