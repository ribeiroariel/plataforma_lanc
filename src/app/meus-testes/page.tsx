import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { carregarMeusTestes, type MeuTeste } from "@/lib/meusTestes";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Abas } from "@/components/ui/Abas";
import { CartaoTeste } from "@/components/testes/CartaoTeste";

function Grade({ itens, vazio }: { itens: MeuTeste[]; vazio: string }) {
  if (itens.length === 0) {
    return <EmptyState className="mt-6" titulo={vazio} />;
  }
  // Agrupa por projeto: o bolsista costuma pensar "o que falta no TCC X".
  const porProjeto = new Map<string, MeuTeste[]>();
  for (const t of itens) {
    const lista = porProjeto.get(t.projetoId) ?? [];
    lista.push(t);
    porProjeto.set(t.projetoId, lista);
  }
  return (
    <div className="mt-6 flex flex-col gap-8">
      {Array.from(porProjeto.entries()).map(([projetoId, lista]) => (
        <section key={projetoId}>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg text-ink">{lista[0].projetoNome}</h2>
            <Link
              href={`/projetos/${projetoId}?aba=testes`}
              className="shrink-0 text-xs text-absorbance hover:underline"
            >
              Abrir projeto
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((t) => (
              <CartaoTeste key={t.id} t={t} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function MeusTestes({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  const { aba } = await searchParams;

  const itens = await carregarMeusTestes(usuario.id);
  const abertos = itens.filter((t) => !t.encerrado && t.status !== "concluido");
  const concluidos = itens.filter((t) => t.encerrado || t.status === "concluido");

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Bancada"
        titulo="Meus testes"
        descricao="Testes designados a você (como responsável ou ajudante), de todos os projetos, com quantos ratos já foram confirmados."
      />

      {itens.length === 0 ? (
        <EmptyState
          className="mt-8"
          titulo="Nenhum teste designado a você por enquanto"
          descricao="Quando um coautor designar um ensaio a você, ele aparece aqui — pendente ou concluído."
        />
      ) : (
        <Abas
          className="mt-6"
          inicial={aba ?? (abertos.length > 0 ? "abertos" : "concluidos")}
          abas={[
            {
              id: "abertos",
              rotulo: "Em aberto",
              indicador: abertos.length,
              conteudo: <Grade itens={abertos} vazio="Nenhum teste em aberto — tudo em dia." />,
            },
            {
              id: "concluidos",
              rotulo: "Concluídos",
              indicador: concluidos.length,
              conteudo: <Grade itens={concluidos} vazio="Nenhum teste concluído ainda." />,
            },
            {
              id: "todos",
              rotulo: "Todos",
              indicador: itens.length,
              conteudo: <Grade itens={itens} vazio="Nenhum teste." />,
            },
          ]}
        />
      )}
    </main>
  );
}
