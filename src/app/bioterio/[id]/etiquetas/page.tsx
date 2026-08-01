import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { siglaVia, type CaixaRow, type TratamentoRow } from "@/lib/bioterio";
import BotaoImprimir from "./BotaoImprimir";

type Projeto = { id: string; nome: string; especie: string | null };
type Grupo = { id: string; nome: string };

function unidadeAnimal(especie: string | null): string {
  if (especie === "camundongo") return "camundongos";
  if (especie === "rato") return "ratos";
  return "animais";
}

function linhaProcedimento(
  substancia: string | null,
  dose: string | null,
  via: string | null
): string {
  const partes: string[] = [];
  if (substancia) partes.push(substancia);
  if (dose) partes.push(`— ${dose}`);
  if (via) partes.push(`(${siglaVia(via)})`);
  return partes.join(" ") || "—";
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

  const [{ data: projeto }, { data: grupos }, { data: membros }, { data: caixas }, { data: tratamentos }] =
    await Promise.all([
      supabase.from("projetos").select("id, nome, especie").eq("id", id).maybeSingle().returns<Projeto>(),
      supabase.from("projeto_grupos").select("id, nome").eq("projeto_id", id).returns<Grupo[]>(),
      supabase.from("projeto_membros").select("profile_id").eq("projeto_id", id),
      supabase
        .from("bioterio_caixas")
        .select("id, numero, grupo_id, num_ratos, peso_medio_g, mortos")
        .eq("projeto_id", id)
        .order("numero", { ascending: true })
        .returns<CaixaRow[]>(),
      supabase
        .from("bioterio_tratamentos")
        .select(
          "id, grupo_id, inducao_ativa, inducao_doenca, inducao_substancia, inducao_via, inducao_dose, tratamento_ativa, tratamento_substancia, tratamento_via, tratamento_dose, tratamento_dias, tratamento_inicio"
        )
        .eq("projeto_id", id)
        .returns<TratamentoRow[]>(),
    ]);

  if (!projeto) notFound();
  const souMembro = membros?.some((m) => m.profile_id === usuario.id) ?? false;
  if (!souMembro && usuario.papel !== "orientador") notFound();

  const nomeGrupo = new Map((grupos ?? []).map((g) => [g.id, g.nome]));
  const tratPorGrupo = new Map((tratamentos ?? []).map((t) => [t.grupo_id, t]));
  const unidade = unidadeAnimal(projeto.especie);

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
        <div className="grid grid-cols-2 gap-3 text-black">
          {(caixas ?? []).map((c) => {
            const t = tratPorGrupo.get(c.grupo_id);
            return (
              <div
                key={c.id}
                className="flex break-inside-avoid flex-col border-2 border-black px-4 py-3"
                style={{ minHeight: "58mm" }}
              >
                <p className="text-center text-base font-bold uppercase leading-tight">
                  Grupo {nomeGrupo.get(c.grupo_id) ?? "?"}
                </p>
                <p className="mb-2 text-center text-sm">
                  caixa {c.numero} ( {c.num_ratos} {unidade} )
                </p>
                {t?.inducao_ativa && (
                  <div className="mb-2">
                    <p className="text-sm font-bold">TRATAMENTO 1 (indução)</p>
                    <p className="text-sm leading-snug">
                      - {linhaProcedimento(t.inducao_substancia, t.inducao_dose, t.inducao_via)}
                    </p>
                  </div>
                )}
                {t?.tratamento_ativa && (
                  <div>
                    <p className="text-sm font-bold">
                      TRATAMENTO 2 ({t.tratamento_dias ?? "?"} DIAS)
                    </p>
                    <p className="text-sm leading-snug">
                      - {linhaProcedimento(t.tratamento_substancia, t.tratamento_dose, t.tratamento_via)}
                    </p>
                  </div>
                )}
                {!t?.inducao_ativa && !t?.tratamento_ativa && (
                  <p className="text-sm text-neutral-500">Tratamento não definido.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
