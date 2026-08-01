import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import {
  siglaVia,
  textoDose,
  numeracaoCaixas,
  media,
  doseMlPorAnimal,
  type CaixaRow,
  type ProcedimentoRow,
  type ConfigRow,
} from "@/lib/bioterio";
import BotaoImprimir from "./BotaoImprimir";

type Projeto = { id: string; nome: string; especie: string | null };
type Grupo = { id: string; nome: string };

function unidadeAnimal(especie: string | null): string {
  if (especie === "camundongo") return "camundongos";
  if (especie === "rato") return "ratos";
  return "animais";
}

const fmt = (n: number | null, casas = 2) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: casas });

function linhaProc(p: ProcedimentoRow, mlAnimal?: number | null): string {
  const partes: string[] = [];
  if (p.substancia) partes.push(p.substancia);
  const dose = textoDose(p.dose_valor, p.dose_unidade);
  if (dose) partes.push(`— ${dose}`);
  if (p.via) partes.push(`(${siglaVia(p.via)})`);
  let base = partes.join(" ") || "—";
  if (mlAnimal != null) base += ` · ${fmt(mlAnimal, 3)} mL/animal`;
  return base;
}

export default async function PaginaEtiquetas({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ leva?: string }>;
}) {
  const { id } = await params;
  const { leva: levaParam } = await searchParams;
  const leva = Number(levaParam) > 0 ? Number(levaParam) : null;
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  const supabase = await createClient();

  const [{ data: projeto }, { data: grupos }, { data: membros }, { data: caixasTodas }, { data: procedimentos }, { data: configs }] =
    await Promise.all([
      supabase.from("projetos").select("id, nome, especie").eq("id", id).maybeSingle().returns<Projeto>(),
      supabase.from("projeto_grupos").select("id, nome").eq("projeto_id", id).returns<Grupo[]>(),
      supabase.from("projeto_membros").select("profile_id").eq("projeto_id", id),
      supabase
        .from("bioterio_caixas")
        .select("id, grupo_id, num_ratos, ordem, pesos, mortos, leva")
        .eq("projeto_id", id)
        .order("ordem", { ascending: true })
        .returns<CaixaRow[]>(),
      supabase
        .from("bioterio_procedimentos")
        .select("id, tipo, doenca, substancia, dose_valor, dose_unidade, concentracao, via, dias, inicio, caixa_ids, ordem")
        .eq("projeto_id", id)
        .order("ordem", { ascending: true })
        .returns<ProcedimentoRow[]>(),
      supabase
        .from("bioterio_config")
        .select("leva, tratamento_inicio, tratamento_dias")
        .eq("projeto_id", id)
        .returns<ConfigRow[]>(),
    ]);

  if (!projeto) notFound();
  const souMembro = membros?.some((m) => m.profile_id === usuario.id) ?? false;
  if (!souMembro && usuario.papel !== "orientador") notFound();

  const caixas = (caixasTodas ?? []).filter((c) => (leva == null ? true : (c.leva ?? 1) === leva));
  const nomeGrupo = new Map((grupos ?? []).map((g) => [g.id, g.nome]));
  const unidade = unidadeAnimal(projeto.especie);
  const numeros = numeracaoCaixas(caixas);
  const procs = procedimentos ?? [];
  const diasTrat = (configs ?? []).find((c) => c.leva === (leva ?? 1))?.tratamento_dias ?? null;

  const inducaoDe = (caixaId: string) =>
    procs.find((p) => p.tipo === "inducao" && (p.caixa_ids ?? []).includes(caixaId));
  const tratamentoDe = (caixaId: string) =>
    procs.find((p) => p.tipo === "tratamento" && (p.caixa_ids ?? []).includes(caixaId));

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div data-noprint className="mb-6 flex items-center justify-between gap-3 border-b border-rule pb-4">
        <Link href={`/bioterio/${id}`} className="text-sm text-ink-soft hover:text-signal">
          ← Voltar
        </Link>
        <span className="text-xs text-ink-soft">
          {caixas.length} etiquetas{leva ? ` · leva ${leva}` : ""} · confira a proporção antes de imprimir
        </span>
        <BotaoImprimir />
      </div>

      {caixas.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhuma caixa nesta leva.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-black">
          {caixas.map((c, i) => {
            const ind = inducaoDe(c.id);
            const trat = tratamentoDe(c.id);
            const pesoMedio = media((c.pesos ?? []).map(Number));
            // Para o tratamento (gavagem), quanto de extrato/água por animal —
            // as induções são pesadas rato a rato, então não vão na etiqueta.
            const mlTrat = trat
              ? doseMlPorAnimal(pesoMedio, trat.dose_valor, trat.dose_unidade, trat.concentracao)
              : null;
            return (
              <div key={c.id} className="flex break-inside-avoid flex-col border-2 border-black px-4 py-3" style={{ minHeight: "58mm" }}>
                <p className="text-center text-base font-bold uppercase leading-tight">
                  Grupo {nomeGrupo.get(c.grupo_id) ?? "?"}
                </p>
                <p className="mb-2 text-center text-sm">
                  caixa {numeros[i]} ( {c.num_ratos} {unidade} )
                </p>
                {ind && (
                  <div className="mb-2">
                    <p className="text-sm font-bold">INDUÇÃO</p>
                    <p className="text-sm leading-snug">- {linhaProc(ind)}</p>
                  </div>
                )}
                {trat && (
                  <div>
                    <p className="text-sm font-bold">TRATAMENTO{diasTrat ? ` (${diasTrat} DIAS)` : ""}</p>
                    <p className="text-sm leading-snug">- {linhaProc(trat, mlTrat)}</p>
                  </div>
                )}
                {!ind && !trat && <p className="text-sm text-neutral-500">Procedimento não definido.</p>}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
