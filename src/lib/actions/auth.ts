"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
  const confirmarEmail = String(formData.get("confirmar_email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const confirmarSenha = String(formData.get("confirmar_senha") ?? "");
  const nome = String(formData.get("nome") ?? "");

  if (!nome.trim()) {
    return { erro: "Informe seu nome." };
  }
  if (email !== confirmarEmail) {
    return { erro: "Os e-mails não coincidem." };
  }
  if (senha !== confirmarSenha) {
    return { erro: "As senhas não coincidem." };
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

  // Com a confirmação de e-mail desligada, o signUp já cria sessão — mando
  // direto pra área do bolsista, que mostra "aguardando aprovação". Se a
  // confirmação estiver ligada (sem sessão), o proxy leva pro /login.
  redirect("/bolsista");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// "Esqueci a senha": envia o e-mail de recuperação. O link do e-mail
// aponta para /auth/confirmar (que troca o token por sessão) com
// next=/redefinir-senha. Sempre responde com sucesso, mesmo que o e-mail
// não exista, para não revelar quais e-mails têm conta.
export type ResultadoRecuperacao = { erro: string } | { enviado: true } | undefined;

export async function enviarRecuperacao(
  _estadoAnterior: ResultadoRecuperacao,
  formData: FormData
): Promise<ResultadoRecuperacao> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { erro: "Informe seu e-mail." };
  }

  const cabecalhos = await headers();
  const origem =
    cabecalhos.get("origin") ??
    `https://${cabecalhos.get("host") ?? ""}`;

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}/auth/confirmar?next=/redefinir-senha`,
  });

  return { enviado: true };
}

// Define a nova senha. Requer a sessão de recuperação (o usuário chegou
// aqui pelo link do e-mail, que já criou a sessão via /auth/confirmar).
export async function definirNovaSenha(
  _estadoAnterior: ResultadoAcao,
  formData: FormData
): Promise<ResultadoAcao> {
  const supabase = await createClient();

  const senha = String(formData.get("senha") ?? "");
  const confirmarSenha = String(formData.get("confirmar_senha") ?? "");

  if (senha.length < 6) {
    return { erro: "A senha precisa ter ao menos 6 caracteres." };
  }
  if (senha !== confirmarSenha) {
    return { erro: "As senhas não coincidem." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      erro: "Link de recuperação expirado. Peça um novo em 'Esqueci a senha'.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    return { erro: "Não foi possível alterar a senha: " + error.message };
  }

  redirect("/login?senha=ok");
}
