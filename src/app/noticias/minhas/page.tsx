import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { EmptyState } from "@/components/ui/EmptyState";
import { BOTAO_PRIMARIO } from "@/lib/estilos";
import AcoesNoticia from "./AcoesNoticia";

type Linha = {
  id: string;
  titulo: string;
  tipo: "publicacao" | "atividade";
  data: string;
  publicado: boolean;
  autor_id: string | null;
  profiles: { nome: string } | null;
};

export default async function MinhasNoticias({
  searchParams,
}: {
  searchParams: Promise<{ salva?: string }>;
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  const { salva } = await searchParams;
  const supabase = await createClient();
  const ehOrientadora = usuario.papel === "orientador";

  // Bolsista: só as próprias. Orientadora: todas (revisa o que a equipe escreve).
  let consulta = supabase
    .from("noticias")
    .select("id, titulo, tipo, data, publicado, autor_id, profiles:autor_id(nome)")
    .order("data", { ascending: false });
  if (!ehOrientadora) consulta = consulta.eq("autor_id", usuario.id);
  const { data: noticias, error } = await consulta.returns<Linha[]>();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl leading-tight text-ink">
            {ehOrientadora ? "Notícias" : "Minhas notícias"}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {ehOrientadora
              ? "Tudo o que a equipe escreveu, publicado ou em rascunho."
              : "O que você escreveu para o hall do laboratório."}
          </p>
        </div>
        <Link href="/noticias/nova" className={BOTAO_PRIMARIO}>
          Escrever notícia
        </Link>
      </div>

      {salva && (
        <p className="mt-5 rounded border border-sucesso/40 bg-sucesso/[0.07] px-3 py-2 text-sm text-ink">
          Rascunho salvo. Ele só aparece no site depois de publicado.
        </p>
      )}
      {error && (
        <p className="mt-5 text-sm text-alerta">
          Não consegui carregar as notícias ({error.message}).
        </p>
      )}

      {!error && (noticias ?? []).length === 0 ? (
        <EmptyState
          className="mt-8"
          titulo="Nenhuma notícia ainda"
          descricao="Teve defesa, congresso, artigo novo ou um dia diferente no laboratório? Conte no hall de notícias."
        />
      ) : (
        <ul className="mt-6 divide-y divide-rule rounded border border-rule">
          {(noticias ?? []).map((n) => (
            <li key={n.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <Link href={`/noticias/${n.id}`} className="font-medium text-ink hover:text-signal">
                  {n.titulo}
                </Link>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {n.tipo === "publicacao" ? "Publicação" : "Atividade"} ·{" "}
                  {new Date(`${n.data}T00:00:00`).toLocaleDateString("pt-BR")}
                  {ehOrientadora && ` · ${n.profiles?.nome ?? "publicada pelo script"}`}
                </p>
              </div>
              <span
                className={`rounded px-1.5 py-px text-xs font-medium ${
                  n.publicado ? "bg-sucesso/12 text-sucesso" : "bg-ink/5 text-ink-soft"
                }`}
              >
                {n.publicado ? "no ar" : "rascunho"}
              </span>
              <AcoesNoticia
                id={n.id}
                publicado={n.publicado}
                podeEditar={n.autor_id === usuario.id || ehOrientadora}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
