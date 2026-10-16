import Link from "next/link";
import { displayPhone, telHref } from "@/lib/phoneLinks";
import type { ReactNode } from "react";
import {
  ArrowLeft, ArrowRightLeft, ChevronRight, Heart, Lock, MapPin, Phone, Plus, Shield, Smartphone, Sparkles, UserRound,
} from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import { Hint, PrimarySubmit } from "@/components/simple/ui";
import { createClient } from "@/lib/supabase/server";
import { getEvent, getEventsByIds } from "@/lib/data";
import ConflictChoice from "@/components/simple/ConflictChoice";
import CompanionAsk from "@/components/simple/CompanionAsk";
import { siteUrl } from "@/lib/siteUrl";

import { INTERESTS } from "@/lib/interests";
import { getCurrentProfile } from "@/lib/profile";
import { getPendingRecommendations, whenInWords } from "@/lib/simplePlans";
import { joinPlan } from "../planes/actions";
import { setWhatsapp, switchToDefault } from "./actions";
import { HomeEditor, InterestsEditor, NameEditor, PasswordEditor } from "./Editors";
import LogoutConfirm from "./LogoutConfirm";

export const metadata = { title: "Mi cuenta · MiMad simplificada" };

const SAVED: Record<string, string> = {
  nombre: "Hemos guardado tu nombre.",
  casa: "Hemos guardado dónde vives.",
  gustos: "Hemos guardado lo que te gusta.",
  contrasena: "Hemos cambiado tu contraseña.",
  avisos: "Hemos guardado tu elección de avisos.",
};

// "Mi cuenta" de la versión simplificada (diseño perfil-simplificada.png):
// quién te acompaña y sus recomendaciones, tus datos (cada uno se cambia en su pantalla),
// avisos, cambio de versión, privacidad y salir.
export default async function SimpleProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; hecho?: string; choque?: string; con?: string }>;
}) {
  const { editar, hecho, choque, con } = await searchParams;
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) {
    return (
      <SimpleShell defaultHref="/perfil" title="Mi cuenta" intro={<p>Para ver tu cuenta, entra con tu móvil.</p>} help={<p>Toca <strong>Entrar</strong>.</p>}>
        <Link href="/simple/login?next=/simple/perfil" className="bg-degradado-fuerte flex h-16 items-center justify-center rounded-2xl text-2xl font-bold text-white">
          Entrar
        </Link>
      </SimpleShell>
    );
  }

  // Una pantalla para cada dato que se cambia
  if (editar === "nombre") return <NameEditor nombre={perfil.nombre} />;
  if (editar === "gustos") return <InterestsEditor intereses={perfil.intereses} />;
  if (editar === "contrasena") return <PasswordEditor />;
  if (editar === "casa") {
    const { data } = await supabase.from("v_municipios").select("nombre").order("nombre");
    return <HomeEditor municipio={perfil.municipio ?? ""} municipios={(data ?? []).map((m) => m.nombre as string)} />;
  }

  // Quién me acompaña: vínculos aceptados en los que yo soy la persona acompañada
  const { data: vinculos } = await supabase
    .from("mm_vinculos")
    .select("familiar")
    .eq("persona", perfil.id)
    .eq("estado", "aceptado");
  const familiarIds = (vinculos ?? []).map((v) => v.familiar as string);
  const [{ data: familiares }, recomendaciones] = await Promise.all([
    familiarIds.length
      ? supabase.from("mm_perfiles").select("id, nombre, telefono").in("id", familiarIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string; telefono: string | null }[] }),
    getPendingRecommendations(supabase, perfil.id),
  ]);
  const recEvents = await getEventsByIds(supabase, recomendaciones.map((r) => r.evento_id));
  // Tras "Me apunto" en una recomendación: confirmación, o aviso si coincide con otro plan
  const [apuntado, nuevo, existente] = await Promise.all([
    hecho && !SAVED[hecho] ? getEvent(supabase, hecho) : null,
    choque ? getEvent(supabase, choque) : null,
    con ? getEvent(supabase, con) : null,
  ]);

  const gustos = INTERESTS.filter((i) => perfil.intereses.includes(i.id)).map((i) => i.label);
  const inicial = (perfil.nombre || "?").trim().charAt(0).toUpperCase();

  return (
    <SimpleShell
      defaultHref="/perfil"
      title="Mi cuenta"
      intro={<p>Aquí puedes ver quién te acompaña y cambiar tus datos.</p>}
      help={
        <ol>
          <li>Para cambiar un dato, toca su recuadro en <strong>Mis datos</strong>.</li>
          <li>Si un familiar te ha recomendado un plan, toca <strong>Me apunto</strong>.</li>
          <li>Para salir, toca <strong>Salir de MiMad</strong> al final de la pantalla.</li>
        </ol>
      }
    >
      <BackHome />

      {hecho && SAVED[hecho] && <Hint tone="ok">{SAVED[hecho]}</Hint>}
      {apuntado && (
        <Hint tone="ok">
          ¡Hecho! Te has apuntado a «{apuntado.titulo}». Lo tienes en Mis planes.
        </Hint>
      )}
      {apuntado && (familiares ?? []).length > 0 && (
        <CompanionAsk
          companions={familiares ?? []}
          plan={{ titulo: apuntado.titulo, cuando: whenInWords(apuntado), lugar: apuntado.lugar ?? apuntado.direccion, url: await siteUrl(`/simple/evento/${encodeURIComponent(apuntado.id)}`) }}
        />
      )}
      {nuevo && existente && (
        <ConflictChoice
          nuevo={{ id: nuevo.id, titulo: nuevo.titulo, cuando: whenInWords(nuevo) }}
          existente={{ id: existente.id, titulo: existente.titulo, cuando: whenInWords(existente) }}
          back="/simple/perfil"
        />
      )}

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="bg-degradado flex h-32 w-32 items-center justify-center rounded-full p-1.5" aria-hidden="true">
          <span className="flex h-full w-full items-center justify-center rounded-full bg-crema text-6xl font-bold text-coral-texto">{inicial}</span>
        </span>
        <p className="text-[2rem] font-bold leading-tight">{perfil.nombre}</p>
        {perfil.municipio && <p className="text-xl text-gris">Vives en {perfil.municipio}</p>}
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="familia">
        <h2 id="familia" className="text-[1.75rem] font-bold">Quién te acompaña</h2>
        {(familiares ?? []).length === 0 ? (
          <p className="rounded-2xl bg-slate-100 p-5 text-xl leading-snug">
            Todavía no tienes a nadie. Si un familiar te da un <strong>código</strong>, podrá ver tus planes y recomendarte otros.
          </p>
        ) : (
          <>
            <p className="text-xl text-gris">Estas personas pueden ver tus planes y recomendarte otros.</p>
            {(familiares ?? []).map((f) => (
              <div key={f.id} className="flex flex-col gap-4 rounded-3xl border-2 border-coral/50 bg-crema p-5">
                <div className="flex items-center gap-4">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-3xl font-bold text-coral-texto" aria-hidden="true">
                    {f.nombre.charAt(0).toUpperCase()}
                  </span>
                  <p className="text-2xl font-bold">{f.nombre}</p>
                </div>
                <p className="text-xl leading-snug">{f.nombre} ve tus planes y te puede recomendar planes nuevos.</p>
                {telHref(f.telefono) && (
                  <a href={telHref(f.telefono)!} className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-green-700 text-xl font-bold text-white">
                    <Phone size={26} aria-hidden="true" />
                    Llamar a {f.nombre}
                  </a>
                )}
              </div>
            ))}
          </>
        )}

        <Link
          href="/simple/familia"
          className="flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-coral-texto px-4 text-xl font-bold text-coral-texto"
        >
          <Plus size={26} aria-hidden="true" />
          Añadir a una persona que me acompaña
        </Link>

        {recomendaciones.map((r) => {
          const e = recEvents.find((x) => x.id === r.evento_id);
          if (!e) return null;
          return (
            <div key={r.id} className="flex flex-col gap-3 rounded-2xl border-2 border-slate-300 bg-white p-5">
              <p className="flex items-center gap-2 text-lg font-bold text-coral-texto">
                <Heart size={22} aria-hidden="true" /> {r.de_nombre} te recomienda
              </p>
              <Link href={`/simple/evento/${encodeURIComponent(e.id)}?volver=${encodeURIComponent("/simple/perfil")}`} className="text-2xl font-bold leading-snug underline-offset-4 hover:underline">
                {e.titulo}
              </Link>
              <p className="text-xl">{whenInWords(e)}</p>
              {r.mensaje && <p className="text-xl italic">«{r.mensaje}»</p>}
              <form action={joinPlan}>
                <input type="hidden" name="evento_id" value={e.id} />
                <input type="hidden" name="back" value="/simple/perfil" />
                <PrimarySubmit>Me apunto</PrimarySubmit>
              </form>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="datos">
        <h2 id="datos" className="text-[1.75rem] font-bold">Mis datos</h2>
        <p className="text-xl text-gris">Toca lo que quieras cambiar.</p>
        <DataRow href="?editar=nombre" icon={<UserRound size={28} />} label="Mi nombre" value={perfil.nombre} />
        <DataRow icon={<Smartphone size={28} />} label="Mi teléfono" value={displayPhone(perfil.telefono)} note="Es con lo que entras en MiMad. Para cambiarlo, pide ayuda." />
        <DataRow href="?editar=casa" icon={<MapPin size={28} />} label="Dónde vivo" value={perfil.municipio ?? "Sin elegir"} />
        <DataRow href="?editar=gustos" icon={<Sparkles size={28} />} label="Lo que me gusta" value={gustos.length ? gustos.join(", ") : "Sin elegir"} />
        <DataRow href="?editar=contrasena" icon={<Lock size={28} />} label="Mi contraseña" value="Cambiarla por otra nueva" plain />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="avisos">
        <h2 id="avisos" className="text-[1.75rem] font-bold">Avisos por WhatsApp</h2>
        <p className="text-xl text-gris">Te recordamos tus planes el día antes.</p>
        {[
          { value: "si", label: "Sí, quiero avisos", on: perfil.avisos_whatsapp },
          { value: "no", label: "No, gracias", on: !perfil.avisos_whatsapp },
        ].map((o) => (
          <form key={o.value} action={setWhatsapp}>
            <input type="hidden" name="avisos" value={o.value} />
            <button
              type="submit"
              aria-pressed={o.on}
              className={`flex min-h-16 w-full items-center gap-4 rounded-2xl border-2 px-5 text-left text-xl font-bold ${
                o.on ? "border-coral-texto bg-crema" : "border-slate-500 bg-white"
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${o.on ? "border-coral-texto" : "border-slate-500"}`} aria-hidden="true">
                {o.on && <span className="h-3.5 w-3.5 rounded-full bg-coral-texto" />}
              </span>
              {o.label}
            </button>
          </form>
        ))}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="version">
        <h2 id="version" className="text-[1.75rem] font-bold">Versión de MiMad</h2>
        <form action={switchToDefault}>
          <button type="submit" className="flex min-h-16 w-full items-center gap-4 rounded-2xl border-2 border-slate-300 bg-white px-5 text-left text-xl">
            <ArrowRightLeft size={28} className="shrink-0 text-coral-texto" aria-hidden="true" />
            <span className="flex-1">
              <span className="block font-bold">Usar la versión por defecto</span>
              <span className="block text-lg text-gris">Más cosas en cada pantalla y letra más pequeña</span>
            </span>
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="privacidad">
        <h2 id="privacidad" className="text-[1.75rem] font-bold">Privacidad</h2>
        <DataRow href="/privacidad" icon={<Shield size={28} />} label="Mis datos y privacidad" value="Qué guardamos y para qué" plain />
      </section>

      <LogoutConfirm />
      <BackHome />
    </SimpleShell>
  );
}

function DataRow({
  href, icon, label, value, note, plain = false,
}: {
  href?: string;
  icon: ReactNode;
  label: string;
  value: string;
  note?: string;
  plain?: boolean; // sin "Ahora:"
}) {
  const content = (
    <>
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-crema text-coral-texto" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-xl font-bold">{label}</span>
        <span className="block text-lg leading-snug text-gris">{plain ? value : `Ahora: ${value}`}</span>
        {note && <span className="mt-1 block text-base leading-snug text-gris">{note}</span>}
      </span>
      {href && <ChevronRight size={28} className="shrink-0" aria-hidden="true" />}
    </>
  );
  const cls = "flex items-center gap-4 rounded-2xl border-2 border-slate-300 bg-white p-4";
  return href ? (
    <Link href={href} className={cls}>
      {content}
    </Link>
  ) : (
    <div className={cls}>{content}</div>
  );
}

function BackHome() {
  return (
    <Link
      href="/simple"
      className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold"
    >
      <ArrowLeft size={26} aria-hidden="true" />
      Volver al inicio
    </Link>
  );
}
