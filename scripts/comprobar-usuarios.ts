// Comprueba las reglas de seguridad de las tablas mm_ con usuarios reales de prueba.
// Crea 3 cuentas temporales (Lucía, Carmen y Otra), intenta saltarse cada regla
// y al final las borra. Necesita SUPABASE_SERVICE_ROLE_KEY (solo para crear/borrar).
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

type Check = (label: string, passed: boolean, detail: unknown) => void;

// Se leen al usarse (no al cargar el archivo), cuando .env.local ya está cargado
const env = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL!, anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! });

const NIF_REGISTRADO = "G28727261";
const NIF_INVENTADO = "X0000000Z";

async function newUser(admin: SupabaseClient, nombre: string, simplificada = false, extra: Record<string, unknown> = {}) {
  // Para el correo de prueba: sin tildes ni espacios, solo letras y números
  const slug = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const email = `prueba-${slug}-${randomUUID().slice(0, 8)}@prueba.mimad.app`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, simplificada, ...extra },
  });
  if (error || !data.user) throw new Error(`No se pudo crear ${nombre}: ${error?.message}`);

  // Cliente con la clave pública y la sesión de este usuario, igual que la app
  const client = createClient(env().url, env().anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError) throw new Error(`No se pudo entrar como ${nombre}: ${loginError.message}`);
  return { id: data.user.id, db: client };
}

export async function checkUsers(check: Check) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.log("(sin SUPABASE_SERVICE_ROLE_KEY: se omiten las pruebas con usuarios)");
    return;
  }
  const admin = createClient(env().url, serviceKey, { auth: { persistSession: false } });
  const created: string[] = [];

  try {
    const lucia = await newUser(admin, "Lucía");
    const carmen = await newUser(admin, "Carmen", true);
    const otra = await newUser(admin, "Otra");
    created.push(lucia.id, carmen.id, otra.id);
    const evento = "agenda_madrid:prueba";

    // Perfil creado solo al registrarse
    const perfil = await carmen.db.from("mm_perfiles").select("nombre, simplificada").eq("id", carmen.id).single();
    check("El perfil se crea al registrarse", perfil.data?.nombre === "Carmen" && perfil.data?.simplificada === true, perfil.data ?? perfil.error?.message);

    // Sin sesión no se ve nada
    const sinSesion = createClient(env().url, env().anon);
    const anonPerfiles = await sinSesion.from("mm_perfiles").select("id").limit(1);
    check("Sin sesión no se pueden leer perfiles", !!anonPerfiles.error || (anonPerfiles.data ?? []).length === 0, anonPerfiles.error?.message ?? anonPerfiles.data);

    // Antes de vincularse: nadie ve a nadie
    const antes = await lucia.db.from("mm_perfiles").select("id").eq("id", carmen.id);
    check("Sin vínculo, Lucía no ve el perfil de Carmen", (antes.data ?? []).length === 0, antes.data);

    const recAntes = await lucia.db.from("mm_recomendaciones").insert({ para: carmen.id, evento_id: evento });
    check("Sin vínculo, Lucía no puede recomendar a Carmen", !!recAntes.error, recAntes.error?.message ?? "¡se pudo!");

    // Lucía crea la invitación
    const inv = await lucia.db.from("mm_vinculos").insert({}).select("codigo, estado").single();
    check("Lucía crea una invitación con código", !!inv.data?.codigo && inv.data.estado === "pendiente", inv.data ?? inv.error?.message);

    const trampa = await otra.db.from("mm_vinculos").insert({ familiar: otra.id, persona: carmen.id, estado: "aceptado" });
    check("Nadie puede crear un vínculo ya aceptado sin código", !!trampa.error, trampa.error?.message ?? "¡se pudo!");

    const codigoMalo = await carmen.db.rpc("aceptar_vinculo", { p_codigo: "ZZZZZZ" });
    const maloError = codigoMalo.data?.[0]?.error ?? codigoMalo.error?.message;
    check("Un código inventado no vincula", !!maloError && !codigoMalo.data?.[0]?.vinculo_id, maloError ?? "¡se pudo!");

    // Probar códigos a lo loco: a los 10 fallos en una hora, se bloquea
    for (let i = 0; i < 10; i++) await otra.db.rpc("aceptar_vinculo", { p_codigo: `QQQQ${String(i).padStart(2, "2")}` });
    const bloqueo = await otra.db.rpc("aceptar_vinculo", { p_codigo: inv.data?.codigo ?? "" });
    check("Tras 10 códigos equivocados, se bloquea (aunque el siguiente sea bueno)", !!bloqueo.error && !bloqueo.data, bloqueo.error?.message ?? "¡no se bloqueó!");

    // Dos invitaciones seguidas tienen códigos distintos
    const otraInv = await lucia.db.from("mm_vinculos").insert({}).select("codigo").single();
    check("Cada invitación tiene un código distinto", !!otraInv.data && otraInv.data.codigo !== inv.data?.codigo, otraInv.data?.codigo ?? otraInv.error?.message);

    // Carmen acepta con el código correcto
    const acepta = await carmen.db.rpc("aceptar_vinculo", { p_codigo: inv.data?.codigo ?? "" });
    check("Carmen acepta con el código", acepta.data?.[0]?.familiar_nombre === "Lucía", acepta.data ?? acepta.error?.message);

    // Después de vincularse
    const despues = await lucia.db.from("mm_perfiles").select("nombre").eq("id", carmen.id);
    check("Con vínculo aceptado, Lucía ve el perfil de Carmen", despues.data?.[0]?.nombre === "Carmen", despues.data);

    const otraVe = await otra.db.from("mm_perfiles").select("id").in("id", [lucia.id, carmen.id]);
    check("Otra persona no ve a ninguna de las dos", (otraVe.data ?? []).length === 0, otraVe.data);

    // Inscripciones
    await carmen.db.from("mm_inscripciones").insert({ evento_id: evento });
    await lucia.db.from("mm_inscripciones").insert({ evento_id: "agenda_madrid:prueba-lucia" });

    const agendaCarmen = await lucia.db.from("mm_inscripciones").select("evento_id").eq("usuario", carmen.id);
    check("Lucía ve la agenda de Carmen", (agendaCarmen.data ?? []).length === 1, agendaCarmen.data);

    const agendaLucia = await carmen.db.from("mm_inscripciones").select("evento_id").eq("usuario", lucia.id);
    check("Carmen no ve la agenda de Lucía (el vínculo va en un sentido)", (agendaLucia.data ?? []).length === 0, agendaLucia.data);

    const agendaOtra = await otra.db.from("mm_inscripciones").select("evento_id").eq("usuario", carmen.id);
    check("Otra persona no ve la agenda de Carmen", (agendaOtra.data ?? []).length === 0, agendaOtra.data);

    const apuntarAOtra = await lucia.db.from("mm_inscripciones").insert({ usuario: carmen.id, evento_id: "x" });
    check("Lucía no puede apuntar a Carmen a un plan", !!apuntarAOtra.error, apuntarAOtra.error?.message ?? "¡se pudo!");

    // Recomendaciones
    const rec = await lucia.db.from("mm_recomendaciones").insert({ para: carmen.id, evento_id: evento, mensaje: "¿Vamos?" }).select("id").single();
    check("Con vínculo, Lucía recomienda un plan a Carmen", !!rec.data, rec.data ?? rec.error?.message);

    const recOtra = await otra.db.from("mm_recomendaciones").insert({ para: carmen.id, evento_id: evento });
    check("Otra persona no puede recomendar a Carmen", !!recOtra.error, recOtra.error?.message ?? "¡se pudo!");

    const responde = await carmen.db.from("mm_recomendaciones").update({ estado: "aceptada" }).eq("id", rec.data?.id ?? "").select("estado");
    check("Carmen acepta la recomendación", responde.data?.[0]?.estado === "aceptada", responde.data ?? responde.error?.message);

    // Notificaciones: las crea la base de datos y nadie puede falsificarlas
    const avisosCarmen = await carmen.db.from("mm_notificaciones").select("tipo, titulo");
    check("Carmen recibe el aviso de la recomendación", (avisosCarmen.data ?? []).some((n) => n.tipo === "recomendacion"), avisosCarmen.data?.map((n) => n.titulo));
    const avisosLucia = await lucia.db.from("mm_notificaciones").select("tipo, titulo");
    check("Lucía recibe que Carmen aceptó la invitación y el plan", ["vinculo", "recomendacion_aceptada"].every((t) => (avisosLucia.data ?? []).some((n) => n.tipo === t)), avisosLucia.data?.map((n) => n.titulo));
    const falso = await otra.db.from("mm_notificaciones").insert({ usuario: carmen.id, tipo: "recomendacion", titulo: "Falso" });
    check("Nadie puede crear avisos a mano", !!falso.error, falso.error?.message ?? "¡se pudo!");
    const ajenos = await otra.db.from("mm_notificaciones").select("id");
    check("Nadie ve los avisos de otra persona", (ajenos.data ?? []).length === 0, ajenos.data);

    // Entidades: la verificación no se puede falsear
    const falsa = await otra.db.from("mm_entidades").insert({ nombre: "Falsa", nif: NIF_INVENTADO, verificada: true }).select("verificada").single();
    check("Una entidad con NIF inventado no puede marcarse verificada", falsa.data?.verificada === false, falsa.data ?? falsa.error?.message);

    const evFalsa = await otra.db.from("mm_eventos")
      .insert({ entidad_id: (await otra.db.from("mm_entidades").select("id").single()).data?.id, titulo: "Prueba", fecha_inicio: "2026-10-20 17:00", estado: "publicado" })
      .select("estado").single();
    check("Su evento queda pendiente aunque pida 'publicado'", evFalsa.data?.estado === "pendiente", evFalsa.data ?? evFalsa.error?.message);

    const real = await lucia.db.from("mm_entidades").insert({ nombre: "Asociación", nif: NIF_REGISTRADO }).select("verificada, nombre_oficial").single();
    check("Una entidad con NIF del registro queda verificada", real.data?.verificada === true, real.data ?? real.error?.message);

    const verOtraEntidad = await lucia.db.from("mm_entidades").select("id").eq("usuario", otra.id);
    check("Nadie ve la entidad de otra persona", (verOtraEntidad.data ?? []).length === 0, verOtraEntidad.data);

    // Fotos de perfil: cada persona solo puede subir a su carpeta
    const png = new Blob([Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0))], { type: "image/png" });
    const mia = await carmen.db.storage.from("avatares").upload(`${carmen.id}/prueba.png`, png, { contentType: "image/png" });
    check("Cada persona puede subir su foto", !mia.error, mia.error?.message ?? "subida");
    const ajena = await otra.db.storage.from("avatares").upload(`${carmen.id}/intruso.png`, png, { contentType: "image/png" });
    check("Nadie puede subir fotos a la carpeta de otra persona", !!ajena.error, ajena.error?.message ?? "¡se pudo!");
    await admin.storage.from("avatares").remove([`${carmen.id}/prueba.png`, `${carmen.id}/intruso.png`]);

    // Cuentas de entidad: publican, no participan
    const ent = await newUser(admin, "Entidad de prueba", false, { tipo: "entidad" });
    created.push(ent.id);
    await ent.db.from("mm_entidades").insert({ nombre: "Asociación de prueba", nif: NIF_REGISTRADO });
    const entApunta = await ent.db.from("mm_inscripciones").insert({ evento_id: "agenda_madrid:prueba" });
    check("Una entidad no puede apuntarse a planes", !!entApunta.error, entApunta.error?.message ?? "¡se pudo!");
    const entVinculo = await ent.db.from("mm_vinculos").insert({});
    check("Una entidad no puede crear vínculos de acompañamiento", !!entVinculo.error, entVinculo.error?.message ?? "¡se pudo!");
    const { data: entRow } = await ent.db.from("mm_entidades").select("id").single();
    const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const plan = await ent.db.from("mm_eventos")
      .insert({ entidad_id: entRow?.id, titulo: "Taller de prueba", fecha_inicio: `${manana}T17:00:00`, direccion: "Calle Bronce 16", lat: 40.389, lon: -3.688 })
      .select("id, estado").single();
    const visible = await carmen.db.from("v_eventos").select("id, organizacion").eq("id", `entidad:${plan.data?.id}`);
    check("El plan de una entidad verificada se publica y lo ven las personas", plan.data?.estado === "publicado" && (visible.data ?? []).length === 1, visible.data ?? plan.error?.message);
    await carmen.db.from("mm_inscripciones").insert({ evento_id: `entidad:${plan.data?.id}` });

    // Mensajes de la entidad: solo escribe la entidad; solo leen las personas apuntadas
    const msg = await ent.db.from("mm_mensajes_evento").insert({ evento_id: plan.data?.id, texto: "Cambiamos a la sala 2" });
    const leeCarmen = await carmen.db.from("mm_mensajes_evento").select("texto");
    const avisoMsg = await carmen.db.from("mm_notificaciones").select("titulo").eq("tipo", "mensaje");
    check("La entidad escribe y la persona apuntada lo lee y recibe el aviso", !msg.error && (leeCarmen.data ?? []).length === 1 && (avisoMsg.data ?? []).length === 1, msg.error?.message ?? avisoMsg.data);
    const leeOtra = await otra.db.from("mm_mensajes_evento").select("texto");
    check("Quien no está apuntada no ve los mensajes", (leeOtra.data ?? []).length === 0, leeOtra.data);
    const escribeCarmen = await carmen.db.from("mm_mensajes_evento").insert({ evento_id: plan.data?.id, texto: "Hola" });
    check("Las personas no pueden escribir mensajes", !!escribeCarmen.error, escribeCarmen.error?.message ?? "¡se pudo!");

    await ent.db.from("mm_eventos").update({ estado: "cancelado" }).eq("id", plan.data?.id ?? "");
    const tras = await carmen.db.from("v_eventos").select("id").eq("id", `entidad:${plan.data?.id}`);
    const aviso = await carmen.db.from("mm_notificaciones").select("titulo").eq("tipo", "plan_cambio");
    check("Al cancelarlo desaparece y se avisa a las personas apuntadas", (tras.data ?? []).length === 0 && (aviso.data ?? []).length === 1, aviso.data);

    // Perfil: apagar avisos y borrar la propia cuenta
    const avisos = await carmen.db.from("mm_perfiles").update({ avisos_app: false }).eq("id", carmen.id).select("avisos_app");
    check("Cada persona puede apagar sus avisos", avisos.data?.[0]?.avisos_app === false, avisos.data ?? avisos.error?.message);

    const borrar = await otra.db.rpc("borrar_mi_cuenta");
    const { data: sigue } = await admin.auth.admin.getUserById(otra.id);
    const { data: suEntidad } = await admin.from("mm_entidades").select("id").eq("usuario", otra.id);
    check("«Borrar mi cuenta» borra la cuenta y sus datos", !borrar.error && !sigue.user && (suEntidad ?? []).length === 0, borrar.error?.message ?? "borrada");
    const { data: luciaSigue } = await admin.auth.admin.getUserById(lucia.id);
    check("…y solo la suya", !!luciaSigue.user, luciaSigue.user ? "las demás siguen" : "¡borró otra!");
  } catch (e) {
    check("Pruebas con usuarios", false, e instanceof Error ? e.message : String(e));
  } finally {
    // Borrar las cuentas de prueba (sus filas se borran en cascada)
    for (const id of created) await admin.auth.admin.deleteUser(id);
  }
}
