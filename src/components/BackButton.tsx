"use client";

// Flecha "volver": vuelve a la pantalla anterior; si se entró directamente (enlace compartido), al inicio
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      aria-label="Volver"
      className="flex h-12 w-12 items-center justify-center rounded-full"
    >
      <ArrowLeft size={26} aria-hidden="true" />
    </button>
  );
}
