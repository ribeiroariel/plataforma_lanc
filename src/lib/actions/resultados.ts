"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ehAparelho,
  ehRecipiente,
  RECIPIENTES_POR_APARELHO,
  type Aparelho,
  type Recipiente,
} from "@/lib/recipientes";

// Preparação do teste, escolhida antes de começar: aparelho de leitura e
// recipiente. O recipiente tem um fator de volume que escala as calculadoras de
// reagente do dia, e o aparelho vira o "Instrument" da planilha de
// transparência. Editável pelo responsável ou coautor (a policy de update de
// projeto_testes garante). Ambos podem ser limpos (null) para recomeçar.
export async function salvarPreparacaoTeste(dados: {
  projetoId: string;
  projetoTesteId: string;
  aparelho: string | null;
  recipiente: string | null;
}): Promise<{ erro: string } | { sucesso: true }> {
  const aparelho: Aparelho | null = ehAparelho(dados.aparelho)
    ? dados.aparelho
    : null;
  const recipiente: Recipiente | null = ehRecipiente(dados.recipiente)
    ? dados.recipiente
    : null;

  // Coerência aparelho × recipiente: o recipiente precisa ser compatível com o
  // aparelho escolhido (senão o fator/leitura não fazem sentido).
  if (
    aparelho &&
    recipiente &&
    !RECIPIENTES_POR_APARELHO[aparelho].includes(recipiente)
  ) {
    return { erro: "Esse recipiente não é compatível com o aparelho escolhido." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("projeto_testes")
    .update({ aparelho, recipiente })
    .eq("id", dados.projetoTesteId);

  if (error) {
    return { erro: "Não foi possível salvar a preparação: " + error.message };
  }

  revalidatePath(`/projetos/${dados.projetoId}/testes/${dados.projetoTesteId}`);
  return { sucesso: true };
}

// Metadados da leitura de um teste designado (horário de início/fim da leitura
// no equipamento). Usados na planilha de transparência dos dados brutos. O
// aparelho não entra aqui — vem da preparação estruturada (salvarPreparacaoTeste).
// Editável pelo responsável ou coautor. Não trava — pode corrigir depois.
export async function salvarMetadadosLeitura(dados: {
  projetoId: string;
  projetoTesteId: string;
  inicio: string | null;
  fim: string | null;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("projeto_testes")
    .update({
      leitura_inicio: dados.inicio || null,
      leitura_fim: dados.fim || null,
    })
    .eq("id", dados.projetoTesteId);

  if (error) {
    return { erro: "Não foi possível salvar os metadados: " + error.message };
  }

  revalidatePath(`/projetos/${dados.projetoId}/testes/${dados.projetoTesteId}`);
  return { sucesso: true };
}

// Considerações gerais do teste (texto livre sobre como foi o ensaio). Editável
// por responsável/coautor; trava depois do encerramento (trigger no banco).
export async function salvarConsideracoesTeste(dados: {
  projetoId: string;
  projetoTesteId: string;
  consideracoes: string;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projeto_testes")
    .update({ consideracoes: dados.consideracoes.trim() || null })
    .eq("id", dados.projetoTesteId);
  if (error) {
    return { erro: "Não foi possível salvar as considerações: " + error.message };
  }
  revalidatePath(`/projetos/${dados.projetoId}/testes/${dados.projetoTesteId}`);
  return { sucesso: true };
}

// Marca (ou desmarca) um passo do checklist do procedimento. Grava quem e quando
// confirmou. Compartilhado por quem executa o teste (responsável + ajudantes) e
// coautor — a policy de projeto_teste_passos garante. Reversível (desmarcar).
export async function marcarPasso(dados: {
  projetoId: string;
  projetoTesteId: string;
  passoId: string;
  feito: boolean;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const { error } = await supabase.from("projeto_teste_passos").upsert(
    {
      projeto_teste_id: dados.projetoTesteId,
      passo_id: dados.passoId,
      feito: dados.feito,
      feito_por: dados.feito ? user.id : null,
      feito_em: dados.feito ? new Date().toISOString() : null,
    },
    { onConflict: "projeto_teste_id,passo_id" }
  );
  if (error) {
    return { erro: "Não foi possível salvar o passo: " + error.message };
  }

  revalidatePath(`/projetos/${dados.projetoId}/testes/${dados.projetoTesteId}`);
  return { sucesso: true };
}

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

// Confirma UMA célula (uma leitura) de um rato. Só o que é confirmado fica
// salvo em `leituras.colunas` — célula não confirmada nunca chega ao banco.
// Cada célula gravada é imutável (garantido pelo trigger `travar_confirmado`).
// Quando `completa` for true (última célula da linha), grava também o valor
// calculado e marca a linha inteira como confirmada (trava o valor).
export async function confirmarCelula(dados: {
  projetoId: string;
  projetoTesteId: string;
  rato: string;
  grupoId: string;
  tipo: string;
  colKey: string;
  valor: string;
  sessao: Record<string, unknown>;
  completa: boolean;
  valorCalculado: number | null;
  dentroDoPadrao: boolean | null;
  observacoes: string | null;
}): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const { data: atual } = await supabase
    .from("resultados_teste")
    .select("leituras, confirmado")
    .eq("projeto_teste_id", dados.projetoTesteId)
    .eq("rato", dados.rato)
    .maybeSingle();

  if (atual?.confirmado) {
    return { erro: "Este rato já está totalmente confirmado." };
  }

  const leiturasAtual = (atual?.leituras ?? {}) as {
    colunas?: Record<string, string>;
  };
  const colunas = { ...(leiturasAtual.colunas ?? {}) };
  if (colunas[dados.colKey] !== undefined) {
    return { erro: "Esta célula já foi confirmada." };
  }
  colunas[dados.colKey] = dados.valor;

  const leituras = { tipo: dados.tipo, colunas, sessao: dados.sessao };

  const { error } = await supabase.from("resultados_teste").upsert(
    {
      projeto_teste_id: dados.projetoTesteId,
      rato: dados.rato,
      grupo_id: dados.grupoId,
      leituras,
      valor_calculado: dados.completa ? dados.valorCalculado : null,
      dentro_do_padrao: dados.completa ? dados.dentroDoPadrao : null,
      observacoes: dados.observacoes,
      confirmado: dados.completa,
      registrado_por: user.id,
    },
    { onConflict: "projeto_teste_id,rato" }
  );
  if (error) {
    return { erro: "Não foi possível confirmar a célula: " + error.message };
  }

  revalidatePath(`/projetos/${dados.projetoId}/testes/${dados.projetoTesteId}`);
  return { sucesso: true };
}

// Encerra o teste de forma IRREVERSÍVEL: depois disso, nada mais pode ser
// gravado (o banco bloqueia via triggers bloquear_encerrado_* e travar_encerrado).
// Só então a aba libera a impressão da tabela (PDF, para colar no caderno de
// experimentos) e o anexo da foto dessa tabela colada. Quem encerra tem que ser
// responsável ou coautor (a policy de update de projeto_testes garante).
export async function encerrarTeste(
  projetoId: string,
  projetoTesteId: string
): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const { data: pt } = await supabase
    .from("projeto_testes")
    .select("encerrado")
    .eq("id", projetoTesteId)
    .maybeSingle();
  if (pt?.encerrado) return { erro: "Este teste já está encerrado." };

  const { error } = await supabase
    .from("projeto_testes")
    .update({
      encerrado: true,
      encerrado_por: user.id,
      encerrado_em: new Date().toISOString(),
      status: "concluido",
    })
    .eq("id", projetoTesteId);

  if (error) {
    return { erro: "Não foi possível encerrar o teste: " + error.message };
  }

  revalidatePath(`/projetos/${projetoId}/testes/${projetoTesteId}`);
  revalidatePath(`/projetos/${projetoId}`);
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
