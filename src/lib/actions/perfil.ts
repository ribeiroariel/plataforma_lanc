"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoPerfil = { erro: string } | { sucesso: true } | undefined;

const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

// Troca de senha estando logado (na página de perfil).
export async function alterarSenha(
  _estadoAnterior: ResultadoPerfil,
  formData: FormData
): Promise<ResultadoPerfil> {
  const supabase = await createClient();

  const senha = String(formData.get("senha") ?? "");
  const confirmar = String(formData.get("confirmar_senha") ?? "");

  if (senha.length < 6) {
    return { erro: "A senha precisa ter ao menos 6 caracteres." };
  }
  if (senha !== confirmar) {
    return { erro: "As senhas não coincidem." };
  }

  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    return { erro: "Não foi possível trocar a senha: " + error.message };
  }
  return { sucesso: true };
}

export async function atualizarPerfil(
  _estadoAnterior: ResultadoPerfil,
  formData: FormData
): Promise<ResultadoPerfil> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Você precisa estar logado." };
  }

  const apresentacao = String(formData.get("apresentacao") ?? "").trim();
  const foto = formData.get("foto");

  const atualizacao: { apresentacao: string; foto_url?: string } = {
    apresentacao,
  };

  if (foto instanceof File && foto.size > 0) {
    if (foto.size > TAMANHO_MAXIMO_BYTES) {
      return { erro: "A imagem precisa ter no máximo 5 MB." };
    }
    if (!TIPOS_ACEITOS.includes(foto.type)) {
      return { erro: "Envie uma imagem JPEG, PNG ou WebP." };
    }

    const extensao = foto.type === "image/png" ? "png" : foto.type === "image/webp" ? "webp" : "jpg";
    const caminho = `${user.id}/foto.${extensao}`;

    const { error: erroUpload } = await supabase.storage
      .from("avatars")
      .upload(caminho, foto, { upsert: true, contentType: foto.type });

    if (erroUpload) {
      return { erro: "Não foi possível enviar a foto: " + erroUpload.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(caminho);

    // Evita cache de navegador/CDN mostrando a foto antiga depois do upsert.
    atualizacao.foto_url = `${publicUrl}?v=${Date.now()}`;
  }

  const { error } = await supabase
    .from("profiles")
    .update(atualizacao)
    .eq("id", user.id);

  if (error) {
    return { erro: "Não foi possível salvar: " + error.message };
  }

  revalidatePath("/perfil");
  revalidatePath("/");
  return { sucesso: true };
}
