"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ehCategoria,
  ehLocalizacao,
  ehUnidade,
  ulParaUnidade,
  type Categoria,
  type Localizacao,
  type Unidade,
} from "@/lib/estoque";

// Cria ou atualiza um item do estoque (por nome — o estoque é do laboratório
// inteiro, uma linha por item). Qualquer usuário logado mantém (RLS garante).
export async function salvarItemEstoque(dados: {
  nome: string;
  categoria: string;
  quantidade: number | null;
  unidade: string;
  minimo: number | null;
  localizacao: string | null;
  obs: string | null;
}): Promise<{ erro: string } | { sucesso: true }> {
  const nome = dados.nome.trim();
  if (!nome) return { erro: "Informe o nome do item." };
  const categoria: Categoria = ehCategoria(dados.categoria) ? dados.categoria : "solucao";
  const unidade: Unidade = ehUnidade(dados.unidade) ? dados.unidade : "un";
  const localizacao: Localizacao | null = ehLocalizacao(dados.localizacao)
    ? dados.localizacao
    : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const { error } = await supabase.from("reagentes_estoque").upsert(
    {
      nome,
      categoria,
      quantidade: dados.quantidade,
      unidade,
      minimo: dados.minimo,
      localizacao,
      obs: dados.obs?.trim() || null,
      atualizado_por: user.id,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "nome" }
  );
  if (error) {
    return { erro: "Não foi possível salvar no estoque: " + error.message };
  }

  revalidatePath("/estoque");
  return { sucesso: true };
}

export async function removerItemEstoque(
  id: string
): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const { error } = await supabase.from("reagentes_estoque").delete().eq("id", id);
  if (error) return { erro: "Não foi possível remover: " + error.message };
  revalidatePath("/estoque");
  return { sucesso: true };
}

// Registra o consumo REAL de um reagente num teste e dá baixa no estoque do item
// correspondente (casado pelo nome). Reeditar ajusta pela diferença (novo −
// antigo), então nunca abate duas vezes. Só abate itens de unidade de volume
// (mL/L). Devolve aviso se ficou abaixo do mínimo ou se não há esse item.
export async function registrarConsumoReal(dados: {
  projetoId: string;
  projetoTesteId: string;
  reagenteNome: string;
  volumeEstimadoUl: number | null;
  volumeRealUl: number | null;
}): Promise<
  | { erro: string }
  | {
      sucesso: true;
      estoqueBaixo: { quantidade: number; unidade: string } | null;
      semItemNoEstoque: boolean;
    }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const { data: anterior } = await supabase
    .from("consumo_real")
    .select("volume_real_ul")
    .eq("projeto_teste_id", dados.projetoTesteId)
    .eq("reagente_nome", dados.reagenteNome)
    .maybeSingle();
  const antigoUl = (anterior?.volume_real_ul as number | null) ?? 0;

  const { error: errConsumo } = await supabase.from("consumo_real").upsert(
    {
      projeto_teste_id: dados.projetoTesteId,
      reagente_nome: dados.reagenteNome,
      volume_estimado_ul: dados.volumeEstimadoUl,
      volume_real_ul: dados.volumeRealUl,
      registrado_por: user.id,
      registrado_em: new Date().toISOString(),
    },
    { onConflict: "projeto_teste_id,reagente_nome" }
  );
  if (errConsumo) {
    return { erro: "Não foi possível registrar o consumo: " + errConsumo.message };
  }

  const novoUl = dados.volumeRealUl ?? 0;
  const deltaUl = novoUl - antigoUl;

  let estoqueBaixo: { quantidade: number; unidade: string } | null = null;
  let semItemNoEstoque = false;

  if (deltaUl !== 0) {
    const { data: item } = await supabase
      .from("reagentes_estoque")
      .select("id, quantidade, unidade, minimo")
      .eq("nome", dados.reagenteNome)
      .maybeSingle();

    if (!item) {
      semItemNoEstoque = true;
    } else if (item.quantidade != null) {
      const deltaNaUnidade = ulParaUnidade(deltaUl, item.unidade as string);
      // Só abate se o item é medido em volume (mL/L).
      if (deltaNaUnidade != null) {
        const restante = (item.quantidade as number) - deltaNaUnidade;
        const { error: errEstoque } = await supabase
          .from("reagentes_estoque")
          .update({
            quantidade: restante,
            atualizado_por: user.id,
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", item.id);
        if (errEstoque) {
          return { erro: "Consumo salvo, mas falhou ao baixar o estoque: " + errEstoque.message };
        }
        if (item.minimo != null && restante < (item.minimo as number)) {
          estoqueBaixo = { quantidade: restante, unidade: (item.unidade as string) || "" };
        }
      }
    }
  }

  revalidatePath(`/projetos/${dados.projetoId}/testes/${dados.projetoTesteId}`);
  revalidatePath("/estoque");
  return { sucesso: true, estoqueBaixo, semItemNoEstoque };
}
