# MiMad

**Madrid, mejor en compañía.** App web (PWA, instalable en el móvil) de planes y actividades para combatir la soledad y crear comunidad en la Comunidad de Madrid, construida sobre **datos abiertos**.

Proyecto para el datathon **DataMad 2026**. 🔗 **https://mimad.vercel.app**

## Datos abiertos que usa

| Dataset | Organismo | Actualización |
|---|---|---|
| [Registro de centros de atención social](https://datos.comunidad.madrid/catalogo/dataset/b8cdb7f7-3185-4938-800a-fefda72333f5) | Comunidad de Madrid | Semanal |
| [Actividades de los CEPI](https://datos.comunidad.madrid/dataset/bc5a430c-1819-4478-87fc-09c771e0455f) | Comunidad de Madrid | Semanal |
| [Talleres de envejecimiento activo](https://datos.comunidad.madrid/dataset/a4ae43dd-6f22-4498-b5e8-2ba6308ffa36) | Comunidad de Madrid | Mensual |
| [Agenda de actividades y eventos](https://datos.madrid.es/dataset/300107-0-agenda-actividades-eventos) | Ayuntamiento de Madrid | Diaria |
| [Centros municipales de mayores](https://datos.madrid.es/dataset/200337-0-centros-mayores) | Ayuntamiento de Madrid | Semanal |
| [Juntos contra la soledad](https://sigma.madrid.es/hosted/rest/services/GEOPORTAL/JUNTOS_CONTRA_LA_SOLEDAD/MapServer/0) | Ayuntamiento de Madrid | Semanal |

Las direcciones de los 8 CEPI se mantienen a mano (el dataset no las incluye) a partir de la [web de la Comunidad de Madrid](https://www.comunidad.madrid/servicios/servicios-sociales/centros-participacion-e-integracion), con coordenadas de OpenStreetMap.

**Privacidad:** del registro de atención social solo se muestran hogares y clubes de mayores, centros de día para mayores o personas con discapacidad y talleres. Los centros de acogida, de mujeres víctimas de violencia, de menores y albergues **nunca** se muestran: el filtro está en la base de datos y la app no tiene acceso a la tabla completa.

## Cómo funciona

- **Next.js** (App Router) + TypeScript + Tailwind CSS, publicada en **Vercel**.
- **Supabase** (PostgreSQL) en Europa. Las tablas `da_*` guardan cada dataset; las vistas `v_eventos` y `v_lugares` los unifican.
- **GitHub Actions** ejecuta `scripts/ingest` cada día/semana: descarga cada fuente, la normaliza y la guarda. Si una fuente falla, se conservan los datos anteriores y el error queda en `da_fuentes`.
- **Distancias:** la casa de cada persona se sitúa con su código postal o con la ubicación del móvil (redondeada a unos 100 m). El centro de cada código postal se calcula con datos abiertos (Registro de centros de atención social, sin centros de acogida, y Agenda del Ayuntamiento) y se guarda en `src/data/codigos-postales.json`; se regenera con `npm run codigos-postales`. «Dónde estoy ahora» solo se guarda en una cookie del móvil durante 3 horas.
- **Asistente** (`/asistente` y «Pedir consejo»): busca planes reales de los datos abiertos cerca de la persona y, si hay clave de la API de Claude (`ANTHROPIC_API_KEY`, solo en el servidor), Claude elige de esa lista los que mejor encajan y explica por qué; no puede inventar planes. Sin clave, elige con reglas sencillas (gustos, distancia, gratis, accesible); en ese caso, debajo de los planes aparece el motivo («Sin IA: falta la clave…»). En Vercel, la variable `ANTHROPIC_API_KEY` tiene que estar **enlazada al proyecto** y la web se tiene que volver a publicar para que la lea.

## Ejecutarlo en local

Necesitas Node.js 20+ y un proyecto gratuito de [Supabase](https://supabase.com).

1. `npm install`
2. En Supabase → SQL Editor, ejecuta **en orden** los archivos de `supabase/migrations/`.
3. Copia `.env.example` como `.env.local` y rellena la URL y las claves (Supabase → Project Settings → API). La clave de Claude (`ANTHROPIC_API_KEY`, de console.anthropic.com) es opcional.
4. `npm run ingest` — carga los datos abiertos (`npm run ingest -- --prueba` descarga sin guardar).
5. `npm run comprobar` — verifica datos y permisos.
6. `npm run dev` y abre http://localhost:3000

Para la carga automática, añade en GitHub (Settings → Secrets and variables → Actions) los secretos `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

## Licencia

Código bajo licencia [MIT](LICENSE). Los datos pertenecen a sus organismos publicadores y se usan según sus condiciones de reutilización.

Las fotos por defecto de los planes sin foto propia (`public/fotos-por-tipo/`) son de [Pexels](https://www.pexels.com) y se usan según su [licencia](https://www.pexels.com/license/) (uso libre y gratuito). Las fotos de la Agenda turística son de [esmadrid.com](https://www.esmadrid.com) y se indican en cada plan.
