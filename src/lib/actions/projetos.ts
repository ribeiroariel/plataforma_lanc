"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TECIDOS_ANALISAVEIS, testes as catalogoTestes } from "@/lib/tecidos";

// Lê os tecidos marcados no formulário, mantendo só os válidos.
function tecidosDoForm(formData: FormData): string[] {
  return formData
    .getAll("tecidos")
    .map(String)
    .filter((t) => (TECIDOS_ANALISAVEIS as string[]).includes(t));
}

export type ResultadoAcao = { erro: string } | void;

type GrupoEntrada = { id?: string; nome: string; ratosPorLeva: number[] };

async function gravarVersao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projetoId: string,
  nota: string
) {
  const { data: userData } = await supabase.auth.getUser();
  const [{ data: projeto }, { data: grupos }] = await Promise.all([
    supabase
      .from("projetos")
      .select("nome, descricao, numero_levas")
      .eq("id", projetoId)
      .maybeSingle(),
    supabase
      .from("projeto_grupos")
      .select("nome, numero_ratos, ratos_por_leva")
      .eq("projeto_id", projetoId)
      .order("created_at", { ascending: true }),
  ]);
  await supabase.from("projeto_versoes").insert({
    projeto_id: projetoId,
    retrato: { projeto, grupos },
    nota,
    criado_por: userData.user?.id ?? null,
  });
}

export async function criarProjeto(
  _estadoAnterior: ResultadoAcao,
  formData: FormData
): Promise<ResultadoAcao> {
  const supabase = await createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const numeroLevas = parseInt(String(formData.get("numeroLevas") ?? ""), 10);

  if (!nome) {
    return { erro: "Dê um nome ao projeto." };
  }
  if (!Number.isFinite(numeroLevas) || numeroLevas < 1) {
    return { erro: "Informe o número de levas de sacrifício (mínimo 1)." };
  }

  let grupos: GrupoEntrada[] = [];
  try {
    grupos = JSON.parse(String(formData.get("gruposJson") ?? "[]"));
  } catch {
    return { erro: "Erro ao ler os grupos." };
  }

  const gruposValidos = grupos
    .filter((g) => g.nome.trim() !== "")
    .map((g) => ({
      nome: g.nome.trim(),
      ratosPorLeva: g.ratosPorLeva.map((n) => Number(n) || 0),
    }));

  if (gruposValidos.length === 0) {
    return { erro: "Informe ao menos um grupo experimental." };
  }

  const vazio = gruposValidos.find(
    (g) => g.ratosPorLeva.reduce((s, n) => s + n, 0) === 0
  );
  if (vazio) {
    return {
      erro: `O grupo "${vazio.nome}" não tem nenhum rato — remova-o ou informe a quantidade.`,
    };
  }

  const { data, error } = await supabase.rpc("criar_projeto", {
    p_nome: nome,
    p_descricao: descricao || null,
    p_numero_levas: numeroLevas,
    p_grupos: gruposValidos,
    p_tecidos: tecidosDoForm(formData),
  });

  if (error) {
    return { erro: "Não foi possível criar o projeto: " + error.message };
  }

  redirect(`/projetos/${data}`);
}

export async function editarProjeto(
  _estadoAnterior: ResultadoAcao,
  formData: FormData
): Promise<ResultadoAcao> {
  const supabase = await createClient();

  const projetoId = String(formData.get("projetoId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const numeroLevas = parseInt(String(formData.get("numeroLevas") ?? ""), 10);
  const nota = String(formData.get("nota") ?? "").trim();

  if (!nome) return { erro: "Dê um nome ao projeto." };
  if (!Number.isFinite(numeroLevas) || numeroLevas < 1) {
    return { erro: "Informe o número de levas de sacrifício (mínimo 1)." };
  }

  // Bloqueia edição de projeto finalizado.
  const { data: proj } = await supabase
    .from("projetos")
    .select("finalizado")
    .eq("id", projetoId)
    .maybeSingle();
  if (proj?.finalizado) {
    return { erro: "Projeto finalizado — não pode mais ser editado." };
  }

  let grupos: GrupoEntrada[] = [];
  try {
    grupos = JSON.parse(String(formData.get("gruposJson") ?? "[]"));
  } catch {
    return { erro: "Erro ao ler os grupos." };
  }
  const gruposValidos = grupos
    .filter((g) => g.nome.trim() !== "")
    .map((g) => ({
      id: g.id,
      nome: g.nome.trim(),
      ratosPorLeva: g.ratosPorLeva.map((n) => Number(n) || 0),
    }));
  if (gruposValidos.length === 0) {
    return { erro: "Informe ao menos um grupo experimental." };
  }
  const vazio = gruposValidos.find(
    (g) => g.ratosPorLeva.reduce((s, n) => s + n, 0) === 0
  );
  if (vazio) {
    return { erro: `O grupo "${vazio.nome}" não tem nenhum rato.` };
  }

  // Grava a versão ANTES da mudança (retrato do estado atual).
  await gravarVersao(supabase, projetoId, nota || "Edição do projeto");

  const { error: erroProj } = await supabase
    .from("projetos")
    .update({
      nome,
      descricao: descricao || null,
      numero_levas: numeroLevas,
      tecidos: tecidosDoForm(formData),
    })
    .eq("id", projetoId);
  if (erroProj) {
    return { erro: "Não foi possível salvar: " + erroProj.message };
  }

  const { data: existentes } = await supabase
    .from("projeto_grupos")
    .select("id")
    .eq("projeto_id", projetoId);
  const idsExistentes = new Set((existentes ?? []).map((g) => g.id));
  const idsMantidos = new Set<string>();

  for (const g of gruposValidos) {
    const total = g.ratosPorLeva.reduce((s, n) => s + n, 0);
    if (g.id && idsExistentes.has(g.id)) {
      idsMantidos.add(g.id);
      const { error } = await supabase
        .from("projeto_grupos")
        .update({ nome: g.nome, numero_ratos: total, ratos_por_leva: g.ratosPorLeva })
        .eq("id", g.id);
      if (error) return { erro: "Erro ao atualizar grupo: " + error.message };
    } else {
      const { error } = await supabase.from("projeto_grupos").insert({
        projeto_id: projetoId,
        nome: g.nome,
        numero_ratos: total,
        ratos_por_leva: g.ratosPorLeva,
      });
      if (error) return { erro: "Erro ao adicionar grupo: " + error.message };
    }
  }

  // Remove grupos que saíram (falha se tiverem resultados — protege dados).
  for (const id of idsExistentes) {
    if (!idsMantidos.has(id)) {
      const { error } = await supabase.from("projeto_grupos").delete().eq("id", id);
      if (error) {
        return {
          erro: "Um grupo removido já tem resultados registrados e não pode ser apagado. Desfaça a remoção dele.",
        };
      }
    }
  }

  revalidatePath(`/projetos/${projetoId}`);
  redirect(`/projetos/${projetoId}`);
}

export async function finalizarProjeto(projetoId: string) {
  const supabase = await createClient();
  await gravarVersao(supabase, projetoId, "Projeto finalizado");
  const { error } = await supabase
    .from("projetos")
    .update({ finalizado: true, finalizado_em: new Date().toISOString() })
    .eq("id", projetoId);
  if (error) return { erro: error.message };
  revalidatePath(`/projetos/${projetoId}`);
}

export async function adicionarMembro(
  _estadoAnterior: ResultadoAcao,
  formData: FormData
): Promise<ResultadoAcao> {
  const supabase = await createClient();

  const projetoId = String(formData.get("projetoId") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  const papel = String(formData.get("papel") ?? "ajudante");

  if (!profileId) {
    return { erro: "Escolha uma pessoa." };
  }

  const { error } = await supabase.from("projeto_membros").insert({
    projeto_id: projetoId,
    profile_id: profileId,
    papel: papel === "coautor" ? "coautor" : "ajudante",
  });

  if (error) {
    return { erro: "Não foi possível adicionar: " + error.message };
  }

  revalidatePath(`/projetos/${projetoId}`);
}

export async function designarTeste(
  _estadoAnterior: ResultadoAcao,
  formData: FormData
): Promise<ResultadoAcao> {
  const supabase = await createClient();

  const projetoId = String(formData.get("projetoId") ?? "");
  const testeSlug = String(formData.get("testeSlug") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  const levaRaw = String(formData.get("leva") ?? "").trim();
  const leva = levaRaw ? parseInt(levaRaw, 10) : null;
  const ajudantes = formData
    .getAll("ajudantes")
    .map((v) => String(v))
    .filter((v) => v && v !== profileId);

  if (!testeSlug || !profileId) {
    return { erro: "Escolha o teste e a pessoa responsável." };
  }

  // Defesa: o teste designado precisa ser de um tecido que o projeto analisa
  // (a UI já filtra, isto blinda contra chamada forjada). Projeto sem tecidos
  // definidos = sem restrição (compatível com projetos antigos).
  const { data: proj } = await supabase
    .from("projetos")
    .select("tecidos")
    .eq("id", projetoId)
    .maybeSingle();
  const tecidosProjeto = (proj?.tecidos ?? []) as string[];
  const teste = catalogoTestes.find((t) => t.slug === testeSlug);
  if (
    teste &&
    tecidosProjeto.length > 0 &&
    !tecidosProjeto.includes(teste.tecido)
  ) {
    return {
      erro: "Este teste é de um tecido fora dos tecidos analisados do projeto.",
    };
  }

  const { data: novo, error } = await supabase
    .from("projeto_testes")
    .insert({
      projeto_id: projetoId,
      teste_slug: testeSlug,
      responsavel_id: profileId,
      leva,
    })
    .select("id")
    .single();

  if (error || !novo) {
    return { erro: "Não foi possível designar: " + (error?.message ?? "") };
  }

  if (ajudantes.length > 0) {
    const linhas = [...new Set(ajudantes)].map((id) => ({
      projeto_teste_id: novo.id,
      profile_id: id,
    }));
    const { error: erroAj } = await supabase
      .from("projeto_teste_ajudantes")
      .insert(linhas);
    if (erroAj) {
      return { erro: "Teste criado, mas erro ao adicionar ajudantes: " + erroAj.message };
    }
  }

  revalidatePath(`/projetos/${projetoId}`);
}
