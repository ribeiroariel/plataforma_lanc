import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import type { NoticiaEditavel } from "@/lib/noticias";
import { VoltarLink } from "@/components/ui/VoltarLink";
import { EditorNoticia } from "../../EditorNoticia";

export default async function EditarNoticia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  const supabase = await createClient();

  const { data: noticia } = await supabase
    .from("noticias")
    .select("id, titulo, tipo, resumo, corpo, link_artigo, imagem_url, data, publicado, autor_id")
    .eq("id", id)
    .maybeSingle()
    .returns<NoticiaEditavel & { autor_id: string | null }>();

  // Só o autor (ou a orientadora) edita; a RLS também barra no salvar.
  if (!noticia || (noticia.autor_id !== usuario.id && usuario.papel !== "orientador")) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <VoltarLink href="/noticias/minhas">Minhas notícias</VoltarLink>
      <h1 className="mt-2 mb-8 font-display text-3xl leading-tight text-ink">Editar notícia</h1>
      <EditorNoticia inicial={noticia} autorNome={usuario.nome} />
    </main>
  );
}
