import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Papel } from "@/lib/supabase/profile";

type Noticia = {
  id: string;
  titulo: string;
  tipo: "publicacao" | "atividade";
  resumo: string;
  link_artigo: string | null;
  imagem_url: string | null;
  data: string;
};

type Bolsista = {
  id: string;
  nome: string;
  papel: Papel;
  foto_url: string | null;
  apresentacao: string | null;
};

async function buscarDadosPublicos() {
  const supabase = await createClient();

  const [{ data: noticias }, { data: pessoas }] = await Promise.all([
    supabase
      .from("noticias")
      .select("id, titulo, tipo, resumo, link_artigo, imagem_url, data")
      .eq("publicado", true)
      .order("data", { ascending: false })
      .returns<Noticia[]>(),
    supabase
      .from("profiles")
      .select("id, nome, papel, foto_url, apresentacao")
      .eq("aprovado", true)
      .returns<Bolsista[]>(),
  ]);

  return { noticias: noticias ?? [], pessoas: pessoas ?? [] };
}

export default async function Home() {
  let noticias: Noticia[] = [];
  let pessoas: Bolsista[] = [];
  let configuracaoPendente = false;

  try {
    const dados = await buscarDadosPublicos();
    noticias = dados.noticias;
    pessoas = dados.pessoas;
  } catch {
    configuracaoPendente = true;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <section className="mb-12">
        <h1 className="text-3xl font-semibold">
          LANC — Laboratório de Neurociências e Comportamento
        </h1>
        <p className="mt-2 max-w-2xl text-black/70 dark:text-white/70">
          Pesquisa em estresse oxidativo, depressão, diabetes e
          neurotoxicidade, sob orientação da Profa. Dra. Débora Delwing Dal
          Magro (FURB).
        </p>
      </section>

      {configuracaoPendente && (
        <p className="mb-10 rounded border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
          Configuração do banco de dados pendente (.env.local) — assim que o
          Supabase estiver conectado, as notícias e os bolsistas aparecem
          aqui.
        </p>
      )}

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">Notícias</h2>
        {noticias.length === 0 && !configuracaoPendente && (
          <p className="text-sm text-black/60 dark:text-white/60">
            Nenhuma notícia publicada ainda.
          </p>
        )}
        <div className="grid gap-6 sm:grid-cols-2">
          {noticias.map((noticia) => (
            <article
              key={noticia.id}
              className="rounded border border-black/10 p-4 dark:border-white/10"
            >
              {noticia.imagem_url && (
                <Image
                  src={noticia.imagem_url}
                  alt={noticia.titulo}
                  width={600}
                  height={340}
                  className="mb-3 h-40 w-full rounded object-cover"
                />
              )}
              <span className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                {noticia.tipo === "publicacao" ? "Publicação" : "Atividade"}
              </span>
              <h3 className="mt-1 font-semibold">{noticia.titulo}</h3>
              <p className="mt-1 text-sm text-black/70 dark:text-white/70">
                {noticia.resumo}
              </p>
              {noticia.link_artigo && (
                <a
                  href={noticia.link_artigo}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm underline"
                >
                  Ver artigo
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Quem somos</h2>
        {pessoas.length === 0 && !configuracaoPendente && (
          <p className="text-sm text-black/60 dark:text-white/60">
            Nenhum membro cadastrado ainda.
          </p>
        )}
        <div className="flex gap-6 overflow-x-auto pb-2">
          {pessoas.map((pessoa) => (
            <div key={pessoa.id} className="w-40 shrink-0 text-center">
              <div className="mx-auto mb-2 h-24 w-24 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                {pessoa.foto_url && (
                  <Image
                    src={pessoa.foto_url}
                    alt={pessoa.nome}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <p className="text-sm font-medium">{pessoa.nome}</p>
              <p className="text-xs text-black/60 dark:text-white/60">
                {pessoa.papel === "orientador" ? "Orientadora" : "Bolsista"}
              </p>
              {pessoa.apresentacao && (
                <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                  {pessoa.apresentacao}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
