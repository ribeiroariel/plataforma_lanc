import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { carregarPessoasPublicas, ORDEM_VINCULO, VINCULOS, type PessoaPublica } from "@/lib/vinculo";
import { Avatar } from "@/components/Avatar";
import { LinksContato } from "@/components/Contato";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quem somos — LANC",
  description: "A equipe do Laboratório de Neurociências e Comportamento (FURB).",
};

type Pessoa = PessoaPublica;

const TITULO_GRUPO: Record<string, string> = {
  doutorado: "Doutorado",
  mestrado: "Mestrado",
  bolsista: "Bolsistas de iniciação científica",
  voluntario: "Pesquisa voluntária",
};

export default async function QuemSomos() {
  let pessoas: Pessoa[] = [];
  let eu: string | null = null;
  try {
    const supabase = await createClient();
    pessoas = await carregarPessoasPublicas(supabase);
    eu = (await getUsuarioAtual())?.id ?? null;
  } catch {
    pessoas = [];
  }

  const orientadora = pessoas.find((p) => p.papel === "orientador");
  // Quem tem foto e apresentação aparece primeiro; o resto em ordem alfabética.
  const bolsistas = pessoas
    .filter((p) => p.papel === "bolsista")
    .sort((a, b) => Number(!!b.foto_url) - Number(!!a.foto_url) || Number(!!b.apresentacao) - Number(!!a.apresentacao));
  const euSemPerfil = pessoas.find((p) => p.id === eu && (!p.foto_url || !p.apresentacao));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl leading-tight text-ink">Quem somos</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
        O LANC reúne estudantes de iniciação científica, mestrado e doutorado da
        FURB que pesquisam estresse oxidativo em modelos experimentais de
        depressão, diabetes e neurotoxicidade.
      </p>

      {euSemPerfil && (
        <p className="mt-6 rounded border border-reagent/40 bg-reagent/[0.07] px-3 py-2 text-sm text-ink">
          Seu perfil ainda está sem {!euSemPerfil.foto_url ? "foto" : ""}
          {!euSemPerfil.foto_url && !euSemPerfil.apresentacao ? " e " : ""}
          {!euSemPerfil.apresentacao ? "apresentação" : ""}.{" "}
          <Link href="/perfil" className="text-absorbance underline">
            Completar meu perfil
          </Link>
        </p>
      )}

      {orientadora && (
        <section className="mt-10 grid items-center gap-6 border-y border-rule py-8 sm:grid-cols-[auto_1fr]">
          <div className="relative h-40 w-40 overflow-hidden rounded-full border border-rule bg-paper-raised">
            {orientadora.foto_url ? (
              <Image
                src={orientadora.foto_url}
                alt={orientadora.nome}
                fill
                sizes="160px"
                className="object-cover"
              />
            ) : (
              <Avatar fotoUrl={null} nome={orientadora.nome} tamanho={160} className="border-0" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-signal">Coordenação</p>
            <h2 className="mt-1 font-display text-2xl text-ink">{orientadora.nome}</h2>
            {orientadora.apresentacao && (
              <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">{orientadora.apresentacao}</p>
            )}
          </div>
        </section>
      )}

      {bolsistas.length === 0 ? (
        <p className="mt-10 text-sm text-ink-soft">
          A equipe aparece aqui assim que os cadastros forem aprovados.
        </p>
      ) : (
        ORDEM_VINCULO.map((v) => {
          // Sem a migração do vínculo, todo mundo cai em "Pesquisa voluntária".
          const doGrupo = bolsistas.filter((b) => (b.vinculo ?? "voluntario") === v);
          if (doGrupo.length === 0) return null;
          return (
            <section key={v} className="mt-10">
              <h2 className="mb-5 text-sm font-medium text-ink">
                {TITULO_GRUPO[v]} <span className="text-ink-soft">({doGrupo.length})</span>
              </h2>
              <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {doGrupo.map((b) => (
                  <li key={b.id} className="flex gap-4">
                    <Avatar fotoUrl={b.foto_url} nome={b.nome} tamanho={72} />
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{b.nome}</p>
                      <p className="text-xs text-signal">
                        {VINCULOS.find((x) => x.valor === (b.vinculo ?? "voluntario"))?.rotulo}
                      </p>
                      {b.apresentacao && (
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{b.apresentacao}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <section className="mt-14 border-t border-rule pt-6">
        <h2 className="mb-3 text-sm font-medium text-ink">Fale com o laboratório</h2>
        <LinksContato />
      </section>
    </main>
  );
}
