"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Cria uma ou mais caixas de uma vez, numeradas em sequência a partir da última
// existente. Cada caixa tem grupo + nº de animais.
export async function criarCaixas(dados: {
  projetoId: string;
  caixas: { grupoId: string; numRatos: number }[];
}): Promise<{ erro: string } | { sucesso: true }> {
  const caixas = dados.caixas.filter((c) => c.grupoId && c.numRatos > 0);
  if (caixas.length === 0) return { erro: "Adicione ao menos uma caixa com grupo e nº de ratos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const { data: ultima } = await supabase
    .from("bioterio_caixas")
    .select("numero")
    .eq("projeto_id", dados.projetoId)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  let proximo = ((ultima?.numero as number | null) ?? 0) + 1;

  const linhas = caixas.map((c) => ({
    projeto_id: dados.projetoId,
    numero: proximo++,
    grupo_id: c.grupoId,
    num_ratos: c.numRatos,
    criado_por: user.id,
  }));

  const { error } = await supabase.from("bioterio_caixas").insert(linhas);
  if (error) return { erro: "Não foi possível criar as caixas: " + error.message };

  revalidatePath(`/bioterio/${dados.projetoId}`);
  return { sucesso: true };
}

export async function atualizarCaixa(dados: {
  projetoId: string;
  id: string;
  grupoId: string;
  numRatos: number;
  pesoMedioG: number | null;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bioterio_caixas")
    .update({
      grupo_id: dados.grupoId,
      num_ratos: dados.numRatos,
      peso_medio_g: dados.pesoMedioG,
    })
    .eq("id", dados.id);
  if (error) return { erro: "Não foi possível salvar a caixa: " + error.message };
  revalidatePath(`/bioterio/${dados.projetoId}`);
  return { sucesso: true };
}

export async function removerCaixa(dados: {
  projetoId: string;
  id: string;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const { error } = await supabase.from("bioterio_caixas").delete().eq("id", dados.id);
  if (error) return { erro: "Não foi possível remover: " + error.message };
  revalidatePath(`/bioterio/${dados.projetoId}`);
  return { sucesso: true };
}

// Registra a sobrevivência: quantos animais da caixa morreram (linkado, depois,
// à etapa de sobrevivência do sacrifício).
export async function registrarMortesCaixa(dados: {
  projetoId: string;
  id: string;
  mortos: number;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bioterio_caixas")
    .update({ mortos: Math.max(0, dados.mortos) })
    .eq("id", dados.id);
  if (error) return { erro: "Não foi possível registrar: " + error.message };
  revalidatePath(`/bioterio/${dados.projetoId}`);
  return { sucesso: true };
}

// Salva o tratamento de um grupo (indução + tratamento). Upsert por (projeto, grupo).
export async function salvarTratamento(dados: {
  projetoId: string;
  grupoId: string;
  inducaoAtiva: boolean;
  inducaoDoenca: string | null;
  inducaoSubstancia: string | null;
  inducaoVia: string | null;
  inducaoDose: string | null;
  tratamentoAtiva: boolean;
  tratamentoSubstancia: string | null;
  tratamentoVia: string | null;
  tratamentoDose: string | null;
  tratamentoDias: number | null;
  tratamentoInicio: string | null;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const { error } = await supabase.from("bioterio_tratamentos").upsert(
    {
      projeto_id: dados.projetoId,
      grupo_id: dados.grupoId,
      inducao_ativa: dados.inducaoAtiva,
      inducao_doenca: dados.inducaoDoenca,
      inducao_substancia: dados.inducaoSubstancia?.trim() || null,
      inducao_via: dados.inducaoVia,
      inducao_dose: dados.inducaoDose?.trim() || null,
      tratamento_ativa: dados.tratamentoAtiva,
      tratamento_substancia: dados.tratamentoSubstancia?.trim() || null,
      tratamento_via: dados.tratamentoVia,
      tratamento_dose: dados.tratamentoDose?.trim() || null,
      tratamento_dias: dados.tratamentoDias,
      tratamento_inicio: dados.tratamentoInicio || null,
      atualizado_por: user.id,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "projeto_id,grupo_id" }
  );
  if (error) return { erro: "Não foi possível salvar o tratamento: " + error.message };

  revalidatePath(`/bioterio/${dados.projetoId}`);
  return { sucesso: true };
}
