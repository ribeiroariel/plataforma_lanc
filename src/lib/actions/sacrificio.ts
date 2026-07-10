"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Cria o sacrifício de uma leva (RLS garante que só coautor do projeto insere).
export async function criarSacrificio(dados: {
  projetoId: string;
  leva: number | null;
  data: string | null;
  duracaoMin: number | null;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const { error } = await supabase.from("sacrificios").insert({
    projeto_id: dados.projetoId,
    leva: dados.leva,
    data: dados.data || null,
    duracao_estimada_min: dados.duracaoMin,
    criado_por: user.id,
  });
  if (error) {
    return { erro: "Não foi possível criar o sacrifício: " + error.message };
  }

  revalidatePath(`/projetos/${dados.projetoId}/sacrificio`);
  return { sucesso: true };
}

// Designa uma pessoa a uma função do dia.
export async function designarFuncao(dados: {
  projetoId: string;
  sacrificioId: string;
  funcao: string;
  profileId: string;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();

  const { error } = await supabase.from("sacrificio_funcoes").insert({
    sacrificio_id: dados.sacrificioId,
    funcao: dados.funcao,
    profile_id: dados.profileId,
  });
  if (error) {
    // Chave única (mesma pessoa já está nessa função) cai aqui.
    return { erro: "Não foi possível designar: " + error.message };
  }

  revalidatePath(`/projetos/${dados.projetoId}/sacrificio`);
  return { sucesso: true };
}

export async function removerFuncao(dados: {
  projetoId: string;
  funcaoId: string;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sacrificio_funcoes")
    .delete()
    .eq("id", dados.funcaoId);
  if (error) {
    return { erro: "Não foi possível remover: " + error.message };
  }

  revalidatePath(`/projetos/${dados.projetoId}/sacrificio`);
  return { sucesso: true };
}

// --- Fatia 2: sobrevivência + contagem ao vivo ---

// Semeia/atualiza a lista de ratos do sacrifício com quem sobreviveu. O upsert
// só toca sobreviveu/motivo/grupo — caixa/ordem/status (da contagem) ficam.
export async function salvarSobrevivencia(dados: {
  projetoId: string;
  sacrificioId: string;
  linhas: {
    rato: string;
    grupoId: string;
    sobreviveu: boolean;
    motivo: string | null;
  }[];
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  if (dados.linhas.length === 0) return { sucesso: true };

  const excluidoSemMotivo = dados.linhas.find(
    (l) => !l.sobreviveu && !(l.motivo && l.motivo.trim())
  );
  if (excluidoSemMotivo) {
    return {
      erro: `Rato ${excluidoSemMotivo.rato}: informe a justificativa da exclusão.`,
    };
  }

  const paraUpsert = dados.linhas.map((l) => ({
    sacrificio_id: dados.sacrificioId,
    rato: l.rato,
    grupo_id: l.grupoId,
    sobreviveu: l.sobreviveu,
    exclusao_motivo: l.sobreviveu ? null : (l.motivo?.trim() ?? null),
  }));

  const { error } = await supabase
    .from("sacrificio_ratos")
    .upsert(paraUpsert, { onConflict: "sacrificio_id,rato" });
  if (error) {
    return { erro: "Não foi possível salvar a sobrevivência: " + error.message };
  }

  revalidatePath(`/projetos/${dados.projetoId}/sacrificio/${dados.sacrificioId}`);
  return { sucesso: true };
}

// Marca um rato como dissecado, gravando a caixa (digitada ao vivo). A ordem
// na sequência é calculada no servidor (max + 1) para não haver corrida quando
// marcam vários rápido.
export async function marcarDissecado(dados: {
  projetoId: string;
  sacrificioId: string;
  sacrificioRatoId: string;
  caixa: string | null;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();

  const { data: maxRow } = await supabase
    .from("sacrificio_ratos")
    .select("ordem")
    .eq("sacrificio_id", dados.sacrificioId)
    .not("ordem", "is", null)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const proximaOrdem = ((maxRow?.ordem as number | null) ?? 0) + 1;

  const { error } = await supabase
    .from("sacrificio_ratos")
    .update({
      caixa: dados.caixa?.trim() || null,
      ordem: proximaOrdem,
      status: "dissecado",
    })
    .eq("id", dados.sacrificioRatoId);
  if (error) {
    return { erro: "Não foi possível registrar: " + error.message };
  }

  revalidatePath(`/projetos/${dados.projetoId}/sacrificio/${dados.sacrificioId}`);
  return { sucesso: true };
}

// Desfaz o "dissecado" (volta para pendente) — corrige um clique errado.
export async function reabrirRato(dados: {
  projetoId: string;
  sacrificioId: string;
  sacrificioRatoId: string;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sacrificio_ratos")
    .update({ status: "pendente" })
    .eq("id", dados.sacrificioRatoId);
  if (error) {
    return { erro: "Não foi possível reabrir: " + error.message };
  }

  revalidatePath(`/projetos/${dados.projetoId}/sacrificio/${dados.sacrificioId}`);
  return { sucesso: true };
}
