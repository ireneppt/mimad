"use client";

import { useEffect } from "react";

// Registra el service worker (public/sw.js) para que la app sea instalable
export default function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
