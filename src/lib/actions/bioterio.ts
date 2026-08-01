"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Cria uma ou mais caixas em sequência, no fim da ordem atual.
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
    .select("ordem, numero")
    .eq("projeto_id", dados.projetoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  let ordem = ((ultima?.ordem as number | null) ?? (ultima?.numero as number | null) ?? 0) + 1;

  const linhas = caixas.map((c) => ({
    projeto_id: dados.projetoId,
    numero: ordem, // legado; a exibição usa a ordem
    ordem: ordem++,
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
  pesos: number[];
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const pesos = dados.pesos.filter((p) => Number.isFinite(p) && p > 0);
  const media = pesos.length ? pesos.reduce((a, c) => a + c, 0) / pesos.length : null;
  const { error } = await supabase
    .from("bioterio_caixas")
    .update({
      grupo_id: dados.grupoId,
      num_ratos: dados.numRatos,
      pesos,
      peso_medio_g: media,
    })
    .eq("id", dados.id);
  if (error) return { erro: "Não foi possível salvar a caixa: " + error.message };
  revalidatePath(`/bioterio/${dados.projetoId}`);
  return { sucesso: true };
}

// Reordena as caixas (arrastar): grava a nova ordem de cada id.
export async function reordenarCaixas(dados: {
  projetoId: string;
  idsOrdenados: string[];
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  for (let i = 0; i < dados.idsOrdenados.length; i++) {
    const { error } = await supabase
      .from("bioterio_caixas")
      .update({ ordem: i + 1, numero: i + 1 })
      .eq("id", dados.idsOrdenados[i]);
    if (error) return { erro: "Não foi possível reordenar: " + error.message };
  }
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

// Cria ou atualiza um procedimento (indução ou tratamento) e as caixas que o
// recebem. Se `id` vier, atualiza; senão cria.
export async function salvarProcedimento(dados: {
  projetoId: string;
  id?: string;
  tipo: "inducao" | "tratamento";
  doenca: string | null;
  substancia: string | null;
  doseValor: number | null;
  doseUnidade: string | null;
  concentracao: number | null;
  via: string | null;
  dias: number | null;
  inicio: string | null;
  caixaIds: string[];
}): Promise<{ erro: string } | { sucesso: true }> {
  if (dados.caixaIds.length === 0) {
    return { erro: "Selecione ao menos uma caixa para este procedimento." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const linha = {
    projeto_id: dados.projetoId,
    tipo: dados.tipo,
    doenca: dados.doenca,
    substancia: dados.substancia?.trim() || null,
    dose_valor: dados.doseValor,
    dose_unidade: dados.doseUnidade,
    concentracao: dados.concentracao,
    via: dados.via,
    dias: dados.dias,
    inicio: dados.inicio || null,
    caixa_ids: dados.caixaIds,
    atualizado_por: user.id,
    atualizado_em: new Date().toISOString(),
  };

  const { error } = dados.id
    ? await supabase.from("bioterio_procedimentos").update(linha).eq("id", dados.id)
    : await supabase.from("bioterio_procedimentos").insert(linha);
  if (error) return { erro: "Não foi possível salvar o procedimento: " + error.message };

  revalidatePath(`/bioterio/${dados.projetoId}`);
  return { sucesso: true };
}

export async function removerProcedimento(dados: {
  projetoId: string;
  id: string;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const { error } = await supabase.from("bioterio_procedimentos").delete().eq("id", dados.id);
  if (error) return { erro: "Não foi possível remover: " + error.message };
  revalidatePath(`/bioterio/${dados.projetoId}`);
  return { sucesso: true };
}
