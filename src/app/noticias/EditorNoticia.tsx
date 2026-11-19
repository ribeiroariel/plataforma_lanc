"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { salvarNoticia, type ResultadoNoticia } from "@/lib/actions/noticias";
import { LIMITES_NOTICIA, type NoticiaEditavel } from "@/lib/noticias";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, INPUT } from "@/lib/estilos";

function hoje() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function Contador({ n, max }: { n: number; max: number }) {
  return (
    <span className={`text-xs ${n > max ? "text-alerta" : "text-ink-soft/70"}`}>
      {n}/{max}
    </span>
  );
}

// Formulário da notícia, com prévia ao lado de como ela aparece no site.
// "Salvar rascunho" guarda sem publicar (só você e a orientadora veem);
// "Publicar" coloca no hall de notícias na hora.
export function EditorNoticia({
  inicial,
  autorNome,
}: {
  inicial?: NoticiaEditavel;
  autorNome: string;
}) {
  const [estado, enviar, enviando] = useActionState<ResultadoNoticia, FormData>(salvarNoticia, undefined);
  const [tipo, setTipo] = useState<"publicacao" | "atividade">(inicial?.tipo ?? "atividade");
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [resumo, setResumo] = useState(inicial?.resumo ?? "");
  const [corpo, setCorpo] = useState(inicial?.corpo ?? "");
  const [link, setLink] = useState(inicial?.link_artigo ?? "");
  const [data, setData] = useState(inicial?.data ?? hoje());
  const [previaImagem, setPreviaImagem] = useState<string | null>(inicial?.imagem_url ?? null);
  const [removerImagem, setRemoverImagem] = useState(false);
  const [mudou, setMudou] = useState(false);

  // Não perder o texto ao fechar a aba sem querer.
  useEffect(() => {
    if (!mudou || enviando) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [mudou, enviando]);

  const erroEm = (campo: string) => (estado?.campo === campo ? estado.erro : null);
  const borda = (campo: string) => (estado?.campo === campo ? "border-alerta" : "");
  const paragrafos = corpo.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <form
      action={enviar}
      onChange={() => setMudou(true)}
      className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
    >
      <div className="flex flex-col gap-5">
        {inicial && <input type="hidden" name="id" value={inicial.id} />}
        <input type="hidden" name="remover_imagem" value={removerImagem ? "1" : "0"} />

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Tipo</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["atividade", "Atividade do laboratório", "Evento, defesa, visita, dia de coleta, congresso..."],
                ["publicacao", "Artigo publicado", "Trabalho do grupo que saiu em periódico (com DOI)."],
              ] as const
            ).map(([v, rotulo, dica]) => (
              <label
                key={v}
                className={`cursor-pointer rounded border p-3 transition-colors ${
                  tipo === v ? "border-ink bg-paper-raised" : "border-rule hover:border-ink-soft"
                }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={v}
                  checked={tipo === v}
                  onChange={() => setTipo(v)}
                  className="sr-only"
                />
                <span className="block text-sm font-medium text-ink">{rotulo}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">{dica}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between text-sm font-medium text-ink">
            Título <Contador n={titulo.length} max={LIMITES_NOTICIA.titulo} />
          </span>
          <input
            name="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={LIMITES_NOTICIA.titulo + 20}
            placeholder="Ex.: LANC apresenta três trabalhos no congresso da FeSBE"
            className={`${INPUT} ${borda("titulo")}`}
          />
          {erroEm("titulo") && <span className="text-xs text-alerta">{erroEm("titulo")}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between text-sm font-medium text-ink">
            Resumo <Contador n={resumo.length} max={LIMITES_NOTICIA.resumo} />
          </span>
          <span className="-mt-1 text-xs text-ink-soft">Uma ou duas frases. É o que aparece na lista de notícias.</span>
          <textarea
            name="resumo"
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            rows={3}
            className={`${INPUT} ${borda("resumo")}`}
          />
          {erroEm("resumo") && <span className="text-xs text-alerta">{erroEm("resumo")}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Texto</span>
          <span className="-mt-1 text-xs text-ink-soft">
            Deixe uma linha em branco entre os parágrafos. Para um destaque, comece o
            parágrafo com <code className="font-mono">**Rótulo:**</code>
          </span>
          <textarea
            name="corpo"
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            rows={10}
            className={`${INPUT} ${borda("corpo")}`}
          />
          {erroEm("corpo") && <span className="text-xs text-alerta">{erroEm("corpo")}</span>}
        </label>

        <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">
              Link do artigo {tipo === "publicacao" ? "(DOI)" : "(opcional)"}
            </span>
            <input
              name="link_artigo"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://doi.org/..."
              className={`${INPUT} ${borda("link_artigo")}`}
            />
            {erroEm("link_artigo") && <span className="text-xs text-alerta">{erroEm("link_artigo")}</span>}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Data</span>
            <input
              name="data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className={`${INPUT} ${borda("data")}`}
            />
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Imagem (opcional)</span>
          <span className="-mt-1 text-xs text-ink-soft">
            JPEG, PNG ou WebP até 5 MB. Sem imagem, o site usa uma ilustração.
            Use só fotos que o laboratório pode divulgar.
          </span>
          <input
            name="imagem"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setPreviaImagem(URL.createObjectURL(f));
                setRemoverImagem(false);
              }
            }}
            className="text-sm text-ink-soft file:mr-3 file:rounded file:border file:border-rule file:bg-paper-raised file:px-3 file:py-1.5 file:text-sm file:text-ink"
          />
          {previaImagem && (
            <button
              type="button"
              onClick={() => {
                setPreviaImagem(null);
                setRemoverImagem(true);
                setMudou(true);
              }}
              className="w-fit text-xs text-alerta hover:underline"
            >
              Tirar a imagem
            </button>
          )}
          {erroEm("imagem") && <span className="text-xs text-alerta">{erroEm("imagem")}</span>}
        </div>

        {estado?.erro && !estado.campo && <p className="text-sm text-alerta">{estado.erro}</p>}

        <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-5">
          <button
            type="submit"
            name="acao"
            value="publicar"
            disabled={enviando}
            onClick={() => setMudou(false)}
            className={BOTAO_PRIMARIO}
          >
            {enviando ? "Salvando..." : inicial?.publicado ? "Salvar e manter publicada" : "Publicar"}
          </button>
          <button
            type="submit"
            name="acao"
            value="rascunho"
            disabled={enviando}
            onClick={() => setMudou(false)}
            className={BOTAO_SECUNDARIO}
          >
            {inicial?.publicado ? "Tirar do ar e salvar como rascunho" : "Salvar rascunho"}
          </button>
          <Link href="/noticias/minhas" className="text-sm text-ink-soft hover:text-ink">
            Cancelar
          </Link>
        </div>
      </div>

      {/* Prévia */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs font-medium text-ink-soft">Prévia</p>
        <article className="rounded border border-rule bg-paper p-5">
          {previaImagem && (
            // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:)
            <img src={previaImagem} alt="" className="mb-4 aspect-video w-full rounded object-cover" />
          )}
          <span className="text-xs font-medium text-signal">
            {tipo === "publicacao" ? "Publicação" : "Atividade"}
          </span>
          <h2 className="mt-1 font-display text-2xl leading-tight text-ink">
            {titulo || <span className="text-ink-soft/50">Título da notícia</span>}
          </h2>
          <p className="mt-1 font-mono text-xs text-ink-soft">
            {data &&
              new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            {" · "}
            por {autorNome}
          </p>
          <p className="mt-3 border-l-2 border-signal pl-3 text-sm leading-relaxed text-ink">
            {resumo || <span className="text-ink-soft/50">O resumo aparece aqui.</span>}
          </p>
          <div className="mt-3 flex flex-col gap-2.5 text-sm leading-relaxed text-ink/90">
            {paragrafos.slice(0, 4).map((p, i) => {
              const m = p.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
              return m ? (
                <p key={i}>
                  <span className="font-semibold text-ink">{m[1]}</span> {m[2]}
                </p>
              ) : (
                <p key={i}>{p}</p>
              );
            })}
            {paragrafos.length > 4 && <p className="text-xs text-ink-soft">...</p>}
          </div>
        </article>
      </aside>
    </form>
  );
}
