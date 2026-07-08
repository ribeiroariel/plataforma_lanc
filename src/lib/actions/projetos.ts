"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoAcao = { erro: string } | void;

type GrupoEntrada = { nome: string; ratosPorLeva: number[] };

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

  const { data, error } = await supabase.rpc("criar_projeto", {
    p_nome: nome,
    p_descricao: descricao || null,
    p_numero_levas: numeroLevas,
    p_grupos: gruposValidos,
  });

  if (error) {
    return { erro: "Não foi possível criar o projeto: " + error.message };
  }

  redirect(`/projetos/${data}`);
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

  if (!testeSlug || !profileId) {
    return { erro: "Escolha o teste e a pessoa responsável." };
  }

  const { error } = await supabase.from("projeto_testes").insert({
    projeto_id: projetoId,
    teste_slug: testeSlug,
    responsavel_id: profileId,
  });

  if (error) {
    return { erro: "Não foi possível designar: " + error.message };
  }

  revalidatePath(`/projetos/${projetoId}`);
}
