// Foto de perfil redonda; si no hay foto, las iniciales sobre el degradado de la marca
export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

export default function Avatar({
  url, name, size = 56, className = "", tone = "marca",
}: {
  url?: string | null;
  name: string;
  size?: number;
  className?: string;
  tone?: "marca" | "ambar" | "azul"; // color de las iniciales si no hay foto
}) {
  const bg = tone === "ambar" ? "bg-amber-100 text-amber-900" : tone === "azul" ? "bg-blue-100 text-blue-900" : "bg-degradado text-white";
  return url ? (
    // Las fotos ya vienen reducidas a 400×400 desde el móvil: no hace falta optimizarlas
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={size} height={size} className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${bg} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}
