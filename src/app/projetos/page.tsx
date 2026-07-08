import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { BOTAO_PRIMARIO } from "@/lib/estilos";

type ProjetoResumo = {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
};

export default async function ListaProjetos() {
  const supabase = await createClient();
  const usuario = await getUsuarioAtual();
  const souOrientador = usuario?.papel === "orientador";

  const { data: projetos } = await supabase
    .from("projetos")
    .select("id, nome, descricao, created_at")
    .order("created_at", { ascending: false })
    .returns<ProjetoResumo[]>();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
            {souOrientador ? "Acompanhamento" : "Pesquisa"}
          </p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
            {souOrientador ? "Todos os projetos" : "Meus projetos"}
          </h1>
        </div>
        {!souOrientador && (
          <Link href="/projetos/novo" className={`shrink-0 text-sm ${BOTAO_PRIMARIO}`}>
            + Novo projeto
          </Link>
        )}
      </div>

      {(!projetos || projetos.length === 0) && (
        <p className="mt-8 text-sm text-ink-soft">
          {souOrientador
            ? "Nenhum projeto criado ainda."
            : "Você ainda não participa de nenhum projeto."}
        </p>
      )}

      <ul className="mt-8 flex flex-col gap-3">
        {projetos?.map((projeto) => (
          <li key={projeto.id}>
            <Link
              href={`/projetos/${projeto.id}`}
              className="block rounded border border-rule bg-paper-raised p-5 transition-colors hover:border-absorbance"
            >
              <p className="font-display text-lg text-ink">{projeto.nome}</p>
              {projeto.descricao && (
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {projeto.descricao}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
