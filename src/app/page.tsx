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

type Pessoa = {
  id: string;
  nome: string;
  papel: Papel;
  foto_url: string | null;
  apresentacao: string | null;
};

const LINHAS_DE_PESQUISA = [
  "Estresse oxidativo",
  "Depressão experimental",
  "Diabetes experimental",
  "Neurotoxicidade",
];

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
      .returns<Pessoa[]>(),
  ]);

  // Contagem à parte e tolerante a falha: se a função contagem_projetos_ativos
  // ainda não tiver sido criada no banco, a portada continua carregando —
  // só não mostra esse número, em vez de quebrar a página inteira.
  let projetosAtivos: number | null = null;
  try {
    const { data } = await supabase.rpc("contagem_projetos_ativos");
    if (typeof data === "number") projetosAtivos = data;
  } catch {
    projetosAtivos = null;
  }

  return {
    noticias: noticias ?? [],
    pessoas: pessoas ?? [],
    projetosAtivos,
  };
}

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function Home() {
  let noticias: Noticia[] = [];
  let pessoas: Pessoa[] = [];
  let projetosAtivos: number | null = null;
  let configuracaoPendente = false;

  try {
    const dados = await buscarDadosPublicos();
    noticias = dados.noticias;
    pessoas = dados.pessoas;
    projetosAtivos = dados.projetosAtivos;
  } catch {
    configuracaoPendente = true;
  }

  const [destaque, ...demais] = noticias;
  const bolsistas = pessoas.filter((p) => p.papel === "bolsista");
  const orientadora = pessoas.find((p) => p.papel === "orientador");

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {configuracaoPendente && (
        <p className="mb-10 rounded border border-reagent/40 bg-reagent/10 px-4 py-3 text-sm text-ink">
          Configuração do banco de dados pendente — assim que o Supabase
          estiver conectado, as notícias e os bolsistas aparecem aqui.
        </p>
      )}

      <div className="grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
            Divulgação científica
          </p>

          {!destaque && !configuracaoPendente && (
            <div className="rounded border border-dashed border-rule px-6 py-16 text-center">
              <p className="font-display text-lg text-ink-soft">
                Nenhuma notícia publicada ainda.
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Assim que a primeira publicação ou atividade do grupo entrar,
                ela aparece aqui.
              </p>
            </div>
          )}

          {destaque && (
            <article className="border-b border-rule pb-8">
              {destaque.imagem_url && (
                <Image
                  src={destaque.imagem_url}
                  alt={destaque.titulo}
                  width={900}
                  height={480}
                  className="mb-5 h-64 w-full rounded object-cover sm:h-80"
                />
              )}
              <span
                className={`font-mono text-xs uppercase tracking-wider ${
                  destaque.tipo === "publicacao"
                    ? "text-absorbance"
                    : "text-reagent"
                }`}
              >
                {destaque.tipo === "publicacao" ? "Publicação" : "Atividade"}
              </span>
              <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">
                {destaque.titulo}
              </h1>
              <p className="mt-2 font-mono text-xs text-ink-soft">
                {formatarData(destaque.data)}
              </p>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
                {destaque.resumo}
              </p>
              {destaque.link_artigo && (
                <a
                  href={destaque.link_artigo}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block border-b border-absorbance text-sm text-absorbance hover:border-ink hover:text-ink"
                >
                  Ver artigo →
                </a>
              )}
            </article>
          )}

          {demais.length > 0 && (
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              {demais.map((noticia) => (
                <article key={noticia.id}>
                  {noticia.imagem_url && (
                    <Image
                      src={noticia.imagem_url}
                      alt={noticia.titulo}
                      width={500}
                      height={280}
                      className="mb-3 h-36 w-full rounded object-cover"
                    />
                  )}
                  <span
                    className={`font-mono text-[11px] uppercase tracking-wider ${
                      noticia.tipo === "publicacao"
                        ? "text-absorbance"
                        : "text-reagent"
                    }`}
                  >
                    {noticia.tipo === "publicacao" ? "Publicação" : "Atividade"}
                  </span>
                  <h2 className="mt-1 font-display text-xl leading-snug text-ink">
                    {noticia.titulo}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {noticia.resumo}
                  </p>
                  {noticia.link_artigo && (
                    <a
                      href={noticia.link_artigo}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm text-absorbance hover:text-ink"
                    >
                      Ver artigo →
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-10">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
              Sobre o LANC
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Investigamos o papel do estresse oxidativo em modelos
              experimentais de depressão, diabetes e neurotoxicidade, sob
              orientação da Profa. Dra. Débora Delwing Dal Magro (FURB).
            </p>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
              Linhas de pesquisa
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {LINHAS_DE_PESQUISA.map((linha) => (
                <span
                  key={linha}
                  className="rounded-full border border-rule px-3 py-1 text-xs text-ink-soft"
                >
                  {linha}
                </span>
              ))}
            </div>
          </div>

          {!configuracaoPendente && (
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
                Em números
              </p>
              <dl className="mt-3 flex flex-col gap-2 font-mono text-sm">
                <div className="flex items-baseline justify-between border-b border-rule pb-2">
                  <dt className="text-ink-soft">Bolsistas ativos</dt>
                  <dd className="tabular-nums text-ink">{bolsistas.length}</dd>
                </div>
                <div className="flex items-baseline justify-between border-b border-rule pb-2">
                  <dt className="text-ink-soft">Projetos em andamento</dt>
                  <dd className="tabular-nums text-ink">
                    {projetosAtivos ?? "—"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between pb-2">
                  <dt className="text-ink-soft">Notícias publicadas</dt>
                  <dd className="tabular-nums text-ink">{noticias.length}</dd>
                </div>
              </dl>
            </div>
          )}

          {(orientadora || bolsistas.length > 0) && (
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
                Quem somos
              </p>
              <div className="mt-3 flex flex-col gap-4">
                {orientadora && <PessoaCard pessoa={orientadora} />}
                {bolsistas.map((b) => (
                  <PessoaCard key={b.id} pessoa={b} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function PessoaCard({ pessoa }: { pessoa: Pessoa }) {
  return (
    <div className="flex gap-3">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-rule">
        {pessoa.foto_url && (
          <Image
            src={pessoa.foto_url}
            alt={pessoa.nome}
            width={44}
            height={44}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{pessoa.nome}</p>
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
          {pessoa.papel === "orientador" ? "Orientadora" : "Bolsista"}
        </p>
        {pessoa.apresentacao && (
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
            {pessoa.apresentacao}
          </p>
        )}
      </div>
    </div>
  );
}
