import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell, CalendarCheck, CalendarDays, ChevronRight, Download, Heart, HeartHandshake, History, Lock, LogOut, MapPin,
  MessageCircle, Plus, Shield, Smartphone, Sparkles, User, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getAccompanied } from "@/lib/companion";
import { getMyAgenda, relativeDay } from "@/lib/simpleAgenda";
import { INTERESTS } from "@/lib/interests";
import { logout } from "@/app/(auth)/actions";
import { switchToSimple } from "../actions";
import BackButton from "@/components/BackButton";
import Avatar from "@/components/Avatar";
import {
  AcceptCodeForm, AvatarEditor, DeleteAccount, EditRow, InterestsForm, NameForm, NoticeToggle, PasswordForm, PlaceForm, Switch,
} from "./ProfileParts";
import { stopSharing } from "./actions";

export const metadata = { title: "Mi perfil · MiMad" };

// "+34612345678" → "+34 612 345 678"
function prettyPhone(p: string | null): string {
  if (!p) return "Sin teléfono";
  const m = p.match(/^\+34(\d{3})(\d{3})(\d{3})$/);
  return m ? `+34 ${m[1]} ${m[2]} ${m[3]}` : p.startsWith("+") ? p : `+34 ${p}`;
}

// Recuadro de color para el icono de cada fila (cada sección con su color)
const TONES = {
  coral: "bg-coral/10 text-coral-texto",
  azul: "bg-blue-50 text-blue-700",
  verde: "bg-green-50 text-green-700",
  violeta: "bg-violet-50 text-violet-700",
  ambar: "bg-amber-50 text-amber-700",
  gris: "bg-slate-100 text-slate-700",
} as const;
type Tone = keyof typeof TONES;
const tile = (tone: Tone, icon: ReactNode) => (
  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`} aria-hidden="true">{icon}</span>
);

function SectionTitle({ id, icon, tone, children, aside }: { id: string; icon: ReactNode; tone: Tone; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONES[tone]}`} aria-hidden="true">{icon}</span>
      <h2 id={id} className="flex-1 text-xl font-bold">{children}</h2>
      {aside}
    </div>
  );
}

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
  // Quién me acompaña (nombres y fotos: se pueden leer porque hay vínculo aceptado)
  const familiarIds = (meAcompanan ?? []).map((v) => v.familiar as string);
  const personaIds = activas.map((a) => a.persona.id);
  const { data: otros } =
    familiarIds.length || personaIds.length
      ? await supabase.from("mm_perfiles").select("id, nombre, foto_url, simplificada").in("id", [...familiarIds, ...personaIds])
      : { data: [] };
  const otro = (id: string) => otros?.find((o) => o.id === id);
  const acompananme = (meAcompanan ?? []).map((v) => ({
    id: v.id as string,
    nombre: otro(v.familiar as string)?.nombre ?? "Un familiar",
    foto: otro(v.familiar as string)?.foto_url ?? null,
  }));

  // "Planes hechos": inscripciones cuyo plan ya ha terminado (ya no salen en la agenda)
  const proximos = agenda.length;
  const hechos = Math.max(0, (totalInscripciones ?? 0) - proximos);
  const vinculadas = activas.length + acompananme.length;
  const myInterests = INTERESTS.filter((i) => perfil.intereses.includes(i.id));
  const place = [perfil.barrio, perfil.municipio].filter(Boolean).join(", ") || "Sin municipio";
  const municipios = (municipiosData ?? []).map((m) => m.nombre as string);
  const next = agenda[0];

  return (
    <main className="flex flex-col bg-fondo">
      {/* Cabecera con el degradado de la marca, foto e intereses */}
      <section className="bg-degradado relative overflow-hidden px-5 pb-16 pt-2 text-white">
        <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15" aria-hidden="true" />
        <span className="pointer-events-none absolute -left-10 bottom-4 h-32 w-32 rounded-full bg-white/10" aria-hidden="true" />

        <header className="relative -mx-3 flex items-center gap-1 text-white">
          <BackButton />
          <h1 className="flex-1 text-xl font-bold">Mi perfil</h1>
          <Link href="/notificaciones" aria-label="Notificaciones" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Bell size={22} aria-hidden="true" />
          </Link>
        </header>

        <div className="relative mt-2 flex flex-col items-center gap-2 text-center">
          <AvatarEditor url={perfil.foto_url} name={perfil.nombre} />
          <p className="mt-1 text-3xl font-bold text-balance drop-shadow-sm">{perfil.nombre}</p>
          <p className="flex items-center gap-1.5 text-lg text-white/95">
            <MapPin size={18} aria-hidden="true" /> {place}
          </p>
          {myInterests.length > 0 && (
            <ul className="mt-1 flex flex-wrap justify-center gap-2" aria-label="Tus intereses">
              {myInterests.map(({ id, label, icon: Icon }) => (
                <li key={id} className="flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-sm font-semibold backdrop-blur-sm">
                  <Icon size={15} aria-hidden="true" /> {label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-7 px-5 pb-10">
        {/* Contadores: tarjeta montada sobre la cabecera */}
        <ul className="-mt-10 grid grid-cols-3 divide-x divide-slate-100 rounded-3xl bg-white py-4 shadow-lg" aria-label="Resumen">
          {[
            { n: proximos, label: proximos === 1 ? "plan apuntado" : "planes apuntados", icon: <CalendarCheck size={20} />, tone: "coral" as Tone, href: "/agenda" },
            { n: hechos, label: hechos === 1 ? "plan hecho" : "planes hechos", icon: <History size={20} />, tone: "verde" as Tone, href: null },
            { n: vinculadas, label: vinculadas === 1 ? "persona vinculada" : "personas vinculadas", icon: <Users size={20} />, tone: "violeta" as Tone, href: "#vinculadas" },
          ].map(({ n, label, icon, tone, href }) => {
            const inner = (
              <>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${TONES[tone]}`} aria-hidden="true">{icon}</span>
                <span className="text-3xl font-bold leading-none">{n}</span>
                <span className="px-1 text-sm leading-tight text-gris">{label}</span>
              </>
            );
            const cls = "flex flex-col items-center gap-1.5 text-center";
            return <li key={label}>{href ? <Link href={href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
          })}
        </ul>

        {/* Próximo plan, para entrar rápido a la agenda */}
        {next && (
          <Link href="/agenda" className="flex items-center gap-3 rounded-2xl border border-coral/20 bg-white p-4 shadow-sm">
            <span className="bg-degradado flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" aria-hidden="true">
              <CalendarDays size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold uppercase tracking-wide text-coral-texto">Tu próximo plan · {relativeDay(next.date)}</span>
              <span className="block truncate text-lg font-semibold">{next.evento.titulo}</span>
            </span>
            <ChevronRight size={22} className="text-gris" aria-hidden="true" />
          </Link>
        )}

        {/* Personas vinculadas */}
        <section id="vinculadas" aria-labelledby="t-vinculadas" className="flex scroll-mt-20 flex-col gap-3">
          <SectionTitle id="t-vinculadas" icon={<HeartHandshake size={18} />} tone="coral" aside={<span className="text-sm text-gris">Agenda y recomendaciones</span>}>
            Personas vinculadas
          </SectionTitle>
          <div className="flex flex-col gap-3 rounded-3xl bg-gradient-to-br from-crema to-white p-4 ring-1 ring-coral/15">
            {activas.map(({ persona }) => {
              const o = otro(persona.id);
              return (
                <div key={persona.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar url={o?.foto_url} name={persona.nombre} size={56} tone="ambar" className="ring-2 ring-amber-200" />
                    <div className="min-w-0">
                      <p className="text-xl font-bold">{persona.nombre}</p>
                      <p className="text-sm text-gris">
                        La acompañas{o?.simplificada ? " · Usa la versión simplificada" : ""}
                      </p>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-sm font-medium text-green-800 ring-1 ring-green-200">✓ Vinculada</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href={`/agenda?de=${persona.id}`} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 text-base font-medium">
                      <CalendarDays size={18} className="text-coral-texto" aria-hidden="true" /> Ver su agenda
                    </Link>
                    <Link href={`/acompanamiento/recomendar?persona=${persona.id}`} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 text-base font-medium">
                      <Heart size={18} className="text-coral-texto" aria-hidden="true" /> Recomendar plan
                    </Link>
                  </div>
                </div>
              );
            })}

            {acompananme.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <Avatar url={f.foto} name={f.nombre} size={56} tone="azul" className="ring-2 ring-blue-200" />
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

            <Link href="/acompanamiento" className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-coral/40 bg-white/60 text-lg font-semibold text-coral-texto">
              <Plus size={22} aria-hidden="true" /> Vincular a otra persona
            </Link>
          </div>
        </section>

        {/* Mi cuenta */}
        <section aria-labelledby="t-cuenta" className="flex flex-col gap-3">
          <SectionTitle id="t-cuenta" icon={<User size={18} />} tone="azul">Mi cuenta</SectionTitle>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <EditRow icon={tile("azul", <User size={22} />)} title="Nombre" value={perfil.nombre}>
              <NameForm nombre={perfil.nombre} />
            </EditRow>
            <li className="flex items-center gap-4 bg-white p-4">
              {tile("azul", <Smartphone size={22} />)}
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold">Teléfono móvil</span>
                <span className="block text-sm text-gris">{prettyPhone(perfil.telefono)} · Es con el que entras</span>
              </span>
            </li>
            <EditRow icon={tile("azul", <MapPin size={22} />)} title="Municipio y código postal" value={place}>
              <PlaceForm municipio={perfil.municipio ?? ""} municipios={municipios} />
            </EditRow>
            <EditRow icon={tile("azul", <Sparkles size={22} />)} title="Intereses" value={myInterests.map((i) => i.label).join(", ") || "Sin elegir"}>
              <InterestsForm intereses={perfil.intereses} />
            </EditRow>
            <EditRow icon={tile("azul", <Lock size={22} />)} title="Cambiar contraseña">
              <PasswordForm />
            </EditRow>
          </ul>
        </section>

        {/* Avisos */}
        <section aria-labelledby="t-avisos" className="flex flex-col gap-3">
          <SectionTitle id="t-avisos" icon={<Bell size={18} />} tone="verde">Avisos</SectionTitle>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <NoticeToggle field="avisos_whatsapp" initial={perfil.avisos_whatsapp} icon={tile("verde", <MessageCircle size={22} />)} title="Avisos por WhatsApp" detail="Recordatorios y planes recomendados" />
            <NoticeToggle field="avisos_app" initial={perfil.avisos_app ?? true} icon={tile("verde", <Bell size={22} />)} title="Avisos en la app" detail="Novedades cerca de ti" />
          </ul>
        </section>

        {/* Accesibilidad y acompañamiento */}
        <section aria-labelledby="t-accesibilidad" className="flex flex-col gap-3">
          <SectionTitle id="t-accesibilidad" icon={<HeartHandshake size={18} />} tone="violeta">Accesibilidad</SectionTitle>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <li>
              <form action={switchToSimple} className="flex items-center gap-4 bg-white p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-lg font-bold text-violet-700" aria-hidden="true">Aa</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">Versión simplificada</span>
                  <span className="block text-sm text-gris">Letra más grande y menos opciones</span>
                </span>
                <Switch on={false} label="Versión simplificada" />
              </form>
            </li>
            <li className="flex flex-col gap-3 bg-white p-4">
              <div className="flex items-center gap-4">
                {tile("violeta", <HeartHandshake size={22} />)}
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
          <SectionTitle id="t-privacidad" icon={<Shield size={18} />} tone="gris">Privacidad</SectionTitle>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <li>
              <Link href="/privacidad" className="flex items-center gap-4 bg-white p-4">
                {tile("gris", <Shield size={22} />)}
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">Privacidad y mis datos</span>
                  <span className="block text-sm text-gris">Qué guardamos y quién lo ve</span>
                </span>
                <ChevronRight size={22} className="text-gris" aria-hidden="true" />
              </Link>
            </li>
            <li>
              <a href="/perfil/mis-datos" download className="flex items-center gap-4 bg-white p-4">
                {tile("gris", <Download size={22} />)}
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
          <button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-lg font-semibold text-coral-texto shadow-sm ring-2 ring-coral/30">
            <LogOut size={22} aria-hidden="true" /> Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
