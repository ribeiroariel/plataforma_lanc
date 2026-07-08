import { getUsuarioAtual } from "@/lib/supabase/profile";

export default async function LayoutProjetos({
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
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
          Seu cadastro está aguardando aprovação da coordenação do
          laboratório.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
