"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function salvarResultado(dados: {
  projetoId: string;
  projetoTesteId: string;
  rato: string;
  grupoId: string;
  leituras: Record<string, unknown>;
  valorCalculado: number | null;
  dentroDoPadrao: boolean | null;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Você precisa estar logado." };
  }

  const { error } = await supabase.from("resultados_teste").upsert(
    {
      projeto_teste_id: dados.projetoTesteId,
      rato: dados.rato,
      grupo_id: dados.grupoId,
      leituras: dados.leituras,
      valor_calculado: dados.valorCalculado,
      dentro_do_padrao: dados.dentroDoPadrao,
      registrado_por: user.id,
    },
    { onConflict: "projeto_teste_id,rato" }
  );

  if (error) {
    return { erro: "Não foi possível salvar: " + error.message };
  }

  revalidatePath(`/projetos/${dados.projetoId}/testes/${dados.projetoTesteId}`);
  return { sucesso: true };
}

export type LinhaResultado = {
  rato: string;
  grupoId: string;
  leituras: Record<string, unknown>;
  valorCalculado: number | null;
  dentroDoPadrao: boolean | null;
  observacoes: string | null;
};

// Salva a tabela inteira de uma vez. Se "confirmar" for true, marca as
// linhas como confirmadas (travando a edição do valor). Linhas já
// confirmadas no banco têm apenas as observações atualizadas — o valor e o
// rato ficam intocados (garantido também por trigger no banco).
export async function salvarResultadosLote(dados: {
  projetoId: string;
  projetoTesteId: string;
  linhas: LinhaResultado[];
  confirmar?: boolean;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Você precisa estar logado." };
  }

  if (dados.linhas.length === 0) {
    return { sucesso: true };
  }

  // Descobre quais ratos já estão confirmados (não podem ter valor alterado).
  const { data: existentes } = await supabase
    .from("resultados_teste")
    .select("rato, confirmado")
    .eq("projeto_teste_id", dados.projetoTesteId);
  const confirmados = new Set(
    (existentes ?? []).filter((e) => e.confirmado).map((e) => e.rato)
  );

  const paraUpsert = dados.linhas
    .filter((l) => !confirmados.has(l.rato))
    .map((l) => ({
      projeto_teste_id: dados.projetoTesteId,
      rato: l.rato,
      grupo_id: l.grupoId,
      leituras: l.leituras,
      valor_calculado: l.valorCalculado,
      dentro_do_padrao: l.dentroDoPadrao,
      observacoes: l.observacoes,
      confirmado: dados.confirmar ?? false,
      registrado_por: user.id,
    }));

  if (paraUpsert.length > 0) {
    const { error } = await supabase
      .from("resultados_teste")
      .upsert(paraUpsert, { onConflict: "projeto_teste_id,rato" });
    if (error) {
      return { erro: "Não foi possível salvar: " + error.message };
    }
  }

  // Para os já confirmados, atualiza só as observações.
  for (const l of dados.linhas.filter((l) => confirmados.has(l.rato))) {
    const { error } = await supabase
      .from("resultados_teste")
      .update({ observacoes: l.observacoes })
      .eq("projeto_teste_id", dados.projetoTesteId)
      .eq("rato", l.rato);
    if (error) {
      return { erro: "Não foi possível salvar observação: " + error.message };
    }
  }

  revalidatePath(`/projetos/${dados.projetoId}/testes/${dados.projetoTesteId}`);
  return { sucesso: true };
}

export async function definirStatusTeste(
  projetoId: string,
  projetoTesteId: string,
  status: "pendente" | "concluido"
): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("projeto_testes")
    .update({ status })
    .eq("id", projetoTesteId);

  if (error) {
    return { erro: "Não foi possível atualizar o status: " + error.message };
  }

  revalidatePath(`/projetos/${projetoId}/testes/${projetoTesteId}`);
  revalidatePath(`/projetos/${projetoId}`);
  return { sucesso: true };
}
