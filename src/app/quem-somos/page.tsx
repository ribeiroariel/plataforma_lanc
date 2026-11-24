import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { carregarPessoasPublicas, ORDEM_VINCULO, type PessoaPublica } from "@/lib/vinculo";
import { Retrato } from "@/components/Retrato";
import { Revelar } from "@/components/ui/Revelar";
import { EMAIL_LANC, INSTAGRAM_LANC } from "@/components/Contato";
import EquipeGrade from "./EquipeGrade";

export const metadata: Metadata = {
  title: "Quem somos — LANC",
  description:
    "A equipe do Laboratório de Neurociências e Comportamento da FURB: coordenação, pós-graduação e iniciação científica.",
};

const LINHAS = [
  { titulo: "Estresse oxidativo", texto: "Marcadores de dano e defesas antioxidantes em tecidos do sistema nervoso e periféricos." },
  { titulo: "Depressão experimental", texto: "Modelos animais de comportamento tipo depressivo e seus mecanismos bioquímicos." },
  { titulo: "Diabetes experimental", texto: "Repercussões do diabetes induzido sobre o cérebro, o fígado e os rins." },
  { titulo: "Neurotoxicidade", texto: "Efeitos de substâncias sobre o tecido nervoso e o equilíbrio redox." },
  { titulo: "Bioprospecção", texto: "Plantas nativas com potencial antioxidante e neuroprotetor." },
];

export default async function QuemSomos() {
  let pessoas: PessoaPublica[] = [];
  let eu: string | null = null;
  try {
    const supabase = await createClient();
    pessoas = await carregarPessoasPublicas(supabase);
    eu = (await getUsuarioAtual())?.id ?? null;
  } catch {
    pessoas = [];
  }

  const orientadora = pessoas.find((p) => p.papel === "orientador");
  // Pós-graduação primeiro; dentro de cada vínculo, quem tem foto e
  // apresentação vem antes (a grade fica mais bonita), depois por nome.
  const equipe = pessoas
    .filter((p) => p.papel === "bolsista")
    .sort((a, b) => {
      const va = ORDEM_VINCULO.indexOf(a.vinculo ?? "voluntario");
      const vb = ORDEM_VINCULO.indexOf(b.vinculo ?? "voluntario");
      if (va !== vb) return va - vb;
      const pa = Number(!!a.foto_url) * 2 + Number(!!a.apresentacao);
      const pb = Number(!!b.foto_url) * 2 + Number(!!b.apresentacao);
      return pb - pa || a.nome.localeCompare(b.nome, "pt-BR");
    });
  const posGraduacao = equipe.filter((p) => p.vinculo === "mestrado" || p.vinculo === "doutorado").length;
  // Mosaico da abertura: quem tem foto primeiro, completando com as
  // iniciais coloridas enquanto a equipe ainda não subiu as fotos.
  const mosaico = [...pessoas.filter((p) => p.foto_url), ...pessoas.filter((p) => !p.foto_url)].slice(0, 5);
  const euSemPerfil = pessoas.find((p) => p.id === eu && (!p.foto_url || !p.apresentacao));

  return (
    <main className="overflow-hidden">
      {/* ── Abertura ─────────────────────────────────────────────── */}
      <section className="relative border-b border-rule bg-paper-raised">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div className="anim-entrada">
            <p className="text-sm font-medium text-signal">Equipe LANC</p>
            <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-tight text-ink sm:text-6xl">
              As pessoas por trás da pesquisa
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Estudantes de iniciação científica, mestrado e doutorado da FURB que
              investigam o estresse oxidativo em modelos experimentais de
              depressão, diabetes e neurotoxicidade.
            </p>
            <dl className="mt-10 grid max-w-md grid-cols-3 divide-x divide-rule border-y border-rule">
              {[
                { n: pessoas.length, r: "integrantes" },
                { n: posGraduacao, r: "na pós-graduação" },
                { n: LINHAS.length, r: "linhas de pesquisa" },
              ].map((k) => (
                <div key={k.r} className="px-4 py-4 first:pl-0">
                  <dt className="sr-only">{k.r}</dt>
                  <dd className="font-display text-4xl leading-none tabular-nums text-ink">{k.n}</dd>
                  <p className="mt-2 text-xs leading-snug text-ink-soft">{k.r}</p>
                </div>
              ))}
            </dl>
          </div>

          {/* Mosaico de retratos (fotos primeiro, depois iniciais). */}
          {mosaico.length >= 3 && (
            <div aria-hidden className="relative hidden h-[26rem] lg:block">
              {mosaico.map((p, i) => {
                const pos = [
                  "left-[8%] top-0 w-44 rotate-[-3deg]",
                  "right-[6%] top-6 w-40 rotate-[4deg]",
                  "left-[30%] top-[34%] w-48 rotate-[1deg] z-10",
                  "left-0 bottom-0 w-36 rotate-[2deg]",
                  "right-0 bottom-4 w-40 rotate-[-4deg]",
                ][i];
                return (
                  <div
                    key={p.id}
                    className={`anim-entrada absolute overflow-hidden rounded-lg border-4 border-paper shadow-[0_18px_40px_-20px_rgba(0,0,0,0.45)] ${pos}`}
                    style={{ animationDelay: `${120 + i * 90}ms` }}
                  >
                    <Retrato nome={p.nome} fotoUrl={p.foto_url} sizes="200px" prioridade={i < 2} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {euSemPerfil && (
        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
          <p className="rounded-lg border border-reagent/40 bg-reagent/[0.07] px-4 py-3 text-sm text-ink">
            Seu cartão aqui ainda está sem {!euSemPerfil.foto_url ? "foto" : ""}
            {!euSemPerfil.foto_url && !euSemPerfil.apresentacao ? " e " : ""}
            {!euSemPerfil.apresentacao ? "apresentação" : ""}.{" "}
            <Link href="/perfil" className="font-medium text-absorbance underline underline-offset-4">
              Completar meu perfil
            </Link>
          </p>
        </div>
      )}

      {/* ── Coordenação ──────────────────────────────────────────── */}
      {orientadora && (
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <Revelar className="grid items-center gap-12 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] md:gap-16">
            <div className="relative mx-auto w-full max-w-sm">
              <div aria-hidden className="absolute inset-0 translate-x-4 translate-y-4 rounded-xl border border-signal/50" />
              <Retrato
                nome={orientadora.nome}
                fotoUrl={orientadora.foto_url}
                sizes="(min-width: 768px) 380px, 90vw"
                className="relative rounded-xl"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-signal">Coordenação</p>
              <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
                Profa. Dra. {orientadora.nome}
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
                {orientadora.apresentacao ??
                  "Coordena o Laboratório de Neurociências e Comportamento na Universidade Regional de Blumenau (FURB) e orienta os trabalhos de iniciação científica, mestrado e doutorado do grupo."}
              </p>
            </div>
          </Revelar>
        </section>
      )}

      {/* ── Equipe ───────────────────────────────────────────────── */}
      <section className="border-t border-rule">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
          <Revelar className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-signal">Equipe</p>
              <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-ink">
                Quem faz o laboratório
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
              Da bancada ao biotério: cada pessoa aqui participa dos ensaios, das
              coletas e das análises que viram artigo.
            </p>
          </Revelar>
          {equipe.length === 0 ? (
            <p className="text-ink-soft">A equipe aparece aqui assim que os cadastros forem aprovados.</p>
          ) : (
            <EquipeGrade pessoas={equipe} />
          )}
        </div>
      </section>

      {/* ── Linhas de pesquisa ───────────────────────────────────── */}
      <section className="border-t border-rule bg-paper-raised">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Revelar>
            <p className="text-sm font-medium text-signal">Pesquisa</p>
            <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-ink">
              Linhas de pesquisa
            </h2>
          </Revelar>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-5">
            {LINHAS.map((l, i) => (
              <Revelar key={l.titulo} como="li" atraso={i * 70} className="bg-paper p-6">
                <span className="font-display text-3xl text-signal/70 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 font-medium leading-snug text-ink">{l.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{l.texto}</p>
              </Revelar>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Chamada final ────────────────────────────────────────── */}
      <section className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-10 px-4 py-20 sm:px-6 md:flex-row md:items-end md:justify-between">
          <Revelar>
            <div className="flex items-center gap-3">
              <Image src="/logo-lanc.jpg" alt="" width={44} height={44} className="h-11 w-11 rounded-full border border-paper/30 object-cover" />
              <span className="text-sm text-paper/70">LANC · FURB</span>
            </div>
            <h2 className="mt-6 max-w-xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">
              Quer pesquisar com a gente?
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-paper/70">
              Estudantes da FURB interessados em iniciação científica podem escrever
              para o laboratório.
            </p>
          </Revelar>
          <Revelar atraso={120} className="flex flex-wrap gap-3">
            <a
              href={`mailto:${EMAIL_LANC}`}
              className="rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink transition hover:bg-paper/90"
            >
              {EMAIL_LANC}
            </a>
            <a
              href={INSTAGRAM_LANC.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-paper/30 px-6 py-3 text-sm text-paper transition hover:border-paper"
            >
              Instagram {INSTAGRAM_LANC.usuario}
            </a>
          </Revelar>
        </div>
      </section>
    </main>
  );
}
