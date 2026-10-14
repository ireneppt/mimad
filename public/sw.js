// Service worker mínimo de MiMad.
// No guarda nada en caché todavía: solo existe para que la app sea instalable.
// Si no hay conexión, muestra un aviso sencillo en vez de la página de error del navegador.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;padding:24px;color:#1B2333"><h1>Sin conexión</h1><p>MiMad necesita internet para mostrar los planes. Vuelve a intentarlo en un momento.</p></body>',
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        )
    )
  );
});
