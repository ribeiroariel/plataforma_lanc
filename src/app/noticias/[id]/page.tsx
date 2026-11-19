import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { IlustracaoRedox, varianteNoticia } from "@/components/IlustracaoRedox";

type Noticia = {
  id: string;
  titulo: string;
  tipo: "publicacao" | "atividade";
  resumo: string;
  corpo: string;
  link_artigo: string | null;
  imagem_url: string | null;
  data: string;
  publicado: boolean;
  autor_id: string | null;
  profiles: { nome: string } | null;
};

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Renderiza o corpo (markdown simples) como parágrafos. Linhas que começam
// com "**Rótulo:**" viram um destaque em negrito.
function CorpoNoticia({ corpo }: { corpo: string }) {
  const paragrafos = corpo
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      {paragrafos.map((p, i) => {
        const negrito = p.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
        if (negrito) {
          return (
            <p key={i} className="text-sm leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">{negrito[1]}</span>{" "}
              {negrito[2]}
            </p>
          );
        }
        return (
          <p key={i} className="leading-relaxed text-ink/90">
            {p}
          </p>
        );
      })}
    </div>
  );
}

export default async function PaginaNoticia({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ publicada?: string }>;
}) {
  const { id } = await params;
  const { publicada } = await searchParams;
  const supabase = await createClient();
  let usuario = null;
  try {
    usuario = await getUsuarioAtual();
  } catch {
    usuario = null;
  }

  // Visitante só recebe publicadas (RLS); o autor também vê o próprio
  // rascunho, e a orientadora vê tudo.
  const { data: noticia } = await supabase
    .from("noticias")
    .select("id, titulo, tipo, resumo, corpo, link_artigo, imagem_url, data, publicado, autor_id, profiles:autor_id(nome)")
    .eq("id", id)
    .maybeSingle()
    .returns<Noticia>();

  if (!noticia) notFound();
  const podeEditar =
    !!usuario && (noticia.autor_id === usuario.id || usuario.papel === "orientador");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-ink-soft hover:text-signal">
        ← Todas as notícias
      </Link>

      {publicada && noticia.publicado && (
        <p className="mt-4 rounded border border-sucesso/40 bg-sucesso/[0.07] px-3 py-2 text-sm text-ink">
          Notícia publicada. Ela já aparece no hall do laboratório.
        </p>
      )}
      {!noticia.publicado && (
        <p className="mt-4 rounded border border-reagent/40 bg-reagent/[0.07] px-3 py-2 text-sm text-ink">
          Rascunho: só você e a orientadora veem esta página.
        </p>
      )}

      <article className="mt-4">
        <span className="text-xs font-medium text-signal">
          {noticia.tipo === "publicacao" ? "Publicação" : "Atividade"}
        </span>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">
          {noticia.titulo}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-ink-soft">
          <span className="font-mono">{formatarData(noticia.data)}</span>
          {noticia.profiles?.nome && <span>por {noticia.profiles.nome}</span>}
          {podeEditar && (
            <Link href={`/noticias/minhas/${noticia.id}`} className="text-absorbance hover:underline">
              Editar
            </Link>
          )}
        </p>

        <div className="my-6">
          {noticia.imagem_url ? (
            <>
              <Image
                src={noticia.imagem_url}
                alt={noticia.titulo}
                width={1000}
                height={560}
                className="w-full rounded object-cover"
              />
              {noticia.tipo === "publicacao" && (
                <p className="mt-1.5 text-xs text-ink-soft/70">
                  Imagem: figura do artigo original.
                </p>
              )}
            </>
          ) : (
            <IlustracaoRedox
              className="h-64 w-full rounded"
              variante={varianteNoticia(noticia.titulo, noticia.resumo)}
            />
          )}
        </div>

        <p className="mb-6 border-l-2 border-signal pl-4 text-lg leading-relaxed text-ink">
          {noticia.resumo}
        </p>

        <CorpoNoticia corpo={noticia.corpo} />

        {noticia.link_artigo && (
          <div className="mt-8 border-t border-rule pt-4">
            <a
              href={noticia.link_artigo}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-signal hover:text-ink font-medium"
            >
              Ler o artigo completo (DOI)
            </a>
          </div>
        )}
      </article>
    </main>
  );
}
