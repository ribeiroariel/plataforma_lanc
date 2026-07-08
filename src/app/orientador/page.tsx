import Link from "next/link";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { testes as catalogoTestes } from "@/lib/testes";

type Bolsista = { id: string; nome: string };
type Projeto = { id: string; nome: string; created_at: string };
type TesteDesignado = {
  id: string;
  projeto_id: string;
  teste_slug: string;
  status: "pendente" | "concluido";
  responsavel_id: string;
};
type Membro = { projeto_id: string; profile_id: string };

function tituloTeste(slug: string) {
  return catalogoTestes.find((t) => t.slug === slug)?.titulo ?? slug;
}

export default async function PainelOrientadora() {
  const usuario = await getUsuarioAtual();
  const supabase = await createClient();

  const [{ data: bolsistas }, { data: projetos }, { data: testes }, { data: membros }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, nome")
        .eq("papel", "bolsista")
        .eq("aprovado", true)
        .order("nome")
        .returns<Bolsista[]>(),
      supabase
        .from("projetos")
        .select("id, nome, created_at")
        .order("created_at", { ascending: false })
        .returns<Projeto[]>(),
      supabase
        .from("projeto_testes")
        .select("id, projeto_id, teste_slug, status, responsavel_id")
        .returns<TesteDesignado[]>(),
      supabase
        .from("projeto_membros")
        .select("projeto_id, profile_id")
        .returns<Membro[]>(),
    ]);

  const nomeBolsista = new Map((bolsistas ?? []).map((b) => [b.id, b.nome]));

  const totalTestes = testes?.length ?? 0;
  const totalConcluidos =
    testes?.filter((t) => t.status === "concluido").length ?? 0;
  const totalPendentes = totalTestes - totalConcluidos;

  const resumo = [
    { rotulo: "Bolsistas", valor: bolsistas?.length ?? 0 },
    { rotulo: "Projetos", valor: projetos?.length ?? 0 },
    { rotulo: "Testes concluídos", valor: totalConcluidos },
    { rotulo: "Testes pendentes", valor: totalPendentes },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Painel da orientadora
      </p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        Olá, {usuario?.nome}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
        Acompanhamento de todos os bolsistas e projetos do laboratório —
        quem está com o quê, e o que ainda está pendente.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded border border-rule bg-rule sm:grid-cols-4">
        {resumo.map((item) => (
          <div key={item.rotulo} className="bg-paper-raised px-4 py-4">
            <dt className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              {item.rotulo}
            </dt>
            <dd className="mt-1 font-display text-3xl tabular-nums text-ink">
              {item.valor}
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-12">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          Bolsistas
        </h2>
        {(!bolsistas || bolsistas.length === 0) && (
          <p className="text-sm text-ink-soft">Nenhum bolsista aprovado ainda.</p>
        )}
        <div className="flex flex-col gap-2">
          {bolsistas?.map((b) => {
            const projetosDoBolsista = new Set(
              (membros ?? [])
                .filter((m) => m.profile_id === b.id)
                .map((m) => m.projeto_id)
            );
            const testesDoBolsista = (testes ?? []).filter(
              (t) => t.responsavel_id === b.id
            );
            const pendentes = testesDoBolsista.filter(
              (t) => t.status === "pendente"
            ).length;
            const concluidos = testesDoBolsista.length - pendentes;

            return (
              <div
                key={b.id}
                className="flex items-center justify-between rounded border border-rule bg-paper-raised px-3 py-2 text-sm"
              >
                <span className="font-medium text-ink">{b.nome}</span>
                <span className="font-mono text-xs text-ink-soft">
                  {projetosDoBolsista.size} proj · {concluidos} concl ·{" "}
                  <span className={pendentes > 0 ? "text-reagent" : ""}>
                    {pendentes} pend
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          Projetos
        </h2>
        {(!projetos || projetos.length === 0) && (
          <p className="text-sm text-ink-soft">Nenhum projeto criado ainda.</p>
        )}
        <div className="flex flex-col gap-3">
          {projetos?.map((p) => {
            const testesDoProjeto = (testes ?? []).filter(
              (t) => t.projeto_id === p.id
            );
            const membrosDoProjeto = (membros ?? []).filter(
              (m) => m.projeto_id === p.id
            ).length;
            const pendentes = testesDoProjeto.filter(
              (t) => t.status === "pendente"
            );

            return (
              <Link
                key={p.id}
                href={`/projetos/${p.id}`}
                className="block rounded border border-rule bg-paper-raised p-4 transition-colors hover:border-absorbance"
              >
                <p className="font-display text-lg text-ink">{p.nome}</p>
                <p className="mt-1 font-mono text-xs text-ink-soft">
                  {membrosDoProjeto} membro(s) · {testesDoProjeto.length} teste(s)
                  designado(s)
                </p>
                {pendentes.length > 0 && (
                  <p className="mt-2 text-xs leading-relaxed text-reagent">
                    Pendentes:{" "}
                    {pendentes
                      .map(
                        (t) =>
                          `${tituloTeste(t.teste_slug)} (${
                            nomeBolsista.get(t.responsavel_id) ?? "?"
                          })`
                      )
                      .join(", ")}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
