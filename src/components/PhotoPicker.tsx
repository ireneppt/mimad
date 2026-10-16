"use client";

// Elegir una foto de perfil. Antes de subirla, se recorta cuadrada y se reduce a
// 400×400 px en el propio móvil (unos 40 KB): no gasta datos y carga rápido.
// La foto reducida se mete en un campo de archivo oculto llamado "foto".
import { useRef, useState } from "react";
import { Camera, LoaderCircle, Trash2 } from "lucide-react";

const SIZE = 400;

async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  // Recorte cuadrado del centro
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.85));
  // Algunos iPhone antiguos no saben crear WebP: entonces JPEG
  const final = blob && blob.type === "image/webp" ? blob : await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  if (!final) throw new Error("No se pudo preparar la foto");
  return new File([final], final.type === "image/webp" ? "foto.webp" : "foto.jpg", { type: final.type });
}

export default function PhotoPicker({
  initialUrl, onPicked, size = 112, label = "Añadir foto", removable = false, onRemove,
}: {
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

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Elige una foto (una imagen).");
    if (file.size > 25 * 1024 * 1024) return setError("Esa foto es demasiado grande.");
    setBusy(true);
    setError(null);
    try {
      const small = await shrink(file);
      const dt = new DataTransfer();
      dt.items.add(small);
      hidden.current!.files = dt.files;
      setPreview(URL.createObjectURL(small));
      onPicked?.();
    } catch {
      setError("No hemos podido usar esa foto. Prueba con otra.");
    } finally {
      setBusy(false);
    }
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
