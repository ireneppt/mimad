import SimpleLogin from "./SimpleLogin";

export const metadata = { title: "Entrar · MiMad simplificada" };

export default async function SimpleLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <SimpleLogin next={next ?? "/simple"} />;
}
