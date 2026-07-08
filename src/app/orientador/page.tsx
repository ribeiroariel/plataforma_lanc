import Link from "next/link";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { testes as catalogoTestes } from "@/lib/testes";

type Bolsista = { id: string; nome: string };
type Projeto = { id: string; nome: string; created_at: string };
type TesteDesignado = {
  id: string;
  projeto_id: string;
  teste_slug: string;
  status: "pendente" | "concluido";
  responsavel_id: string;
};
type Membro = { projeto_id: string; profile_id: string };

function tituloTeste(slug: string) {
  return catalogoTestes.find((t) => t.slug === slug)?.titulo ?? slug;
}

export default async function PainelOrientadora() {
  const usuario = await getUsuarioAtual();
  const supabase = await createClient();

  const [{ data: bolsistas }, { data: projetos }, { data: testes }, { data: membros }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, nome")
        .eq("papel", "bolsista")
        .eq("aprovado", true)
        .order("nome")
        .returns<Bolsista[]>(),
      supabase
        .from("projetos")
        .select("id, nome, created_at")
        .order("created_at", { ascending: false })
        .returns<Projeto[]>(),
      supabase
        .from("projeto_testes")
        .select("id, projeto_id, teste_slug, status, responsavel_id")
        .returns<TesteDesignado[]>(),
      supabase
        .from("projeto_membros")
        .select("projeto_id, profile_id")
        .returns<Membro[]>(),
    ]);

  const nomeBolsista = new Map((bolsistas ?? []).map((b) => [b.id, b.nome]));

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Olá, {usuario?.nome}</h1>
      <p className="mt-1 mb-10 text-black/70 dark:text-white/70">
        Acompanhamento de todos os bolsistas e projetos do laboratório.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Bolsistas</h2>
        {(!bolsistas || bolsistas.length === 0) && (
          <p className="text-sm text-black/60 dark:text-white/60">
            Nenhum bolsista aprovado ainda.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {bolsistas?.map((b) => {
            const projetosDoBolsista = new Set(
              (membros ?? [])
                .filter((m) => m.profile_id === b.id)
                .map((m) => m.projeto_id)
            );
            const testesDoBolsista = (testes ?? []).filter(
              (t) => t.responsavel_id === b.id
            );
            const pendentes = testesDoBolsista.filter(
              (t) => t.status === "pendente"
            ).length;
            const concluidos = testesDoBolsista.length - pendentes;

            return (
              <div
                key={b.id}
                className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <span className="font-medium">{b.nome}</span>
                <span className="text-black/60 dark:text-white/60">
                  {projetosDoBolsista.size} projeto(s) · {concluidos} teste(s)
                  concluído(s) · {pendentes} pendente(s)
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Projetos</h2>
        {(!projetos || projetos.length === 0) && (
          <p className="text-sm text-black/60 dark:text-white/60">
            Nenhum projeto criado ainda.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {projetos?.map((p) => {
            const testesDoProjeto = (testes ?? []).filter(
              (t) => t.projeto_id === p.id
            );
            const membrosDoProjeto = (membros ?? []).filter(
              (m) => m.projeto_id === p.id
            ).length;
            const pendentes = testesDoProjeto.filter(
              (t) => t.status === "pendente"
            );

            return (
              <Link
                key={p.id}
                href={`/projetos/${p.id}`}
                className="block rounded border border-black/10 p-4 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.03]"
              >
                <p className="font-medium">{p.nome}</p>
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                  {membrosDoProjeto} membro(s) · {testesDoProjeto.length} teste(s)
                  designado(s)
                </p>
                {pendentes.length > 0 && (
                  <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-400">
                    Pendentes: {pendentes
                      .map(
                        (t) =>
                          `${tituloTeste(t.teste_slug)} (${
                            nomeBolsista.get(t.responsavel_id) ?? "?"
                          })`
                      )
                      .join(", ")}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
