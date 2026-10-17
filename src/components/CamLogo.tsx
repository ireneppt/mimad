// Logo de la Comunidad de Madrid, socia del proyecto. Va junto al de MiMad, separado por
// una línea fina y con menos protagonismo. Alto fijo y ancho proporcional: no se deforma.
// (public/logo-comunidad-madrid.webp: logo oficial recortado, 185 × 262 px)
import Image from "next/image";

const RATIO = 185 / 262;

export default function CamLogo({ height = 44, className = "" }: { height?: number; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center gap-3 ${className}`}>
      <span className="w-px self-stretch bg-slate-300" aria-hidden="true" />
      <Image
        src="/logo-comunidad-madrid.webp"
        alt="Comunidad de Madrid"
        width={Math.round(height * RATIO)}
        height={height}
        className="shrink-0"
        style={{ height, width: "auto" }}
      />
    </span>
  );
}
