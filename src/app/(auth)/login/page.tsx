import AuthShell from "@/components/AuthShell";
import LoginForm from "./LoginForm";

export const metadata = { title: "Iniciar sesión · MiMad" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell tab="login">
      <LoginForm next={next ?? "/"} />
    </AuthShell>
  );
}
