import { testesPorTecido, nomeTecido, tituloSemTecido } from "@/lib/testes";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { TestesNav } from "./TestesNav";

export default async function LayoutTestes({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioAtual();

  if (usuario && !usuario.aprovado) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-ink-soft">
          Seu cadastro está aguardando aprovação da coordenação do
          laboratório.
        </p>
      </main>
    );
  }

  const grupos = Array.from(testesPorTecido().entries()).map(
    ([tecido, lista]) => ({
      tecido,
      nome: nomeTecido(tecido),
      itens: lista.map((teste) => ({
        slug: teste.slug,
        titulo: tituloSemTecido(teste.titulo, tecido),
      })),
    })
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:gap-12">
      <aside className="shrink-0 lg:sticky lg:top-28 lg:w-64 lg:self-start">
        <TestesNav grupos={grupos} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
