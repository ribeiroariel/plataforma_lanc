import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import {
  siglaVia,
  textoDose,
  numeracaoCaixas,
  UNIDADES_DOSE,
  type CaixaRow,
  type ProcedimentoRow,
} from "@/lib/bioterio";
import BotaoImprimir from "./BotaoImprimir";

type Projeto = { id: string; nome: string; especie: string | null };
type Grupo = { id: string; nome: string };

function unidadeAnimal(especie: string | null): string {
  if (especie === "camundongo") return "camundongos";
  if (especie === "rato") return "ratos";
  return "animais";
}

function linhaProc(p: ProcedimentoRow): string {
  const partes: string[] = [];
  if (p.substancia) partes.push(p.substancia);
  const dose = textoDose(p.dose_valor, p.dose_unidade);
  if (dose) partes.push(`— ${dose}`);
  if (p.via) partes.push(`(${siglaVia(p.via)})`);
  return partes.join(" ") || "—";
}

// Só mg/kg e mL/kg dependem do peso do animal para virar um volume — por
// isso só nesses casos a etiqueta ganha a linha em branco: o volume real
// (mg/kg × peso ÷ concentração, ou mL/kg × peso) só é calculável no dia da
// indução, depois de pesar, quando as etiquetas já estarão impressas.
// mL/animal é um volume fixo, já mostrado por linhaProc — não precisa de
// espaço para preencher à caneta.
function precisaPesarParaMl(p: ProcedimentoRow): boolean {
  if (p.dose_valor == null) return false;
  return UNIDADES_DOSE.find((u) => u.valor === p.dose_unidade)?.usaPeso ?? false;
}

function BlocoProcedimento({
  titulo,
  proc,
}: {
  titulo: string;
  proc: ProcedimentoRow;
}) {
  return (
    <div>
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
        {titulo}
      </p>
      <p className="text-[13px] leading-snug text-neutral-900">
        {linhaProc(proc)}
      </p>
      {precisaPesarParaMl(proc) && (
        <p className="mt-1 flex items-baseline gap-1.5 text-[12px] text-neutral-700">
          <span className="shrink-0">Dose do dia:</span>
          <span
            className="inline-block flex-1 border-b border-dotted border-neutral-400"
            style={{ minWidth: "2.5rem" }}
          />
          <span className="shrink-0 font-mono">mL</span>
        </p>
      )}
    </div>
  );
}

export default async function PaginaEtiquetas({
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
        .select("id, grupo_id, num_ratos, ordem, pesos, mortos")
        .eq("projeto_id", id)
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
  const unidade = unidadeAnimal(projeto.especie);
  const numeros = numeracaoCaixas(caixas ?? []);
  const procs = procedimentos ?? [];

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
          {caixas?.length ?? 0} etiquetas · confira a proporção antes de imprimir no etiquetador
        </span>
        <BotaoImprimir />
      </div>

      {(caixas ?? []).length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhuma caixa criada ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 font-display">
          {(caixas ?? []).map((c, i) => {
            const ind = inducaoDe(c.id);
            const trat = tratamentoDe(c.id);
            return (
              <div
                key={c.id}
                className="flex break-inside-avoid flex-col justify-between border-2 border-neutral-800 px-4 py-3"
                style={{ minHeight: "58mm" }}
              >
                <div>
                  <p className="text-center text-base font-semibold uppercase leading-tight text-neutral-900">
                    Grupo {nomeGrupo.get(c.grupo_id) ?? "?"}
                  </p>
                  <p className="mt-0.5 text-center font-mono text-[10px] uppercase tracking-wide text-neutral-600">
                    Caixa {numeros[i]} · {c.num_ratos} {unidade}
                  </p>

                  {(ind || trat) && (
                    <div className="mt-2 flex flex-col gap-2 border-t border-neutral-300 pt-2">
                      {ind && <BlocoProcedimento titulo="Indução" proc={ind} />}
                      {trat && (
                        <BlocoProcedimento
                          titulo={`Tratamento${trat.dias ? ` · ${trat.dias} dias` : ""}`}
                          proc={trat}
                        />
                      )}
                    </div>
                  )}
                  {!ind && !trat && (
                    <p className="mt-3 text-center text-xs italic text-neutral-500">
                      Procedimento não definido.
                    </p>
                  )}
                </div>

                <p className="mt-2 border-t border-neutral-300 pt-1 text-center font-mono text-[7px] uppercase tracking-[0.14em] text-neutral-400">
                  LANC · FURB
                </p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
