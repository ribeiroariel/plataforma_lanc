"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ResultadoAcao = { erro: string } | void;

export async function login(
  _estadoAnterior: ResultadoAcao,
  formData: FormData
): Promise<ResultadoAcao> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return { erro: "E-mail ou senha incorretos." };
  }

  redirect("/");
}

// Cadastro público cria SEMPRE papel = "bolsista". O papel "orientador" não
// tem formulário — é criado manualmente pelo Ariel (cadastro normal seguido
// de um update direto no Supabase, já que o cliente não pode alterar a
// própria coluna "papel", ver supabase/schema.sql).
export async function cadastrar(
  _estadoAnterior: ResultadoAcao,
  formData: FormData
): Promise<ResultadoAcao> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const nome = String(formData.get("nome") ?? "");

  if (!nome.trim()) {
    return { erro: "Informe seu nome." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome, papel: "bolsista" },
    },
  });

  if (error) {
    return { erro: "Não foi possível criar a conta: " + error.message };
  }

  redirect("/login?cadastro=ok");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
