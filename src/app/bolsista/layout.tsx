import { getUsuarioAtual } from "@/lib/supabase/profile";

export default async function LayoutBolsista({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioAtual();

  if (usuario && !usuario.aprovado) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
          Cadastro em análise
        </p>
        <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
          Olá, {usuario.nome}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
          Seu cadastro está aguardando aprovação da coordenação do
          laboratório. Assim que for liberado, o site passa a mostrar sua
          área normalmente.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
