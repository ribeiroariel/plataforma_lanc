"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Registro fotográfico do caderno de bancada — opcional, só pra transparência
// (a fonte de dado válida continua sendo a absorbância digitada). O bucket é
// PRIVADO (diferente do avatars, que é público), então tudo é servido por
// signed URL. Caminho no bucket: {projeto_teste_id}/{uuid}.<ext> — o primeiro
// nível é o id do ensaio, que as policies de storage usam pra checar acesso.

const BUCKET = "cadernos";
const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10 MB (foto de página inteira)
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const VALIDADE_URL_SEGUNDOS = 60 * 60; // a página regenera a URL a cada render

export type FotoCaderno = {
  id: string;
  url: string;
  autor: string | null;
  criadaEm: string;
};

type LinhaFoto = {
  id: string;
  caminho: string;
  created_at: string;
  autor: { nome: string | null } | null;
};

// Lista as fotos de um ensaio já com signed URL. Defensivo: se a tabela/bucket
// ainda não existir em produção (SQL não rodado), devolve [] em vez de quebrar.
export async function listarFotosCaderno(
  projetoTesteId: string
): Promise<FotoCaderno[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fotos_caderno")
    .select(
      "id, caminho, created_at, autor:profiles!fotos_caderno_enviado_por_fkey(nome)"
    )
    .eq("projeto_teste_id", projetoTesteId)
    .order("created_at", { ascending: true })
    .returns<LinhaFoto[]>();

  if (error || !data) return [];

  const fotos: FotoCaderno[] = [];
  for (const linha of data) {
    const { data: assinada } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(linha.caminho, VALIDADE_URL_SEGUNDOS);
    if (!assinada?.signedUrl) continue;
    fotos.push({
      id: linha.id,
      url: assinada.signedUrl,
      autor: linha.autor?.nome ?? null,
      criadaEm: linha.created_at,
    });
  }
  return fotos;
}

export async function subirFotoCaderno(
  projetoId: string,
  projetoTesteId: string,
  formData: FormData
): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const foto = formData.get("foto");
  if (!(foto instanceof File) || foto.size === 0) {
    return { erro: "Selecione uma imagem." };
  }
  if (foto.size > TAMANHO_MAXIMO_BYTES) {
    return { erro: "A imagem precisa ter no máximo 10 MB." };
  }
  if (!TIPOS_ACEITOS.includes(foto.type)) {
    return { erro: "Envie uma imagem JPEG, PNG ou WebP." };
  }

  const extensao =
    foto.type === "image/png" ? "png" : foto.type === "image/webp" ? "webp" : "jpg";
  const caminho = `${projetoTesteId}/${crypto.randomUUID()}.${extensao}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, foto, { contentType: foto.type });
  if (erroUpload) {
    return { erro: "Não foi possível enviar a foto: " + erroUpload.message };
  }

  const { error } = await supabase.from("fotos_caderno").insert({
    projeto_teste_id: projetoTesteId,
    caminho,
    enviado_por: user.id,
  });
  if (error) {
    // Sem a linha no banco a foto ficaria órfã no bucket — desfaz o upload.
    await supabase.storage.from(BUCKET).remove([caminho]);
    return { erro: "Não foi possível registrar a foto: " + error.message };
  }

  revalidatePath(`/projetos/${projetoId}/testes/${projetoTesteId}`);
  return { sucesso: true };
}

export async function removerFotoCaderno(
  projetoId: string,
  projetoTesteId: string,
  fotoId: string
): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();

  const { data: linha, error: erroBusca } = await supabase
    .from("fotos_caderno")
    .select("caminho")
    .eq("id", fotoId)
    .maybeSingle();
  if (erroBusca || !linha) return { erro: "Foto não encontrada." };

  // A RLS de delete garante que só o responsável que enviou consegue apagar.
  const { error: erroRemocao } = await supabase
    .from("fotos_caderno")
    .delete()
    .eq("id", fotoId);
  if (erroRemocao) {
    return { erro: "Não foi possível remover: " + erroRemocao.message };
  }

  await supabase.storage.from(BUCKET).remove([linha.caminho]);

  revalidatePath(`/projetos/${projetoId}/testes/${projetoTesteId}`);
  return { sucesso: true };
}
