import Link from "next/link";
import {
  Bell, CalendarDays, Download, Heart, HeartHandshake, Lock, LogOut, MapPin, MessageCircle, Plus, Shield, Smartphone, Sparkles, User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getAccompanied } from "@/lib/companion";
import { getMyAgenda } from "@/lib/simpleAgenda";
import { INTERESTS } from "@/lib/interests";
import { logout } from "@/app/(auth)/actions";
import { switchToSimple } from "../actions";
import BackButton from "@/components/BackButton";
import {
  AcceptCodeForm, DeleteAccount, EditRow, InterestsForm, NameForm, NoticeToggle, PasswordForm, PlaceForm, Switch,
} from "./ProfileParts";
import { stopSharing } from "./actions";

export const metadata = { title: "Mi perfil · MiMad" };

// "+34612345678" → "+34 612 345 678"
function prettyPhone(p: string | null): string {
  if (!p) return "Sin teléfono";
  const m = p.match(/^\+34(\d{3})(\d{3})(\d{3})$/);
  return m ? `+34 ${m[1]} ${m[2]} ${m[3]}` : p.startsWith("+") ? p : `+34 ${p}`;
}

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

// Perfil de la versión por defecto (diseño perfil.png)
export default async function ProfilePage() {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) return null; // el middleware ya obliga a tener cuenta

  const [{ activas, pendientes }, agenda, { count: totalInscripciones }, { data: meAcompanan }, { data: municipiosData }] = await Promise.all([
    getAccompanied(supabase, perfil.id),
    getMyAgenda(supabase, perfil.id),
    supabase.from("mm_inscripciones").select("*", { count: "exact", head: true }).eq("usuario", perfil.id),
    supabase.from("mm_vinculos").select("id, familiar").eq("persona", perfil.id).eq("estado", "aceptado"),
    supabase.from("v_municipios").select("nombre").order("nombre"),
  ]);
  // Quién me acompaña (nombres: se pueden leer porque hay vínculo aceptado)
  const familiarIds = (meAcompanan ?? []).map((v) => v.familiar as string);
  const { data: familiares } = familiarIds.length ? await supabase.from("mm_perfiles").select("id, nombre").in("id", familiarIds) : { data: [] };
  const acompananme = (meAcompanan ?? []).map((v) => ({ id: v.id as string, nombre: familiares?.find((f) => f.id === v.familiar)?.nombre ?? "Un familiar" }));

  // "Planes hechos": inscripciones cuyo plan ya ha terminado (ya no salen en la agenda)
  const proximos = agenda.length;
  const hechos = Math.max(0, (totalInscripciones ?? 0) - proximos);
  const vinculadas = activas.length + acompananme.length;
  const interestLabels = INTERESTS.filter((i) => perfil.intereses.includes(i.id)).map((i) => i.label);
  const place = [perfil.barrio, perfil.municipio].filter(Boolean).join(", ") || "Sin municipio";
  const municipios = (municipiosData ?? []).map((m) => m.nombre as string);

  return (
    <main className="flex flex-col">
      <header className="sticky top-0 z-[500] flex items-center gap-1 border-b border-slate-100 bg-white/95 px-2 py-2 backdrop-blur">
        <BackButton />
        <h1 className="flex-1 text-2xl font-bold">Mi perfil</h1>
        <Link href="/notificaciones" aria-label="Notificaciones" className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Bell size={22} aria-hidden="true" />
        </Link>
      </header>

      <div className="flex flex-col gap-7 bg-fondo px-5 pb-10 pt-6">
        {/* Cabecera: iniciales, nombre, municipio e intereses */}
        <section className="flex flex-col items-center gap-2 text-center">
          <span className="bg-degradado flex h-28 w-28 items-center justify-center rounded-full text-4xl font-bold text-white ring-4 ring-white shadow-lg" aria-hidden="true">
            {initials(perfil.nombre)}
          </span>
          <p className="mt-2 text-3xl font-bold">{perfil.nombre}</p>
          <p className="flex items-center gap-1.5 text-lg text-gris">
            <MapPin size={18} className="text-coral-texto" aria-hidden="true" /> {place}
          </p>
          {interestLabels.length > 0 && (
            <ul className="mt-1 flex flex-wrap justify-center gap-2" aria-label="Tus intereses">
              {interestLabels.map((l) => (
                <li key={l} className="rounded-full bg-coral/10 px-3 py-1 text-sm font-semibold text-coral-texto">{l}</li>
              ))}
            </ul>
          )}
        </section>

        <ul className="grid grid-cols-3 gap-2" aria-label="Resumen">
          {[
            [proximos, proximos === 1 ? "plan apuntado" : "planes apuntados", "/agenda"],
            [hechos, hechos === 1 ? "plan hecho" : "planes hechos", null],
            [vinculadas, vinculadas === 1 ? "persona vinculada" : "personas vinculadas", "#vinculadas"],
          ].map(([n, label, href]) => {
            const inner = (
              <>
                <span className="text-3xl font-bold">{n}</span>
                <span className="text-sm leading-tight text-gris">{label}</span>
              </>
            );
            const cls = "flex h-full flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-center";
            return (
              <li key={String(label)}>
                {href ? <Link href={String(href)} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>}
              </li>
            );
          })}
        </ul>

        {/* Personas vinculadas */}
        <section id="vinculadas" aria-labelledby="t-vinculadas" className="flex scroll-mt-20 flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="t-vinculadas" className="text-2xl font-bold">Personas vinculadas</h2>
            <span className="text-sm text-gris">Su agenda y recomendaciones</span>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border border-coral/20 bg-coral/5 p-4">
            {activas.map(({ persona }) => (
              <div key={persona.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xl font-bold text-amber-900" aria-hidden="true">
                    {initials(persona.nombre)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xl font-bold">{persona.nombre}</p>
                    <p className="text-sm text-gris">La acompañas · {persona.municipio ?? "Madrid"}</p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-sm font-medium text-green-800">✓ Vinculada</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/agenda?de=${persona.id}`} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 text-base font-medium">
                    <CalendarDays size={18} className="text-coral-texto" aria-hidden="true" /> Ver su agenda
                  </Link>
                  <Link href={`/acompanamiento/recomendar?persona=${persona.id}`} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 text-base font-medium">
                    <Heart size={18} className="text-coral-texto" aria-hidden="true" /> Recomendar plan
                  </Link>
                </div>
              </div>
            ))}

            {acompananme.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-white p-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-900" aria-hidden="true">
                  {initials(f.nombre)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-bold">{f.nombre}</p>
                  <p className="text-sm text-gris">Te acompaña: ve tu agenda y te recomienda planes</p>
                </div>
                <form action={stopSharing}>
                  <input type="hidden" name="id" value={f.id} />
                  <button type="submit" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium">Dejar de compartir</button>
                </form>
              </div>
            ))}

            {vinculadas === 0 && (
              <p className="text-base text-gris">
                Vincúlate con un familiar mayor para ver su agenda y recomendarle planes, o deja que alguien de confianza te acompañe a ti.
              </p>
            )}
            {pendientes.length > 0 && (
              <p className="text-sm text-gris">Tienes {pendientes.length} {pendientes.length === 1 ? "invitación pendiente" : "invitaciones pendientes"} de aceptar.</p>
            )}

            <Link href="/acompanamiento" className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-coral/40 text-lg font-semibold text-coral-texto">
              <Plus size={22} aria-hidden="true" /> Vincular a otra persona
            </Link>
          </div>
        </section>

        {/* Mi cuenta */}
        <section aria-labelledby="t-cuenta" className="flex flex-col gap-3">
          <h2 id="t-cuenta" className="text-2xl font-bold">Mi cuenta</h2>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200">
            <EditRow icon={<User size={22} />} title="Nombre" value={perfil.nombre}>
              <NameForm nombre={perfil.nombre} />
            </EditRow>
            <li className="flex items-center gap-4 bg-white p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100" aria-hidden="true"><Smartphone size={22} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold">Teléfono móvil</span>
                <span className="block text-sm text-gris">{prettyPhone(perfil.telefono)} · Es con el que entras</span>
              </span>
            </li>
            <EditRow icon={<MapPin size={22} />} title="Municipio y código postal" value={place}>
              <PlaceForm municipio={perfil.municipio ?? ""} municipios={municipios} />
            </EditRow>
            <EditRow icon={<Sparkles size={22} />} title="Intereses" value={interestLabels.join(", ") || "Sin elegir"}>
              <InterestsForm intereses={perfil.intereses} />
            </EditRow>
            <EditRow icon={<Lock size={22} />} title="Cambiar contraseña">
              <PasswordForm />
            </EditRow>
          </ul>
        </section>

        {/* Avisos */}
        <section aria-labelledby="t-avisos" className="flex flex-col gap-3">
          <h2 id="t-avisos" className="text-2xl font-bold">Avisos</h2>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200">
            <NoticeToggle field="avisos_whatsapp" initial={perfil.avisos_whatsapp} icon={<MessageCircle size={22} className="text-green-700" />} title="Avisos por WhatsApp" detail="Recordatorios y planes recomendados" />
            <NoticeToggle field="avisos_app" initial={perfil.avisos_app ?? true} icon={<Bell size={22} />} title="Avisos en la app" detail="Novedades cerca de ti" />
          </ul>
        </section>

        {/* Accesibilidad y acompañamiento */}
        <section aria-labelledby="t-accesibilidad" className="flex flex-col gap-3">
          <h2 id="t-accesibilidad" className="text-2xl font-bold">Accesibilidad</h2>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200">
            <li>
              <form action={switchToSimple} className="flex items-center gap-4 bg-white p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-lg font-bold text-coral-texto" aria-hidden="true">Aa</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">Versión simplificada</span>
                  <span className="block text-sm text-gris">Letra más grande y menos opciones</span>
                </span>
                <Switch on={false} label="Versión simplificada" />
              </form>
            </li>
            <li className="flex flex-col gap-3 bg-white p-4">
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100" aria-hidden="true"><HeartHandshake size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">Acompañamiento</span>
                  <span className="block text-sm text-gris">Deja que familiares o personas de confianza vean tu agenda y te recomienden planes</span>
                </span>
              </div>
              <AcceptCodeForm />
            </li>
          </ul>
        </section>

        {/* Privacidad */}
        <section aria-labelledby="t-privacidad" className="flex flex-col gap-3">
          <h2 id="t-privacidad" className="text-2xl font-bold">Privacidad</h2>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200">
            <li>
              <Link href="/privacidad" className="flex items-center gap-4 bg-white p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100" aria-hidden="true"><Shield size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">Privacidad y mis datos</span>
                  <span className="block text-sm text-gris">Qué guardamos y quién lo ve</span>
                </span>
              </Link>
            </li>
            <li>
              <a href="/perfil/mis-datos" download className="flex items-center gap-4 bg-white p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100" aria-hidden="true"><Download size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">Descargar mis datos</span>
                  <span className="block text-sm text-gris">Todo lo que MiMad guarda de ti, en un archivo</span>
                </span>
              </a>
            </li>
          </ul>
          <div className="px-1">
            <DeleteAccount />
          </div>
        </section>

        <form action={logout}>
          <button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-coral/40 bg-white text-lg font-semibold text-coral-texto">
            <LogOut size={22} aria-hidden="true" /> Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
