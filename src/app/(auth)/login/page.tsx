import AuthShell from "@/components/AuthShell";
import LoginForm from "./LoginForm";

export const metadata = { title: "Iniciar sesión · MiMad" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; borrada?: string }> }) {
  const { next, borrada } = await searchParams;
  return (
    <AuthShell tab="login">
      {borrada && (
        <p role="status" className="rounded-2xl bg-slate-100 p-4 text-base">
          Tu cuenta y todos tus datos se han borrado. Si quieres volver, puedes crear una cuenta nueva cuando quieras.
        </p>
      )}
      <LoginForm next={next ?? "/"} />
    </AuthShell>
  );
}
