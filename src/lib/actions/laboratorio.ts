"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Inicia uma sessão de laboratório "ao vivo" (fim null = em andamento). Impede
// duas sessões abertas ao mesmo tempo.
export async function iniciarSessao(): Promise<
  { erro: string } | { sucesso: true }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const { data: aberta } = await supabase
    .from("sessoes_lab")
    .select("id")
    .eq("profile_id", user.id)
    .is("fim", null)
    .maybeSingle();
  if (aberta) {
    return { erro: "Você já tem uma sessão em andamento. Encerre-a antes de iniciar outra." };
  }

  const { error } = await supabase.from("sessoes_lab").insert({
    profile_id: user.id,
    inicio: new Date().toISOString(),
  });
  if (error) return { erro: "Não foi possível iniciar a sessão: " + error.message };

  revalidatePath("/laboratorio");
  return { sucesso: true };
}

// Encerra a sessão aberta: grava o fim (agora), os tópicos do que foi feito e a
// descrição livre.
export async function encerrarSessao(dados: {
  id: string;
  topicos: string[];
  descricao: string | null;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessoes_lab")
    .update({
      fim: new Date().toISOString(),
      topicos: dados.topicos,
      descricao: dados.descricao?.trim() || null,
    })
    .eq("id", dados.id);
  if (error) return { erro: "Não foi possível encerrar a sessão: " + error.message };

  revalidatePath("/laboratorio");
  return { sucesso: true };
}

// Registra uma sessão passada (não ao vivo): informa início e fim, tópicos e
// descrição. Datas em ISO (do input datetime-local convertido).
export async function registrarSessaoRetroativa(dados: {
  inicioISO: string;
  fimISO: string;
  topicos: string[];
  descricao: string | null;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const ini = new Date(dados.inicioISO).getTime();
  const fim = new Date(dados.fimISO).getTime();
  if (Number.isNaN(ini) || Number.isNaN(fim)) {
    return { erro: "Informe o dia e os horários de início e fim." };
  }
  if (fim <= ini) {
    return { erro: "O horário de fim tem que ser depois do início." };
  }

  const { error } = await supabase.from("sessoes_lab").insert({
    profile_id: user.id,
    inicio: new Date(ini).toISOString(),
    fim: new Date(fim).toISOString(),
    topicos: dados.topicos,
    descricao: dados.descricao?.trim() || null,
  });
  if (error) return { erro: "Não foi possível registrar a sessão: " + error.message };

  revalidatePath("/laboratorio");
  return { sucesso: true };
}

export async function removerSessao(
  id: string
): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const { error } = await supabase.from("sessoes_lab").delete().eq("id", id);
  if (error) return { erro: "Não foi possível remover: " + error.message };
  revalidatePath("/laboratorio");
  return { sucesso: true };
}
