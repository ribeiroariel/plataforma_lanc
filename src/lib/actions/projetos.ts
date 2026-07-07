"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoAcao = { erro: string } | void;

export async function criarProjeto(
  _estadoAnterior: ResultadoAcao,
  formData: FormData
): Promise<ResultadoAcao> {
  const supabase = await createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const numeroLevasRaw = String(formData.get("numeroLevas") ?? "").trim();
  const numeroLevas = numeroLevasRaw ? parseInt(numeroLevasRaw, 10) : null;

  const gruposNomes = formData.getAll("grupoNome").map((v) => String(v).trim());
  const gruposRatos = formData
    .getAll("grupoRatos")
    .map((v) => parseInt(String(v), 10) || 0);

  if (!nome) {
    return { erro: "Dê um nome ao projeto." };
  }
  if (gruposNomes.every((g) => !g)) {
    return { erro: "Informe ao menos um grupo experimental." };
  }

  const { data, error } = await supabase.rpc("criar_projeto", {
    p_nome: nome,
    p_descricao: descricao || null,
    p_numero_levas: numeroLevas,
    p_grupos_nomes: gruposNomes,
    p_grupos_ratos: gruposRatos,
  });

  if (error) {
    return { erro: "Não foi possível criar o projeto: " + error.message };
  }

  redirect(`/bolsista/projetos/${data}`);
}

export async function adicionarMembro(
  _estadoAnterior: ResultadoAcao,
  formData: FormData
): Promise<ResultadoAcao> {
  const supabase = await createClient();

  const projetoId = String(formData.get("projetoId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const papel = String(formData.get("papel") ?? "ajudante");

  if (!email) {
    return { erro: "Informe o e-mail do bolsista." };
  }

  const { data: encontrado, error: erroBusca } = await supabase
    .rpc("buscar_bolsista_por_email", { p_email: email })
    .returns<{ id: string; nome: string; papel: string }[]>()
    .maybeSingle();

  if (erroBusca || !encontrado) {
    return {
      erro: "Nenhum bolsista aprovado encontrado com esse e-mail.",
    };
  }

  const { error } = await supabase.from("projeto_membros").insert({
    projeto_id: projetoId,
    profile_id: encontrado.id,
    papel: papel === "coautor" ? "coautor" : "ajudante",
  });

  if (error) {
    return { erro: "Não foi possível adicionar: " + error.message };
  }

  revalidatePath(`/bolsista/projetos/${projetoId}`);
}

export async function designarTeste(
  _estadoAnterior: ResultadoAcao,
  formData: FormData
): Promise<ResultadoAcao> {
  const supabase = await createClient();

  const projetoId = String(formData.get("projetoId") ?? "");
  const testeSlug = String(formData.get("testeSlug") ?? "");
  const email = String(formData.get("email") ?? "").trim();

  if (!testeSlug || !email) {
    return { erro: "Escolha o teste e informe o e-mail do responsável." };
  }

  const { data: encontrado, error: erroBusca } = await supabase
    .rpc("buscar_bolsista_por_email", { p_email: email })
    .returns<{ id: string; nome: string; papel: string }[]>()
    .maybeSingle();

  if (erroBusca || !encontrado) {
    return {
      erro: "Nenhum bolsista aprovado encontrado com esse e-mail.",
    };
  }

  const { error } = await supabase.from("projeto_testes").insert({
    projeto_id: projetoId,
    teste_slug: testeSlug,
    responsavel_id: encontrado.id,
  });

  if (error) {
    return { erro: "Não foi possível designar: " + error.message };
  }

  revalidatePath(`/bolsista/projetos/${projetoId}`);
}
