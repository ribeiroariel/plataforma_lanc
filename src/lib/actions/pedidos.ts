"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Bolsista abre um pedido (falta algo / precisa de algo). Vai para a aba Pedidos
// do Ariel e da orientadora.
export async function criarPedido(dados: {
  item: string;
  quantidade: string | null;
  categoria: string | null;
  motivo: string | null;
  obs: string | null;
}): Promise<{ erro: string } | { sucesso: true }> {
  const item = dados.item.trim();
  if (!item) return { erro: "Diga o que está faltando (produto/item)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const { error } = await supabase.from("pedidos").insert({
    item,
    quantidade: dados.quantidade?.trim() || null,
    categoria: dados.categoria || null,
    motivo: dados.motivo?.trim() || null,
    obs: dados.obs?.trim() || null,
    solicitado_por: user.id,
  });
  if (error) return { erro: "Não foi possível registrar o pedido: " + error.message };

  revalidatePath("/estoque");
  revalidatePath("/pedidos");
  return { sucesso: true };
}

// Marca um pedido como atendido (ou reabre). Só gestor (orientadora / quem
// aprova cadastros) — a policy de update garante.
export async function definirStatusPedido(
  id: string,
  atendido: boolean
): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("pedidos")
    .update({
      status: atendido ? "atendido" : "aberto",
      atendido_por: atendido ? user?.id ?? null : null,
      atendido_em: atendido ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { erro: "Não foi possível atualizar o pedido: " + error.message };

  revalidatePath("/pedidos");
  return { sucesso: true };
}

export async function removerPedido(
  id: string
): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const { error } = await supabase.from("pedidos").delete().eq("id", id);
  if (error) return { erro: "Não foi possível remover: " + error.message };
  revalidatePath("/pedidos");
  return { sucesso: true };
}
