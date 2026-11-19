import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { VoltarLink } from "@/components/ui/VoltarLink";
import { EditorNoticia } from "../EditorNoticia";

export default async function NovaNoticia() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  if (!usuario.aprovado) redirect("/bolsista");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <VoltarLink href="/noticias/minhas">Minhas notícias</VoltarLink>
      <h1 className="mt-2 font-display text-3xl leading-tight text-ink">Escrever notícia</h1>
      <p className="mt-1 mb-8 max-w-2xl text-sm text-ink-soft">
        Vai para o hall público do laboratório assim que você publicar. Se preferir
        revisar com calma, salve como rascunho.
      </p>
      <EditorNoticia autorNome={usuario.nome} />
    </main>
  );
}
