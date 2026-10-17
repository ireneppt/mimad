"use client";

// Barra de arriba que se hace más pequeña al bajar por la página. Pone data-compact="true"
// y los elementos de dentro cambian con las clases group-data-[compact=true]:…
import { useEffect, useState, type ReactNode } from "react";

export default function ShrinkOnScroll({ className = "", children }: { className?: string; children: ReactNode }) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    // Con margen (se encoge pasados 48 px y vuelve por debajo de 16) para que no parpadee
    const onScroll = () => setCompact((c) => (c ? window.scrollY > 16 : window.scrollY > 48));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header data-compact={compact} className={`group ${className}`}>
      {children}
    </header>
  );
}
