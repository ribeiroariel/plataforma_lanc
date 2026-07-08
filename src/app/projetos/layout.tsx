import { getUsuarioAtual } from "@/lib/supabase/profile";

export default async function LayoutProjetos({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioAtual();

  if (usuario && !usuario.aprovado) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-black/70 dark:text-white/70">
          Seu cadastro está aguardando aprovação da coordenação do
          laboratório.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
