import { getUsuarioAtual } from "@/lib/supabase/profile";

export default async function LayoutBolsista({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioAtual();

  if (usuario && !usuario.aprovado) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Olá, {usuario.nome}</h1>
        <p className="mt-2 text-black/70 dark:text-white/70">
          Seu cadastro está aguardando aprovação da coordenação do
          laboratório. Assim que for liberado, o site passa a mostrar sua
          área normalmente.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
