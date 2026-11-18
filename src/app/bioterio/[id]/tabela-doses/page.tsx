import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import {
  siglaVia,
  media,
  doseMlPorAnimal,
  numeracaoCaixas,
  UNIDADES_DOSE,
  type CaixaRow,
  type ProcedimentoRow,
} from "@/lib/bioterio";
import BotaoImprimir from "../etiquetas/BotaoImprimir";

type Projeto = { id: string; nome: string; especie: string | null };
type Grupo = { id: string; nome: string };

function usaPeso(p: ProcedimentoRow): boolean {
  if (p.dose_valor == null) return false;
  return UNIDADES_DOSE.find((u) => u.valor === p.dose_unidade)?.usaPeso ?? false;
}

function fmt(n: number | null, casas = 3): string {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export default async function PaginaTabelaDoses({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  const supabase = await createClient();

  const [{ data: projeto }, { data: grupos }, { data: membros }, { data: caixas }, { data: procedimentos }] =
    await Promise.all([
      supabase.from("projetos").select("id, nome, especie").eq("id", id).maybeSingle().returns<Projeto>(),
      supabase.from("projeto_grupos").select("id, nome").eq("projeto_id", id).returns<Grupo[]>(),
      supabase.from("projeto_membros").select("profile_id").eq("projeto_id", id),
      supabase
        .from("bioterio_caixas")
        .select("id, grupo_id, num_ratos, ordem, pesos, mortos, leva")
        .eq("projeto_id", id)
        .order("leva", { ascending: true, nullsFirst: true })
        .order("ordem", { ascending: true })
        .returns<CaixaRow[]>(),
      supabase
        .from("bioterio_procedimentos")
        .select("id, tipo, doenca, substancia, dose_valor, dose_unidade, concentracao, via, dias, inicio, caixa_ids, ordem")
        .eq("projeto_id", id)
        .order("ordem", { ascending: true })
        .returns<ProcedimentoRow[]>(),
    ]);

  if (!projeto) notFound();
  const souMembro = membros?.some((m) => m.profile_id === usuario.id) ?? false;
  if (!souMembro && usuario.papel !== "orientador") notFound();

  const nomeGrupo = new Map((grupos ?? []).map((g) => [g.id, g.nome]));
  const numeros = numeracaoCaixas(caixas ?? []);
  const numeroPorCaixa = new Map((caixas ?? []).map((c, i) => [c.id, numeros[i]]));

  // Só procedimentos que dependem do peso (mg/kg, mL/kg) têm um volume
  // calculável — os demais (mL/animal fixo, água) não entram na tabela.
  const procsComDose = (procedimentos ?? []).filter(usaPeso);

  // Para cada procedimento, as caixas que o recebem (com peso registrado).
  const grupinhos = procsComDose
    .map((p) => {
      const linhas = (caixas ?? [])
        .filter((c) => (p.caixa_ids ?? []).includes(c.id))
        .map((c) => {
          const pesoMedio = media((c.pesos ?? []).map(Number));
          const dose = doseMlPorAnimal(
            pesoMedio,
            p.dose_valor,
            p.dose_unidade,
            p.concentracao
          );
          return {
            numero: numeroPorCaixa.get(c.id) ?? "?",
            grupo: nomeGrupo.get(c.grupo_id) ?? "?",
            leva: c.leva ?? 1,
            pesoMedio,
            numRatos: c.num_ratos,
            dose,
            total: dose != null ? dose * c.num_ratos : null,
          };
        });
      return { proc: p, linhas };
    })
    .filter((g) => g.linhas.length > 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div data-noprint className="mb-6 flex items-center justify-between gap-3 border-b border-rule pb-4">
        <Link href={`/bioterio/${id}`} className="text-sm text-ink-soft hover:text-signal">
          ← Voltar
        </Link>
        <span className="text-xs text-ink-soft">
          Doses recalculam sozinhas quando o peso médio muda
        </span>
        <BotaoImprimir />
      </div>

      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-signal">
          LANC · FURB · consulta rápida
        </p>
        <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
          Tabela de doses
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{projeto.nome}</p>
      </header>

      {grupinhos.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Nenhuma dose calculável ainda. Cadastre um procedimento em mg/kg (ou
          mL/kg) e registre os pesos das caixas no biotério.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {grupinhos.map(({ proc, linhas }) => (
            <section
              key={proc.id}
              className="break-inside-avoid rounded-lg border border-rule p-5"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                {proc.tipo === "inducao" ? "Indução" : "Tratamento"}
                {proc.via ? ` · ${siglaVia(proc.via)}` : ""}
              </p>
              <h2 className="mt-0.5 font-display text-xl text-ink">
                {proc.substancia} — {proc.dose_valor} {proc.dose_unidade}
              </h2>
              {proc.concentracao != null && (
                <p className="mt-0.5 text-xs text-ink-soft">
                  {proc.concentracao.toLocaleString("pt-BR")} mg/mL
                </p>
              )}

              <div className="mt-4 flex flex-col divide-y divide-rule/70">
                {linhas.map((l, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5"
                  >
                    <span className="w-24 shrink-0 font-mono text-sm text-ink">
                      Caixa {l.numero}
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-ink">
                      {l.grupo}
                      <span className="ml-2 font-mono text-xs text-ink-soft">
                        peso méd. {fmt(l.pesoMedio, 1)} g
                        {l.total != null
                          ? ` · total gaiola ${fmt(l.total, 2)} mL`
                          : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="rounded bg-yellow-200 px-2 py-0.5 font-mono text-base font-semibold text-ink">
                        {fmt(l.dose)} mL
                      </span>
                      <span className="block font-mono text-[10px] text-ink-soft">
                        por animal
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 border-t border-rule pt-3 text-xs text-ink-soft">
        Confira sempre a caixa e o peso médio antes de aplicar. Caixas sem peso
        registrado não aparecem com dose.
      </p>
    </main>
  );
}
