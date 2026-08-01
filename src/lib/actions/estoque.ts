"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ehLocalizacao, type Localizacao, type TipoReagenteEstoque } from "@/lib/estoque";

// Cria ou atualiza um item do estoque (por nome — o estoque é do laboratório
// inteiro, uma linha por solução). Qualquer usuário logado mantém (RLS garante).
export async function salvarItemEstoque(dados: {
  nome: string;
  tipo: TipoReagenteEstoque;
  quantidadeMl: number | null;
  minimoMl: number | null;
  localizacao: string | null;
  obs: string | null;
}): Promise<{ erro: string } | { sucesso: true }> {
  const nome = dados.nome.trim();
  if (!nome) return { erro: "Informe o nome da solução." };
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
      tipo: dados.tipo,
      quantidade_ml: dados.quantidadeMl,
      minimo_ml: dados.minimoMl,
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

// Registra o consumo REAL de um reagente num teste e dá baixa no estoque da
// solução correspondente (casada pelo nome). Reeditar ajusta o estoque pela
// diferença (novo − antigo), então nunca abate duas vezes. Devolve um aviso se
// o estoque ficou abaixo do mínimo ou se não há essa solução cadastrada.
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
      estoqueBaixoMl: number | null; // restante em mL se ficou abaixo do mínimo
      semItemNoEstoque: boolean; // true = não há essa solução no estoque
    }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  // Consumo anterior gravado (para ajustar o estoque só pela diferença).
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

  // Baixa no estoque = diferença de volume real (em mL). Novo consumo maior
  // abate mais; menor devolve ao estoque.
  const novoUl = dados.volumeRealUl ?? 0;
  const deltaMl = (novoUl - antigoUl) / 1000;

  let estoqueBaixoMl: number | null = null;
  let semItemNoEstoque = false;

  if (deltaMl !== 0) {
    const { data: item } = await supabase
      .from("reagentes_estoque")
      .select("id, quantidade_ml, minimo_ml")
      .eq("nome", dados.reagenteNome)
      .maybeSingle();

    if (!item) {
      semItemNoEstoque = true;
    } else if (item.quantidade_ml != null) {
      const restante = (item.quantidade_ml as number) - deltaMl;
      const { error: errEstoque } = await supabase
        .from("reagentes_estoque")
        .update({
          quantidade_ml: restante,
          atualizado_por: user.id,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", item.id);
      if (errEstoque) {
        return { erro: "Consumo salvo, mas falhou ao baixar o estoque: " + errEstoque.message };
      }
      if (item.minimo_ml != null && restante < (item.minimo_ml as number)) {
        estoqueBaixoMl = restante;
      }
    }
  }

  revalidatePath(`/projetos/${dados.projetoId}/testes/${dados.projetoTesteId}`);
  revalidatePath("/estoque");
  return { sucesso: true, estoqueBaixoMl, semItemNoEstoque };
}
