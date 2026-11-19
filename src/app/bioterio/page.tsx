import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import {
  diaDoTratamento,
  diasRestantes,
  siglaVia,
  vivosNaCaixa,
  type ProcedimentoRow,
} from "@/lib/bioterio";
import { EmptyState } from "@/components/ui/EmptyState";

type Projeto = { id: string; nome: string; finalizado: boolean };
type Caixa = { projeto_id: string; num_ratos: number; mortos: number };
type Proc = ProcedimentoRow & { projeto_id: string };

export default async function PaginaBioterio() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  const supabase = await createClient();

  let projetos: Projeto[] = [];
  if (usuario.papel === "orientador") {
    const { data } = await supabase
      .from("projetos")
      .select("id, nome, finalizado")
      .order("created_at", { ascending: false })
      .returns<Projeto[]>();
    projetos = data ?? [];
  } else {
    const { data: membros } = await supabase
      .from("projeto_membros")
      .select("projeto_id")
      .eq("profile_id", usuario.id);
    const ids = (membros ?? []).map((m) => m.projeto_id);
    if (ids.length > 0) {
      const { data } = await supabase
        .from("projetos")
        .select("id, nome, finalizado")
        .in("id", ids)
        .order("created_at", { ascending: false })
        .returns<Projeto[]>();
      projetos = data ?? [];
    }
  }

  const ids = projetos.map((p) => p.id);
  const [{ data: caixas }, { data: procs }] =
    ids.length > 0
      ? await Promise.all([
          supabase
            .from("bioterio_caixas")
            .select("projeto_id, num_ratos, mortos")
            .in("projeto_id", ids)
            .returns<Caixa[]>(),
          supabase
            .from("bioterio_procedimentos")
            .select(
              "id, projeto_id, tipo, doenca, substancia, dose_valor, dose_unidade, concentracao, via, dias, inicio, caixa_ids, ordem"
            )
            .in("projeto_id", ids)
            .returns<Proc[]>(),
        ])
      : [{ data: [] as Caixa[] }, { data: [] as Proc[] }];

  // Ativos primeiro: quem tem tratamento rodando hoje aparece no topo.
  const resumo = projetos
    .map((p) => {
      const cx = (caixas ?? []).filter((c) => c.projeto_id === p.id);
      const total = cx.reduce((s, c) => s + c.num_ratos, 0);
      const vivos = cx.reduce((s, c) => s + vivosNaCaixa(c), 0);
      const emCurso = (procs ?? [])
        .filter((x) => x.projeto_id === p.id)
        .map((x) => ({ x, dia: diaDoTratamento(x), rest: diasRestantes(x) }))
        .filter((o) => o.dia && o.rest !== 0);
      return { p, caixas: cx.length, total, vivos, emCurso };
    })
    .sort((a, b) => b.emCurso.length - a.emCurso.length);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl leading-tight text-ink">Biotério</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Caixas, pesagens, induções e tratamentos de cada projeto.
          </p>
        </div>
        <Link
          href="/agenda?nova=1&sala=T-206"
          className="rounded border border-rule px-3 py-1.5 text-sm text-ink transition-colors hover:border-pyrogallol hover:text-pyrogallol"
        >
          Reservar o T-206
        </Link>
      </div>

      {resumo.length === 0 ? (
        <EmptyState
          className="mt-8"
          titulo="Você ainda não participa de nenhum projeto"
          descricao="Quando entrar num projeto, as caixas e os tratamentos dele aparecem aqui."
        />
      ) : (
        <div className="mt-6 flex flex-col divide-y divide-rule rounded border border-rule">
          {resumo.map(({ p, caixas: nCaixas, total, vivos, emCurso }) => (
            <Link
              key={p.id}
              href={`/bioterio/${p.id}`}
              className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 transition-colors hover:bg-ink/[0.025]"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">
                  {p.nome}
                  {p.finalizado && <span className="ml-2 text-xs font-normal text-ink-soft">finalizado</span>}
                </span>
                {emCurso.length > 0 ? (
                  <span className="mt-0.5 block text-xs text-pyrogallol">
                    {emCurso
                      .map(
                        ({ x, dia }) =>
                          `${x.substancia ?? "tratamento"}${x.via ? ` (${siglaVia(x.via)})` : ""}: dia ${dia!.dia} de ${dia!.total}`
                      )
                      .join(" · ")}
                  </span>
                ) : (
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {nCaixas === 0 ? "Nenhuma caixa cadastrada" : "Sem tratamento em andamento"}
                  </span>
                )}
              </span>
              {nCaixas > 0 && (
                <span className="font-mono text-sm text-ink-soft">
                  {nCaixas} {nCaixas === 1 ? "caixa" : "caixas"} ·{" "}
                  <span className="text-ink">{vivos}</span>
                  {vivos < total ? ` de ${total}` : ""} vivos
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
