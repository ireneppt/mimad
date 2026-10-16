"use client";

// Elegir una foto de perfil. Antes de subirla, se recorta cuadrada y se reduce a
// 400×400 px en el propio móvil (unos 40 KB): no gasta datos y carga rápido.
// La foto reducida se mete en un campo de archivo oculto llamado "foto".
import { useRef, useState } from "react";
import { Camera, LoaderCircle, Trash2 } from "lucide-react";

// Foto de perfil: cuadrada 400×400. Foto de un plan: apaisada 1200×675 (16:9, como una portada)
const SHAPES = { square: { w: 400, h: 400 }, wide: { w: 1200, h: 675 } } as const;

async function shrink(file: File, shape: keyof typeof SHAPES): Promise<File> {
  const { w, h } = SHAPES[shape];
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  // Recorte del centro con la proporción final
  const scale = Math.min(bitmap.width / w, bitmap.height / h);
  const sw = w * scale;
  const sh = h * scale;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.85));
  // Algunos iPhone antiguos no saben crear WebP: entonces JPEG
  const final = blob && blob.type === "image/webp" ? blob : await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  if (!final) throw new Error("No se pudo preparar la foto");
  return new File([final], final.type === "image/webp" ? "foto.webp" : "foto.jpg", { type: final.type });
}

export default function PhotoPicker({
  initialUrl, onPicked, size = 112, label = "Añadir foto", removable = false, onRemove, shape = "square",
}: {
  shape?: "square" | "wide";
  initialUrl?: string | null;
  onPicked?: () => void; // p. ej. enviar el formulario al momento (perfil)
  size?: number;
  label?: string;
  removable?: boolean;
  onRemove?: () => void;
}) {
  const hidden = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false); // ha pulsado "Quitar la foto"

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Elige una foto (una imagen).");
    if (file.size > 25 * 1024 * 1024) return setError("Esa foto es demasiado grande.");
    setBusy(true);
    setError(null);
    try {
      const small = await shrink(file, shape);
      const dt = new DataTransfer();
      dt.items.add(small);
      hidden.current!.files = dt.files;
      setPreview(URL.createObjectURL(small));
      setRemoved(false);
      onPicked?.();
    } catch {
      setError("No hemos podido usar esa foto. Prueba con otra.");
    } finally {
      setBusy(false);
    }
  }

  // Foto de un plan: rectángulo apaisado a todo lo ancho, como la portada de la tarjeta
  if (shape === "wide") {
    return (
      <div className="flex flex-col gap-2">
        <label className="relative block aspect-video w-full cursor-pointer overflow-hidden rounded-2xl has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-tinta">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Foto del plan" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-coral/40 bg-coral/5 px-4 text-center text-coral-texto">
              <Camera size={32} aria-hidden="true" />
              <span className="text-base font-semibold">{label}</span>
              <span className="text-sm text-gris">Si no añades una, usaremos el dibujo de su tipo de plan</span>
            </span>
          )}
          {preview && (
            <span className="absolute bottom-3 right-3 flex h-11 items-center gap-1.5 rounded-full bg-tinta/85 px-4 text-sm font-semibold text-white" aria-hidden="true">
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Camera size={16} />} Cambiar
            </span>
          )}
          <input type="file" accept="image/*" onChange={pick} className="sr-only" aria-label={preview ? "Cambiar la foto del plan" : "Añadir una foto del plan"} />
        </label>
        <input ref={hidden} type="file" name="foto" className="hidden" tabIndex={-1} aria-hidden="true" />
        {/* Quitar la foto que ya tenía: se envía con el formulario al guardar */}
        {removed && <input type="hidden" name="quitar_foto" value="1" />}
        {removable && preview && (
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setRemoved(true);
              if (hidden.current) hidden.current.value = "";
              onRemove?.();
            }}
            className="flex w-fit items-center gap-1 text-sm font-medium text-gris underline"
          >
            <Trash2 size={14} aria-hidden="true" /> Quitar la foto
          </button>
        )}
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <label className="relative cursor-pointer" style={{ width: size, height: size }}>
        {preview ? (
          <span className="bg-degradado block h-full w-full rounded-full p-1 shadow-lg">
            {/* Vista previa local de la foto ya reducida: no pasa por el optimizador de imágenes */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Tu foto" className="h-full w-full rounded-full border-4 border-white object-cover" />
          </span>
        ) : (
          <span className="bg-degradado block h-full w-full rounded-full p-1 shadow-lg">
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-full bg-white px-4 text-gris">
              <Camera size={size * 0.26} aria-hidden="true" />
              <span className="text-sm font-medium leading-tight">{label}</span>
            </span>
          </span>
        )}
        <span className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-tinta text-white ring-4 ring-white" aria-hidden="true">
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Camera size={18} />}
        </span>
        <input type="file" accept="image/*" onChange={pick} className="sr-only" aria-label={preview ? "Cambiar la foto" : "Añadir una foto"} />
      </label>
      {/* El archivo reducido que se envía con el formulario */}
      <input ref={hidden} type="file" name="foto" className="hidden" tabIndex={-1} aria-hidden="true" />
      {removable && preview && (
        <button
          type="button"
          onClick={() => {
            setPreview(null);
            if (hidden.current) hidden.current.value = "";
            onRemove?.();
          }}
          className="flex items-center gap-1 text-sm font-medium text-gris underline"
        >
          <Trash2 size={14} aria-hidden="true" /> Quitar foto
        </button>
      )}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </div>
  );
}
