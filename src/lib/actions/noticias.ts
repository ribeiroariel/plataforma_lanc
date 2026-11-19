"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIMITES_NOTICIA } from "@/lib/noticias";

export type ResultadoNoticia = { erro: string; campo?: string } | undefined;

const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;
const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];

function texto(fd: FormData, nome: string) {
  return String(fd.get(nome) ?? "").trim();
}

// Cria ou edita uma notícia. Quem pode: qualquer cadastro aprovado, sempre em
// nome próprio (autor_id = quem está logado); editar só a própria — a
// orientadora edita qualquer uma. As travas de verdade estão nas policies
// de `noticias` (ver migração 2026-11-18); aqui é a validação do formulário.
export async function salvarNoticia(
  _anterior: ResultadoNoticia,
  fd: FormData
): Promise<ResultadoNoticia> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const id = texto(fd, "id") || null;
  const titulo = texto(fd, "titulo");
  const tipo = texto(fd, "tipo");
  const resumo = texto(fd, "resumo");
  const corpo = texto(fd, "corpo");
  const link = texto(fd, "link_artigo");
  const data = texto(fd, "data");
  const publicar = texto(fd, "acao") === "publicar";
  const removerImagem = texto(fd, "remover_imagem") === "1";

  if (titulo.length < 8) return { erro: "Escreva um título (pelo menos 8 caracteres).", campo: "titulo" };
  if (titulo.length > LIMITES_NOTICIA.titulo) return { erro: "Título longo demais.", campo: "titulo" };
  if (tipo !== "publicacao" && tipo !== "atividade") return { erro: "Escolha o tipo da notícia.", campo: "tipo" };
  if (resumo.length < 20) return { erro: "O resumo precisa de pelo menos uma frase.", campo: "resumo" };
  if (resumo.length > LIMITES_NOTICIA.resumo) return { erro: "Resumo longo demais.", campo: "resumo" };
  if (corpo.length < 40) return { erro: "Escreva o texto da notícia.", campo: "corpo" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Data inválida.", campo: "data" };
  if (link && !/^https?:\/\/\S+$/i.test(link)) {
    return { erro: "O link precisa começar com http:// ou https://", campo: "link_artigo" };
  }
  if (tipo === "publicacao" && !link) {
    return { erro: "Para publicação, informe o link do artigo (DOI).", campo: "link_artigo" };
  }

  const linha: Record<string, unknown> = {
    titulo,
    tipo,
    resumo,
    corpo,
    link_artigo: link || null,
    data,
    publicado: publicar,
  };

  // Imagem (opcional): sobe na pasta do próprio usuário. Mesma escolha da foto
  // de perfil: usa a chave de serviço quando existe, com o caminho travado em
  // "{id do usuário}/...".
  const imagem = fd.get("imagem");
  if (imagem instanceof File && imagem.size > 0) {
    if (imagem.size > TAMANHO_MAXIMO_BYTES) return { erro: "A imagem precisa ter no máximo 5 MB.", campo: "imagem" };
    if (!TIPOS_IMAGEM.includes(imagem.type)) return { erro: "Envie uma imagem JPEG, PNG ou WebP.", campo: "imagem" };
    const ext = imagem.type === "image/png" ? "png" : imagem.type === "image/webp" ? "webp" : "jpg";
    const caminho = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const storage = (createAdminClient() ?? supabase).storage.from("noticias");
    const { error } = await storage.upload(caminho, imagem, { contentType: imagem.type });
    if (error) return { erro: "Não foi possível enviar a imagem: " + error.message, campo: "imagem" };
    linha.imagem_url = storage.getPublicUrl(caminho).data.publicUrl;
  } else if (removerImagem) {
    linha.imagem_url = null;
  }

  let novoId = id;
  if (id) {
    const { error, count } = await supabase
      .from("noticias")
      .update(linha, { count: "exact" })
      .eq("id", id);
    if (error) return { erro: "Não foi possível salvar: " + error.message };
    if (count === 0) return { erro: "Você só pode editar as suas notícias." };
  } else {
    const { data: criada, error } = await supabase
      .from("noticias")
      .insert({ ...linha, autor_id: user.id })
      .select("id")
      .single();
    if (error || !criada) {
      return {
        erro:
          "Não foi possível salvar: " +
          (error?.message ?? "") +
          (error?.code === "42703" ? " (falta rodar a migração de notícias no Supabase)" : ""),
      };
    }
    novoId = criada.id as string;
  }

  revalidatePath("/");
  revalidatePath("/noticias/minhas");
  revalidatePath(`/noticias/${novoId}`);
  redirect(publicar ? `/noticias/${novoId}?publicada=1` : `/noticias/minhas?salva=1`);
}

export async function alternarPublicacao(
  id: string,
  publicado: boolean
): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("noticias")
    .update({ publicado }, { count: "exact" })
    .eq("id", id);
  if (error) return { erro: error.message };
  if (count === 0) return { erro: "Você só pode alterar as suas notícias." };
  revalidatePath("/");
  revalidatePath("/noticias/minhas");
  revalidatePath(`/noticias/${id}`);
  return { sucesso: true };
}

export async function apagarNoticia(id: string): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("noticias").delete({ count: "exact" }).eq("id", id);
  if (error) return { erro: error.message };
  if (count === 0) return { erro: "Você só pode apagar as suas notícias." };
  revalidatePath("/");
  revalidatePath("/noticias/minhas");
  return { sucesso: true };
}
