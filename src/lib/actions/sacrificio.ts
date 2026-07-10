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
