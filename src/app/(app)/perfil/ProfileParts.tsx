"use client";

// Piezas del perfil que reaccionan al tocarlas: filas que se abren para editar,
// interruptores y formularios. Las acciones están en ./actions.ts (servidor).
import { createContext, useActionState, useCallback, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { ChevronDown, ChevronRight, CircleCheck, LoaderCircle } from "lucide-react";
import { Field, FormError, PasswordInput, TextInput } from "@/components/forms";
import { INTERESTS } from "@/lib/interests";
import { LIMITS, PASSWORD_RULES } from "@/lib/limits";
import { savePostalCode } from "@/lib/locationActions";
import PhotoPicker from "@/components/PhotoPicker";
import {
  acceptCode, changePassword, deleteAccount, removeAvatar, setNotices, updateAvatar, updateInterests, updateMunicipio, updateName, type ProfileState,
} from "./actions";

// ---------------------------------------------------------------------
// Fila de "Mi cuenta" que se abre al tocarla y muestra su formulario.
// El formulario de dentro la cierra al guardar (con useCloseOnOk).
// ---------------------------------------------------------------------
const CloseRow = createContext<() => void>(() => {});

export function EditRow({ icon, title, value, children }: { icon: ReactNode; title: string; value?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <li>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-4 bg-white p-4 text-left">
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">{title}</span>
          {value && <span className="block truncate text-sm text-gris">{value}</span>}
        </span>
        {open ? <ChevronDown size={22} className="text-gris" aria-hidden="true" /> : <ChevronRight size={22} className="text-gris" aria-hidden="true" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50 p-4">
          <CloseRow.Provider value={close}>{children}</CloseRow.Provider>
        </div>
      )}
    </li>
  );
}

function Saved({ state }: { state: ProfileState }) {
  if (state.error) return <FormError message={state.error} />;
  if (!state.ok) return null;
  return (
    <p role="status" className="flex items-center gap-2 text-base text-green-800">
      <CircleCheck size={18} aria-hidden="true" /> {state.ok}
    </p>
  );
}

function SaveButton({ pending, children = "Guardar" }: { pending: boolean; children?: ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="bg-degradado flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold text-white disabled:opacity-70">
      {pending && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />} {children}
    </button>
  );
}

// Cierra la fila un momento después de guardar bien
function useCloseOnOk(state: ProfileState) {
  const close = useContext(CloseRow);
  useEffect(() => {
    if (!state.ok) return;
    const t = setTimeout(close, 1200);
    return () => clearTimeout(t);
  }, [state, close]);
}

export function NameForm({ nombre }: { nombre: string }) {
  const [state, action, pending] = useActionState(updateName, {});
  useCloseOnOk(state);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Tu nombre" htmlFor="nombre">
        <TextInput id="nombre" name="nombre" defaultValue={nombre} required minLength={LIMITS.nameMin} maxLength={LIMITS.nameMax} autoComplete="given-name" />
      </Field>
      <Saved state={state} />
      <SaveButton pending={pending} />
    </form>
  );
}

export function PlaceForm({ municipio, municipios }: { municipio: string; municipios: string[] }) {
  const [state, action, pending] = useActionState(updateMunicipio, {});
  const [cpState, cpAction, cpPending] = useActionState(savePostalCode, {});
  useCloseOnOk(state);
  useCloseOnOk(cpState);
  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-3">
        <Field label="Municipio" htmlFor="municipio-perfil">
          <TextInput id="municipio-perfil" name="municipio" list="municipios-perfil" defaultValue={municipio} maxLength={LIMITS.municipioMax} autoComplete="address-level2" />
          <datalist id="municipios-perfil">{municipios.map((m) => <option key={m} value={m} />)}</datalist>
        </Field>
        <Saved state={state} />
        <SaveButton pending={pending} />
      </form>
      <form action={cpAction} className="flex flex-col gap-3 border-t border-slate-200 pt-4">
        <Field label="Código postal (más preciso)" htmlFor="cp-perfil" hint="Las distancias se calcularán desde el centro de tu código postal.">
          <TextInput id="cp-perfil" name="codigo_postal" inputMode="numeric" maxLength={5} pattern="28[0-9]{3}" placeholder="28045" autoComplete="postal-code" />
        </Field>
        <Saved state={cpState} />
        <SaveButton pending={cpPending}>Guardar código postal</SaveButton>
      </form>
    </div>
  );
}

export function InterestsForm({ intereses }: { intereses: string[] }) {
  const [state, action, pending] = useActionState(updateInterests, {});
  const [chosen, setChosen] = useState(intereses);
  useCloseOnOk(state);
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  return (
    <form action={action} className="flex flex-col gap-3">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-base font-medium">Elige todos los que quieras ({chosen.length} elegidos)</legend>
        {INTERESTS.map(({ id, label, icon: Icon }) => {
          const on = chosen.includes(id);
          return (
            <label
              key={id}
              className={`flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-base font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-tinta ${
                on ? "bg-degradado border-transparent text-white" : "border-slate-200 bg-white"
              }`}
            >
              <input type="checkbox" name="intereses" value={id} checked={on} onChange={() => toggle(id)} className="sr-only" />
              <Icon size={18} aria-hidden="true" className={on ? "" : "text-coral-texto"} />
              {label}
            </label>
          );
        })}
      </fieldset>
      <Saved state={state} />
      <SaveButton pending={pending} />
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  const [nueva, setNueva] = useState("");
  useCloseOnOk(state);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Contraseña actual" htmlFor="actual">
        <PasswordInput id="actual" name="actual" required autoComplete="current-password" />
      </Field>
      <Field label="Contraseña nueva" htmlFor="nueva">
        <PasswordInput id="nueva" name="nueva" required autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} aria-describedby="reglas-nueva" />
        <ul id="reglas-nueva" className="grid grid-cols-1 gap-1 text-sm min-[400px]:grid-cols-2">
          {PASSWORD_RULES.map((r) => (
            <li key={r.id} className={r.test(nueva) ? "text-green-800" : "text-gris"}>
              {r.test(nueva) ? "✓" : "○"} {r.label}
            </li>
          ))}
        </ul>
      </Field>
      <Field label="Repite la nueva" htmlFor="nueva2">
        <PasswordInput id="nueva2" name="nueva2" required autoComplete="new-password" />
      </Field>
      <Saved state={state} />
      <SaveButton pending={pending}>Cambiar contraseña</SaveButton>
    </form>
  );
}

// ---------------------------------------------------------------------
// Interruptor que se guarda al momento
// ---------------------------------------------------------------------
export function NoticeToggle({ field, initial, icon, title, detail }: { field: "avisos_whatsapp" | "avisos_app"; initial: boolean; icon: ReactNode; title: string; detail: string }) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const flip = () => {
    const next = !on;
    setOn(next); // se ve al momento; si falla, se vuelve atrás
    startTransition(async () => {
      const r = await setNotices(field, next);
      if (r.error) {
        setOn(!next);
        setError(r.error);
      } else setError(null);
    });
  };
  return (
    <li className="flex items-center gap-4 bg-white p-4">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        <span className="block text-sm text-gris">{error ?? detail}</span>
      </span>
      <Switch on={on} onClick={flip} disabled={pending} label={title} />
    </li>
  );
}

export function Switch({ on, onClick, disabled, label }: { on: boolean; onClick?: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-70 ${on ? "bg-degradado" : "bg-slate-300"}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
    </button>
  );
}

// ---------------------------------------------------------------------
// Acompañamiento: escribir el código que me ha dado un familiar
// ---------------------------------------------------------------------
export function AcceptCodeForm() {
  const [state, action, pending] = useActionState(acceptCode, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="¿Te han dado un código de invitación?" htmlFor="codigo" hint="Lo crea tu familiar en su app, en «Vincular a otra persona».">
        <TextInput id="codigo" name="codigo" placeholder="ABC-234" maxLength={7} autoCapitalize="characters" autoComplete="off" className="uppercase tracking-widest" />
      </Field>
      <Saved state={state} />
      <SaveButton pending={pending}>Aceptar invitación</SaveButton>
    </form>
  );
}

// ---------------------------------------------------------------------
// Borrar la cuenta (con confirmación escrita)
// ---------------------------------------------------------------------
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, {});
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-base font-medium text-red-800 underline">
        Borrar mi cuenta
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-base text-red-950">
        Se borrarán tu perfil, tus planes, tus vínculos de acompañamiento y tus avisos. <strong>No se puede deshacer.</strong>
      </p>
      <Field label="Escribe BORRAR para confirmarlo" htmlFor="confirmacion">
        <TextInput id="confirmacion" name="confirmacion" autoComplete="off" />
      </Field>
      <FormError message={state.error} />
      <div className="grid grid-cols-2 gap-2">
        <button type="submit" disabled={pending} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-800 font-semibold text-white disabled:opacity-70">
          {pending && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />} Borrar
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-12 rounded-2xl border border-slate-300 bg-white font-medium">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
// Foto del perfil: al elegirla se sube sola; también se puede quitar
// ---------------------------------------------------------------------
export function AvatarEditor({ url, name }: { url: string | null; name: string }) {
  const [state, action, pending] = useActionState(updateAvatar, {});
  const [removing, startRemoving] = useTransition();
  const [msg, setMsg] = useState<ProfileState>({});
  const formRef = useRef<HTMLFormElement>(null);
  const shown = msg.error || msg.ok ? msg : state;

  return (
    <form ref={formRef} action={action} className="flex flex-col items-center gap-1">
      <PhotoPicker
        key={url ?? "sin-foto"}
        initialUrl={url}
        size={120}
        label="Añadir foto"
        removable={!!url}
        onPicked={() => {
          setMsg({});
          formRef.current?.requestSubmit();
        }}
        onRemove={() => startRemoving(async () => setMsg(await removeAvatar()))}
      />
      {(pending || removing) && <p className="text-sm text-gris">{pending ? "Subiendo foto…" : "Quitando foto…"}</p>}
      {shown.error && <p role="alert" className="text-sm text-red-800">{shown.error}</p>}
      <span className="sr-only">{name}</span>
    </form>
  );
}
