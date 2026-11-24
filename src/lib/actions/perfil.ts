"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ehVinculo } from "@/lib/vinculo";

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

  if (apresentacao.length > 300) {
    return { erro: "A apresentação pode ter no máximo 300 caracteres." };
  }
  const atualizacao: { apresentacao: string; foto_url?: string | null; vinculo?: string } = {
    apresentacao,
  };
  const vinculo = formData.get("vinculo");
  if (ehVinculo(vinculo)) atualizacao.vinculo = vinculo;
  if (String(formData.get("remover_foto") ?? "") === "1") {
    atualizacao.foto_url = null;
  }

  if (foto instanceof File && foto.size > 0) {
    if (foto.size > TAMANHO_MAXIMO_BYTES) {
      return { erro: "A imagem precisa ter no máximo 5 MB." };
    }
    if (!TIPOS_ACEITOS.includes(foto.type)) {
      return { erro: "Envie uma imagem JPEG, PNG ou WebP." };
    }

    const extensao = foto.type === "image/png" ? "png" : foto.type === "image/webp" ? "webp" : "jpg";
    // Arquivo NOVO a cada troca (sem upsert). Com upsert ("substituir se já
    // existir") o Storage exige também permissão de LEITURA em
    // storage.objects, que o bucket não tem — o envio caía em "new row
    // violates row-level security policy". Inserir um arquivo novo só precisa
    // da policy de INSERT na própria pasta, que existe. A foto antiga é
    // apagada depois que o perfil é salvo.
    const caminho = `${user.id}/foto-${Date.now()}.${extensao}`;
    const admin = createAdminClient();
    const storage = (admin ?? supabase).storage.from("avatars");

    const { error: erroUpload } = await storage.upload(caminho, foto, {
      contentType: foto.type,
    });
    if (erroUpload) {
      return { erro: "Não foi possível enviar a foto: " + erroUpload.message };
    }
    atualizacao.foto_url = storage.getPublicUrl(caminho).data.publicUrl;
  }

  // Foto que estava no perfil antes (para apagar do Storage se for trocada).
  const { data: anterior } = await supabase
    .from("profiles")
    .select("foto_url")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update(atualizacao)
    .eq("id", user.id);

  if (error) {
    return { erro: "Não foi possível salvar: " + error.message };
  }

  // Trocou ou tirou a foto: apaga o arquivo antigo (só se for da pasta da
  // própria pessoa). Falha aqui não desfaz nada — no máximo sobra um arquivo.
  if (atualizacao.foto_url !== undefined && anterior?.foto_url) {
    const marcador = "/storage/v1/object/public/avatars/";
    const i = anterior.foto_url.indexOf(marcador);
    const caminhoAntigo = i >= 0 ? anterior.foto_url.slice(i + marcador.length).split("?")[0] : null;
    if (caminhoAntigo && caminhoAntigo.startsWith(`${user.id}/`)) {
      const admin = createAdminClient();
      await (admin ?? supabase).storage.from("avatars").remove([caminhoAntigo]);
    }
  }

  revalidatePath("/perfil");
  revalidatePath("/");
  revalidatePath("/quem-somos");
  return { sucesso: true };
}
