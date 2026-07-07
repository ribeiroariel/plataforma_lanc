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

  revalidatePath(`/bolsista/projetos/${dados.projetoId}/testes/${dados.projetoTesteId}`);
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

  revalidatePath(`/bolsista/projetos/${projetoId}/testes/${projetoTesteId}`);
  revalidatePath(`/bolsista/projetos/${projetoId}`);
  return { sucesso: true };
}
