// Service worker de MiMad (hace que la app se pueda instalar en el móvil).
// - Imágenes y archivos de la app (iconos, fotos de los tipos de plan, banderas, código de
//   /_next/static): se guardan en el móvil la primera vez y después se cargan de ahí (más rápido
//   y sin gastar datos). Esos archivos no cambian: si cambian, tienen otro nombre.
// - Las páginas NO se guardan: llevan datos personales (agenda, perfil) y deben estar al día.
//   Sin conexión se enseña una página de aviso con letra grande y un botón para reintentar.
// Al cambiar este archivo, subir VERSION para que se borre lo guardado antes.
const VERSION = "v2";
const STATIC_CACHE = `mimad-static-${VERSION}`;

const isStatic = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fotos-por-tipo/") ||
    url.pathname.startsWith("/banderas/") ||
    /^\/(icon|apple-icon|icono|logo)[^/]*\.(png|svg|webp)$/.test(url.pathname));

// Al instalarse: se guarda el icono (lo usa la página "Sin conexión")
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.add("/icon-192.png")).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("mimad-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const OFFLINE_HTML = `<!doctype html>
<html lang="es">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sin conexión · MiMad</title>
<body style="margin:0;min-height:100vh;display:flex;flex-direction:column;justify-content:center;gap:20px;padding:32px 24px;box-sizing:border-box;font-family:system-ui,sans-serif;background:#FFF4EC;color:#1B2333">
  <img src="/icon-192.png" alt="" width="96" height="96">
  <h1 style="margin:0;font-size:32px">Sin conexión</h1>
  <p style="margin:0;font-size:20px;line-height:1.5">MiMad necesita internet para enseñarte los planes. Comprueba el wifi o los datos del móvil y vuelve a intentarlo.</p>
  <button onclick="location.reload()" style="height:60px;border:0;border-radius:16px;background:#1B2333;color:#fff;font-size:20px;font-weight:600">Volver a intentarlo</button>
</body>
</html>`;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Páginas: siempre de internet; sin conexión, el aviso
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
    return;
  }

  // Archivos que no cambian: primero lo guardado; si no está, de internet y se guarda
  if (isStatic(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
  }
});
