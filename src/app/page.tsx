import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { IlustracaoRedox, varianteNoticia } from "@/components/IlustracaoRedox";
import { Avatar } from "@/components/Avatar";
import { LinksContato } from "@/components/Contato";
import { carregarPessoasPublicas, rotuloVinculo, type PessoaPublica } from "@/lib/vinculo";

type Noticia = {
  id: string;
  titulo: string;
  tipo: "publicacao" | "atividade";
  resumo: string;
  link_artigo: string | null;
  imagem_url: string | null;
  data: string;
};

type Pessoa = PessoaPublica;

const LINHAS_DE_PESQUISA = [
  "Estresse oxidativo",
  "Depressão experimental",
  "Diabetes experimental",
  "Neurotoxicidade",
  "Bioprospecção de plantas nativas",
];

async function buscarDadosPublicos() {
  const supabase = await createClient();

  const [{ data: noticias }, pessoas] = await Promise.all([
    supabase
      .from("noticias")
      .select("id, titulo, tipo, resumo, link_artigo, imagem_url, data")
      .eq("publicado", true)
      .order("data", { ascending: false })
      .returns<Noticia[]>(),
    carregarPessoasPublicas(supabase),
  ]);

  let projetosAtivos: number | null = null;
  try {
    const { data } = await supabase.rpc("contagem_projetos_ativos");
    if (typeof data === "number") projetosAtivos = data;
  } catch {
    projetosAtivos = null;
  }

  return { noticias: noticias ?? [], pessoas: pessoas ?? [], projetosAtivos };
}

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function Eyebrow({ tipo }: { tipo: Noticia["tipo"] }) {
  return (
    <span className="text-xs font-medium text-signal">
      {tipo === "publicacao" ? "Publicação" : "Atividade"}
    </span>
  );
}

function ImagemNoticia({
  noticia,
  className,
}: {
  noticia: Noticia;
  className: string;
}) {
  if (noticia.imagem_url) {
    return (
      <Image
        src={noticia.imagem_url}
        alt={noticia.titulo}
        width={900}
        height={506}
        className={`${className} object-cover`}
      />
    );
  }
  return (
    <IlustracaoRedox
      className={className}
      variante={varianteNoticia(noticia.titulo, noticia.resumo)}
    />
  );
}

export default async function Home() {
  let podeEscrever = false;
  try {
    podeEscrever = Boolean((await getUsuarioAtual())?.aprovado);
  } catch {
    podeEscrever = false;
  }
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
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {configuracaoPendente && (
        <p className="mb-8 rounded border border-reagent/40 bg-reagent/10 px-4 py-3 text-sm text-ink">
          Configuração do banco de dados pendente — assim que o Supabase
          estiver conectado, as notícias e os bolsistas aparecem aqui.
        </p>
      )}

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-ink pb-2">
            <p className="text-xs font-medium text-ink">Divulgação científica</p>
            {podeEscrever && (
              <span className="flex gap-4 text-sm">
                <Link href="/noticias/minhas" className="text-ink-soft hover:text-ink">
                  Minhas notícias
                </Link>
                <Link href="/noticias/nova" className="font-medium text-signal hover:text-ink">
                  Escrever notícia
                </Link>
              </span>
            )}
          </div>

          {!destaque && !configuracaoPendente && (
            <div className="rounded border border-dashed border-rule px-6 py-16 text-center">
              <p className="font-display text-lg text-ink-soft">
                Nenhuma notícia publicada ainda.
              </p>
            </div>
          )}

          {destaque && (
            <article className="border-b border-rule pb-8">
              <ImagemNoticia
                noticia={destaque}
                className="h-72 w-full rounded sm:h-96"
              />
              {destaque.imagem_url && destaque.tipo === "publicacao" && (
                <p className="mt-1.5 mb-4 font-mono text-[10px] text-ink-soft/70">
                  Imagem: figura do artigo original.
                </p>
              )}
              {!(destaque.imagem_url && destaque.tipo === "publicacao") && <div className="mb-4" />}
              <Eyebrow tipo={destaque.tipo} />
              <h1 className="mt-2 font-display text-3xl leading-tight text-ink hover:text-signal sm:text-4xl">
                <Link href={`/noticias/${destaque.id}`}>{destaque.titulo}</Link>
              </h1>
              <p className="mt-1 font-mono text-xs text-ink-soft">
                {formatarData(destaque.data)}
              </p>
              <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
                {destaque.resumo}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-medium">
                <Link
                  href={`/noticias/${destaque.id}`}
                  className="text-signal hover:text-ink"
                >
                  Ler a notícia
                </Link>
                {destaque.link_artigo && (
                  <a
                    href={destaque.link_artigo}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink-soft hover:text-ink"
                  >
                    Artigo (DOI)
                  </a>
                )}
              </div>
            </article>
          )}

          {demais.length > 0 && (
            <div className="mt-8 flex flex-col divide-y divide-rule">
              {demais.map((noticia) => (
                <article key={noticia.id} className="flex gap-5 py-6 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <Eyebrow tipo={noticia.tipo} />
                    <h2 className="mt-1 font-display text-xl leading-snug text-ink hover:text-signal">
                      {noticia.link_artigo ? (
                        <a href={noticia.link_artigo} target="_blank" rel="noreferrer">
                          {noticia.titulo}
                        </a>
                      ) : (
                        noticia.titulo
                      )}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-ink-soft">
                      {formatarData(noticia.data)}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                      {noticia.resumo}
                    </p>
                  </div>
                  <ImagemNoticia
                    noticia={noticia}
                    className="h-24 w-32 shrink-0 rounded sm:h-28 sm:w-40"
                  />
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Barra lateral */}
        <aside className="flex flex-col gap-8 lg:border-l lg:border-rule lg:pl-10">
          <Widget titulo="Sobre o laboratório">
            <p className="text-sm leading-relaxed text-ink-soft">
              O LANC investiga o papel do estresse oxidativo em modelos
              experimentais de depressão, diabetes e neurotoxicidade, e a
              bioprospecção de plantas nativas com potencial antioxidante,
              sob orientação da Profa. Dra. Débora Delwing Dal Magro (FURB).
            </p>
          </Widget>

          {!configuracaoPendente && (
            <Widget titulo="Em números">
              <dl className="flex flex-col divide-y divide-rule font-mono text-sm">
                <NumeroItem rotulo="Bolsistas ativos" valor={bolsistas.length} />
                <NumeroItem
                  rotulo="Projetos em andamento"
                  valor={projetosAtivos ?? "—"}
                />
                <NumeroItem
                  rotulo="Notícias publicadas"
                  valor={noticias.length}
                />
              </dl>
            </Widget>
          )}

          <Widget titulo="Fale com o laboratório">
            <LinksContato />
          </Widget>

          <Widget titulo="Linhas de pesquisa">
            <ul className="flex flex-col gap-2 text-sm">
              {LINHAS_DE_PESQUISA.map((linha) => (
                <li key={linha} className="flex gap-2 text-ink">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                  {linha}
                </li>
              ))}
            </ul>
          </Widget>

          {(orientadora || bolsistas.length > 0) && (
            <Widget titulo="Quem somos">
              <div className="flex flex-col gap-4">
                <Link href="/quem-somos" className="-mt-1 text-sm text-signal hover:text-ink">
                  Ver toda a equipe ({pessoas.length})
                </Link>
                {orientadora && <PessoaLinha pessoa={orientadora} />}
                {bolsistas.length > 0 && (
                  // Com muitos bolsistas a coluna ficava enorme e esticava a
                  // página de notícias: a lista rola dentro de uma altura fixa,
                  // com um degradê embaixo indicando que tem mais.
                  <div className="relative">
                    <div
                      tabIndex={0}
                      aria-label={`Bolsistas (${bolsistas.length})`}
                      className="flex max-h-[24rem] flex-col gap-4 overflow-y-auto overscroll-contain pr-2 pb-6 [scrollbar-color:var(--color-rule)_transparent] [scrollbar-width:thin]"
                    >
                      {bolsistas.map((b) => (
                        <PessoaLinha key={b.id} pessoa={b} />
                      ))}
                    </div>
                    {bolsistas.length > 6 && (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-paper to-transparent"
                      />
                    )}
                  </div>
                )}
              </div>
            </Widget>
          )}
        </aside>
      </div>
    </main>
  );
}

function Widget({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 border-t-2 border-ink pt-2 text-xs font-medium text-ink">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function NumeroItem({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: number | string;
}) {
  return (
    <div className="flex items-baseline justify-between py-2">
      <dt className="text-ink-soft">{rotulo}</dt>
      <dd className="text-lg tabular-nums text-ink">{valor}</dd>
    </div>
  );
}

function PessoaLinha({ pessoa }: { pessoa: Pessoa }) {
  return (
    <div className="flex gap-3">
      <Avatar fotoUrl={pessoa.foto_url} nome={pessoa.nome} tamanho={44} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{pessoa.nome}</p>
        <p className="text-xs text-signal font-medium">
          {pessoa.papel === "orientador" ? "Coordenação" : rotuloVinculo(pessoa.vinculo)}
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
